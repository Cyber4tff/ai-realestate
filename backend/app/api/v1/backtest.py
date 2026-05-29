from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from app.api.deps import get_current_active_user
from app.models.all_models import User
from app.services.backtest_engine import BacktestEngine
from datetime import datetime, timedelta
import numpy as np

router = APIRouter()

# High-fidelity synthetic bar data generator for offline/out-of-the-box execution
def generate_synthetic_bars(symbol: str, days: int = 365) -> List[Dict[str, Any]]:
    np.random.seed(42) # Stable seed for reproducible results
    
    # Establish base price and volatility based on symbol
    symbol = symbol.upper()
    if "BTC" in symbol:
        price = 60000.0
        volatility = 0.035
        drift = 0.0005
    elif "SPY" in symbol or "SPX" in symbol:
        price = 450.0
        volatility = 0.01
        drift = 0.0002
    elif "EUR" in symbol:
        price = 1.08
        volatility = 0.005
        drift = 0.0
    else:
        price = 150.0
        volatility = 0.015
        drift = 0.0001
        
    start_date = datetime.now() - timedelta(days=days)
    bars = []
    
    for i in range(days):
        date_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        
        # Log-normal random walk
        pct_change = np.random.normal(drift, volatility)
        open_price = price
        close_price = price * np.exp(pct_change)
        
        # High and Low bounds
        high_price = max(open_price, close_price) * (1 + abs(np.random.normal(0, volatility * 0.5)))
        low_price = min(open_price, close_price) * (1 - abs(np.random.normal(0, volatility * 0.5)))
        
        volume = float(np.random.randint(10000, 1000000))
        
        bars.append({
            "time": date_str,
            "open": float(open_price),
            "high": float(high_price),
            "low": float(low_price),
            "close": float(close_price),
            "volume": volume
        })
        
        price = close_price
        
    return bars

@router.post("/run")
def run_backtest_endpoint(
    symbol: str = "SPY",
    strategy_type: str = "ema_crossover",  # ema_crossover, rsi_bounce
    fast_period: int = 9,
    slow_period: int = 21,
    rsi_period: int = 14,
    oversold: float = 30.0,
    overbought: float = 70.0,
    trade_size: float = 1.0,
    days: int = 180,
    current_user: User = Depends(get_current_active_user)
):
    """
    Runs a historical strategy backtest.
    Generates synthetic historical bars automatically for SPY, BTCUSD, etc.
    """
    # 1. Obtain bar data
    bars = generate_synthetic_bars(symbol, days)
    
    # 2. Package parameters
    parameters = {
        "symbol": symbol,
        "fast_period": fast_period,
        "slow_period": slow_period,
        "rsi_period": rsi_period,
        "oversold": oversold,
        "overbought": overbought,
        "trade_size": trade_size
    }
    
    # 3. Execute
    results = BacktestEngine.run_backtest(
        bars=bars,
        strategy_type=strategy_type,
        parameters=parameters
    )
    
    return results

@router.post("/walk-forward")
def run_walk_forward_endpoint(
    symbol: str = "SPY",
    strategy_type: str = "ema_crossover",
    fast_period: int = 9,
    slow_period: int = 21,
    rsi_period: int = 14,
    oversold: float = 30.0,
    overbought: float = 70.0,
    train_ratio: float = 0.60,
    days: int = 365,
    current_user: User = Depends(get_current_active_user)
):
    """Runs walk-forward optimization analysis across split dates."""
    bars = generate_synthetic_bars(symbol, days)
    parameters = {
        "symbol": symbol,
        "fast_period": fast_period,
        "slow_period": slow_period,
        "rsi_period": rsi_period,
        "oversold": oversold,
        "overbought": overbought
    }
    
    results = BacktestEngine.walk_forward_validation(
        bars=bars,
        strategy_type=strategy_type,
        parameters=parameters,
        train_ratio=train_ratio
    )
    
    return results
