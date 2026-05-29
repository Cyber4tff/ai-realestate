from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.all_models import User, Account, Trade, RiskRules
from app.services.monte_carlo import run_monte_carlo_simulation
from datetime import datetime, timezone, timedelta
import numpy as np

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Redirects to the real estate acquisitions operating system summary."""
    from app.api.v1.real_estate import get_real_estate_summary
    return get_real_estate_summary(db, current_user)

        
    # Get active or first account
    account = accounts[0]
    
    # 2. Get Open Trades
    open_trades = db.query(Trade).filter(
        Trade.account_id == account.id,
        Trade.status == "OPEN"
    ).all()
    
    # 3. Get Closed Trades (limit to last 50 for quick display)
    closed_trades = db.query(Trade).filter(
        Trade.account_id == account.id,
        Trade.status == "CLOSED"
    ).order_by(Trade.exit_time.desc()).limit(50).all()
    
    # 4. Compute Drawdowns and Metrics
    now_utc = datetime.now(timezone.utc)
    today_start = datetime.combine(now_utc.date(), datetime.min.time(), tzinfo=timezone.utc)
    
    closed_today = db.query(Trade).filter(
        Trade.account_id == account.id,
        Trade.status == "CLOSED",
        Trade.exit_time >= today_start
    ).all()
    
    daily_pnl = sum(t.pnl for t in closed_today)
    open_pnl = sum(t.pnl for t in open_trades)
    current_daily_loss = daily_pnl + open_pnl
    
    rules = db.query(RiskRules).filter(RiskRules.account_id == account.id).first()
    
    daily_drawdown_limit = rules.daily_drawdown_limit if rules else 5000.0
    trailing_drawdown_limit = rules.trailing_drawdown_limit if rules else 10000.0
    
    # Calculate peak balance
    all_closed_trades = db.query(Trade).filter(
        Trade.account_id == account.id,
        Trade.status == "CLOSED"
    ).order_by(Trade.exit_time.asc()).all()
    
    running_balance = account.starting_balance
    peak_balance = account.starting_balance
    for trade in all_closed_trades:
        running_balance += trade.pnl
        if running_balance > peak_balance:
            peak_balance = running_balance
            
    remaining_daily_drawdown = max(0.0, daily_drawdown_limit + current_daily_loss)
    remaining_trailing_drawdown = max(0.0, (account.balance - (peak_balance - trailing_drawdown_limit)))
    
    # 5. Prop Firm Evaluation Progress
    prop_target = account.prop_firm_target
    current_profit = account.balance - account.starting_balance
    
    progress_pct = 0.0
    if prop_target > 0:
        progress_pct = min(100.0, max(0.0, (current_profit / prop_target) * 100))
        
    # 6. Dynamic Payout Probability (derived from actual closed trades metrics!)
    # We fetch all closed trades to compute win rate, avg win, and avg loss
    win_rate = 0.50
    risk_reward = 1.5
    avg_loss = 1000.0
    steps = 100
    
    if len(all_closed_trades) >= 5:
        wins = [t.pnl for t in all_closed_trades if t.pnl > 0]
        losses = [abs(t.pnl) for t in all_closed_trades if t.pnl < 0]
        
        total_closed = len(all_closed_trades)
        win_count = len(wins)
        
        win_rate = win_count / total_closed
        avg_win = np.mean(wins) if wins else 1000.0
        avg_loss = np.mean(losses) if losses else 1000.0
        risk_reward = avg_win / avg_loss if avg_loss > 0 else 1.5
        # Remaining steps estimate to pass challenge
        remaining_profit_needed = max(0.0, prop_target - current_profit)
        steps = max(10, int(remaining_profit_needed / (avg_win if avg_win > 0 else 1000.0)) * 2)
        if steps > 200:
            steps = 200 # clamp for reasonable sim
            
    # Run a fast 1,000 runs simulation using actual stats
    sim_stats = run_monte_carlo_simulation(
        starting_balance=account.balance,
        win_rate=win_rate,
        risk_reward_ratio=risk_reward,
        avg_loss_cash=avg_loss,
        steps=steps,
        target_profit=max(1000.0, prop_target - current_profit),
        max_drawdown=remaining_trailing_drawdown if remaining_trailing_drawdown > 0 else 5000.0,
        is_trailing_drawdown=True,
        num_simulations=1000
    )
    
    # 7. Generate a 30-point historic equity series for dashboard graphing
    equity_series = []
    balance_running = account.starting_balance
    equity_series.append({
        "time": account.created_at.strftime("%Y-%m-%d"), 
        "balance": balance_running
    })
    
    for t in all_closed_trades:
        balance_running += t.pnl
        equity_series.append({
            "time": t.exit_time.strftime("%Y-%m-%d %H:%M"),
            "balance": balance_running
        })
        
    return {
        "account": {
            "id": account.id,
            "name": account.name,
            "broker_type": account.broker_type,
            "balance": account.balance,
            "starting_balance": account.starting_balance,
            "status": account.status,
            "prop_firm_target": prop_target,
            "prop_firm_max_drawdown": account.prop_firm_max_drawdown,
            "prop_firm_daily_drawdown": account.prop_firm_daily_drawdown,
        },
        "metrics": {
            "current_daily_loss": current_daily_loss,
            "remaining_daily_drawdown": remaining_daily_drawdown,
            "remaining_trailing_drawdown": remaining_trailing_drawdown,
            "peak_balance": peak_balance,
            "evaluation_progress_pct": progress_pct,
            "payout_probability": sim_stats["probability_payout"],
            "pass_probability": sim_stats["probability_pass"],
            "ruin_probability": sim_stats["probability_ruin"]
        },
        "open_trades": [
            {
                "id": t.id,
                "symbol": t.symbol,
                "side": t.side,
                "qty": t.qty,
                "entry_price": t.entry_price,
                "entry_time": t.entry_time.isoformat(),
                "pnl": t.pnl
            } for t in open_trades
        ],
        "recent_trades": [
            {
                "id": t.id,
                "symbol": t.symbol,
                "side": t.side,
                "qty": t.qty,
                "entry_price": t.entry_price,
                "exit_price": t.exit_price,
                "entry_time": t.entry_time.isoformat(),
                "exit_time": t.exit_time.isoformat() if t.exit_time else None,
                "pnl": t.pnl
            } for t in closed_trades
        ],
        "equity_series": equity_series[-30:] # return last 30 entries
    }
