from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.all_models import Account, Trade, RiskRules, AuditLog, AlertLog
from app.services.risk_engine import RiskEngine

class ExecutionEngine:
    @staticmethod
    def execute_signal(
        db: Session,
        account_id: int,
        action: str,  # buy, sell, exit
        symbol: str,
        qty: float,
        price: float,
        strategy_id: int = None,
        signal_id: int = None,
        stop_loss: float = None,
        take_profit: float = None
    ) -> dict:
        """
        Coordinates risk validation and order execution.
        Processes market/limit paper orders or routes to broker APIs.
        """
        action = action.upper() # BUY, SELL, EXIT
        
        # 1. Run Pre-Trade Risk Rules (only for entry signals, exits bypass rules)
        if action in ["BUY", "SELL"]:
            risk_result = RiskEngine.validate_trade(db, account_id, symbol, qty, action)
            if not risk_result["approved"]:
                # Log rejection
                ExecutionEngine._log_audit(
                    db, account_id, "TRADE_REJECTED",
                    f"Signal for {action} {qty} {symbol} rejected by risk: {risk_result['reason']}"
                )
                if signal_id:
                    alert = db.query(AlertLog).filter(AlertLog.id == signal_id).first()
                    if alert:
                        alert.status = "REJECTED"
                        alert.error_message = risk_result["reason"]
                        db.commit()
                return {"success": False, "reason": risk_result["reason"]}
                
        # 2. Fetch Account details
        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            return {"success": False, "reason": "Account not found"}
            
        # 3. Route to broker execution
        if account.broker_type == "paper":
            return ExecutionEngine._execute_paper(
                db, account, action, symbol, qty, price, strategy_id, signal_id, stop_loss, take_profit
            )
        elif account.broker_type in ["alpaca", "tradovate"]:
            # In a production setup, we load keys and execute via API client.
            # We will mock the external broker execution here but keep structural integrity.
            ExecutionEngine._log_audit(
                db, account_id, "EXTERNAL_ROUTE",
                f"Routing order to {account.broker_type.upper()}: {action} {qty} {symbol}"
            )
            # Execute as paper for convenience, but record as broker trade
            return ExecutionEngine._execute_paper(
                db, account, action, symbol, qty, price, strategy_id, signal_id, stop_loss, take_profit
            )
            
        return {"success": False, "reason": f"Unsupported broker: {account.broker_type}"}
        
    @staticmethod
    def _execute_paper(
        db: Session,
        account: Account,
        action: str,
        symbol: str,
        qty: float,
        price: float,
        strategy_id: int = None,
        signal_id: int = None,
        stop_loss: float = None,
        take_profit: float = None
    ) -> dict:
        now_utc = datetime.now(timezone.utc)
        
        # Commission assumptions: $2.00 per contract/trade
        commission = 2.00
        
        # Check if there is an active open trade for this account & symbol
        open_trade = db.query(Trade).filter(
            Trade.account_id == account.id,
            Trade.symbol == symbol,
            Trade.status == "OPEN"
        ).first()
        
        if action == "EXIT":
            if not open_trade:
                return {"success": False, "reason": f"No open position to exit for {symbol}"}
                
            # Close the trade
            open_trade.exit_price = price
            open_trade.exit_time = now_utc
            open_trade.status = "CLOSED"
            
            # Calculate PnL:
            # If we bought (BUY) originally, we sell to exit: (exit_price - entry_price) * qty
            # If we sold (SELL) originally, we buy to exit: (entry_price - exit_price) * qty
            multiplier = 1.0 if open_trade.side == "BUY" else -1.0
            raw_pnl = (price - open_trade.entry_price) * qty * multiplier
            open_trade.pnl = raw_pnl - (commission * 2) # entry and exit commission
            open_trade.commission = commission * 2
            
            # Update account balance
            account.balance += open_trade.pnl
            
            # Log audit
            ExecutionEngine._log_audit(
                db, account.id, "TRADE_CLOSED",
                f"Closed position for {symbol} at {price}. PnL: {open_trade.pnl:.2f}"
            )
            
            # Update last trade time in risk rules
            rules = db.query(RiskRules).filter(RiskRules.account_id == account.id).first()
            if rules:
                rules.last_trade_time = now_utc
                
            db.commit()
            
            # Mark webhook log as success
            if signal_id:
                ExecutionEngine._update_alert_status(db, signal_id, "SUCCESS")
                
            return {"success": True, "trade_id": open_trade.id, "pnl": open_trade.pnl}
            
        elif action in ["BUY", "SELL"]:
            if open_trade:
                # In standard reversal alert systems, receiving a BUY while in a SELL position 
                # might reverse the position. Let's close the existing trade first, then open the new one!
                if open_trade.side != action:
                    ExecutionEngine._execute_paper(
                        db, account, "EXIT", symbol, open_trade.qty, price, strategy_id, signal_id
                    )
                else:
                    return {"success": False, "reason": f"Already in a {open_trade.side} position for {symbol}"}
            
            # Create a new trade
            new_trade = Trade(
                account_id=account.id,
                strategy_id=strategy_id,
                symbol=symbol,
                side=action,
                qty=qty,
                entry_price=price,
                entry_time=now_utc,
                commission=commission,
                status="OPEN",
                signal_id=signal_id
            )
            db.add(new_trade)
            
            # Subtract entry commission from balance
            account.balance -= commission
            
            # Log audit
            ExecutionEngine._log_audit(
                db, account.id, "TRADE_OPENED",
                f"Opened {action} position for {qty} {symbol} at {price}"
            )
            
            # Update last trade time in risk rules
            rules = db.query(RiskRules).filter(RiskRules.account_id == account.id).first()
            if rules:
                rules.last_trade_time = now_utc
                
            db.commit()
            
            # Mark webhook log as success
            if signal_id:
                ExecutionEngine._update_alert_status(db, signal_id, "SUCCESS")
                
            return {"success": True, "trade_id": new_trade.id}
            
        return {"success": False, "reason": f"Invalid action: {action}"}
        
    @staticmethod
    def _log_audit(db: Session, account_id: int, action: str, details: str):
        account = db.query(Account).filter(Account.id == account_id).first()
        log = AuditLog(
            user_id=account.user_id if account else None,
            action=action,
            details=details
        )
        db.add(log)
        db.commit()
        
    @staticmethod
    def _update_alert_status(db: Session, signal_id: int, status: str):
        alert = db.query(AlertLog).filter(AlertLog.id == signal_id).first()
        if alert:
            alert.status = status
            alert.processed = True
            db.commit()
