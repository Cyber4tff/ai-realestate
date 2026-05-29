from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.all_models import Account, Trade, RiskRules, AuditLog

class RiskEngine:
    @staticmethod
    def validate_trade(
        db: Session, 
        account_id: int, 
        symbol: str, 
        qty: float, 
        side: str
    ) -> dict:
        """
        Validates a trade before execution.
        Returns:
            {
                "approved": bool,
                "reason": str
            }
        """
        # 1. Fetch Account and Risk Rules
        account = db.query(Account).filter(Account.id == account_id).first()
        if not account:
            return {"approved": False, "reason": "Account not found"}
            
        rules = db.query(RiskRules).filter(RiskRules.account_id == account_id).first()
        if not rules:
            # If no rules exist, default to approved
            return {"approved": True, "reason": "No risk rules configured"}
            
        # 2. Check if account is locked
        if rules.is_locked:
            return {"approved": False, "reason": "Account is locked by risk management"}
            
        # 3. Check session filters (UTC)
        now_utc = datetime.now(timezone.utc)
        current_hour = now_utc.hour
        if not (rules.session_start_hour <= current_hour < rules.session_end_hour):
            return {
                "approved": False, 
                "reason": f"Trading session closed. Allowed: {rules.session_start_hour}:00 - {rules.session_end_hour}:00 UTC. Current UTC hour: {current_hour}"
            }
            
        # 4. Check cooldown period
        if rules.last_trade_time and rules.cooldown_period_minutes > 0:
            # last_trade_time is datetime, we ensure comparison is timezone-aware
            last_trade = rules.last_trade_time.replace(tzinfo=timezone.utc) if rules.last_trade_time.tzinfo is None else rules.last_trade_time
            time_since_last_trade = now_utc - last_trade
            cooldown_delta = timedelta(minutes=rules.cooldown_period_minutes)
            if time_since_last_trade < cooldown_delta:
                wait_seconds = int((cooldown_delta - time_since_last_trade).total_seconds())
                return {
                    "approved": False, 
                    "reason": f"Cooldown active. Must wait {wait_seconds} more seconds."
                }
                
        # 5. Check maximum concurrent trades
        open_trades = db.query(Trade).filter(
            Trade.account_id == account_id,
            Trade.status == "OPEN"
        ).all()
        
        if len(open_trades) >= rules.max_concurrent_trades:
            return {
                "approved": False,
                "reason": f"Maximum concurrent trades ({rules.max_concurrent_trades}) reached"
            }
            
        # 6. Check contract sizes (qty)
        # Sum current open quantities + new quantity
        current_qty = sum(t.qty for t in open_trades)
        if (current_qty + qty) > rules.max_contracts:
            return {
                "approved": False,
                "reason": f"Trade exceeds maximum contracts limit. Max: {rules.max_contracts}, Requested: {qty}, Open: {current_qty}"
            }
            
        # 7. Check Daily Drawdown Limit
        # Get start of day (UTC)
        today_start = datetime.combine(now_utc.date(), datetime.min.time(), tzinfo=timezone.utc)
        
        # Calculate daily starting balance (or default to starting_balance if no history)
        # We can find trades closed today to compute the PnL of today
        closed_today_trades = db.query(Trade).filter(
            Trade.account_id == account_id,
            Trade.status == "CLOSED",
            Trade.exit_time >= today_start
        ).all()
        
        daily_pnl = sum(t.pnl for t in closed_today_trades)
        # For active open trades, include floating PnL if known (mocked here, we can sum current open trades' pnl)
        open_pnl = sum(t.pnl for t in open_trades)
        total_pnl = daily_pnl + open_pnl
        
        if rules.daily_drawdown_limit > 0:
            # Drawdown check: total_pnl is negative and exceeds limit
            if total_pnl < -rules.daily_drawdown_limit:
                # Lock the account as safety measure
                rules.is_locked = True
                db.commit()
                RiskEngine._log_breach(db, account_id, "DAILY_DRAWDOWN_LIMIT", f"Daily PnL of {total_pnl} breached limit of -{rules.daily_drawdown_limit}")
                return {"approved": False, "reason": "Daily drawdown limit reached. Account locked."}
                
        # 8. Check Trailing Drawdown Limit
        # Trailing drawdown trails the peak balance achieved by the account
        # We query the maximum balance achieved historically
        # Calculate balance points historically to find peak
        all_closed_trades = db.query(Trade).filter(
            Trade.account_id == account_id,
            Trade.status == "CLOSED"
        ).order_by(Trade.exit_time.asc()).all()
        
        running_balance = account.starting_balance
        peak_balance = account.starting_balance
        
        for trade in all_closed_trades:
            running_balance += trade.pnl
            if running_balance > peak_balance:
                peak_balance = running_balance
                
        # If current open trades are positive, they can push the peak higher, but let's check current balance vs peak
        current_balance = account.balance
        if rules.trailing_drawdown_limit > 0:
            if current_balance < (peak_balance - rules.trailing_drawdown_limit):
                rules.is_locked = True
                db.commit()
                RiskEngine._log_breach(db, account_id, "TRAILING_DRAWDOWN_LIMIT", f"Current balance {current_balance} below trailing limit {peak_balance - rules.trailing_drawdown_limit}")
                return {"approved": False, "reason": "Trailing drawdown limit breached. Account locked."}
                
        return {"approved": True, "reason": "Approved"}
        
    @staticmethod
    def _log_breach(db: Session, account_id: int, limit_name: str, detail: str):
        account = db.query(Account).filter(Account.id == account_id).first()
        log = AuditLog(
            user_id=account.user_id if account else None,
            action="RISK_LIMIT_BREACH",
            details=f"Limit: {limit_name} breached on Account ID {account_id}. Details: {detail}"
        )
        db.add(log)
        db.commit()
