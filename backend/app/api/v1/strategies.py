from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.all_models import User, Strategy, Trade
from app.schemas.all_schemas import StrategyCreate, StrategyUpdate, StrategyOut
from datetime import datetime, timezone

router = APIRouter()

@router.post("/", response_model=StrategyOut, status_code=status.HTTP_201_CREATED)
def create_strategy(
    strategy_in: StrategyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Creates a new Pine Script strategy profile."""
    strategy = Strategy(
        user_id=current_user.id,
        name=strategy_in.name,
        description=strategy_in.description,
        pine_script=strategy_in.pine_script,
        settings=strategy_in.settings or {},
        version=1,
        is_active=strategy_in.is_active
    )
    db.add(strategy)
    db.commit()
    db.refresh(strategy)
    return strategy

@router.get("/", response_model=List[StrategyOut])
def get_strategies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves all strategies for the current user."""
    return db.query(Strategy).filter(Strategy.user_id == current_user.id).all()

@router.get("/{strategy_id}", response_model=StrategyOut)
def get_strategy_by_id(
    strategy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves a single strategy profile."""
    strategy = db.query(Strategy).filter(
        Strategy.id == strategy_id,
        Strategy.user_id == current_user.id
    ).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy

@router.put("/{strategy_id}", response_model=StrategyOut)
def update_strategy(
    strategy_id: int,
    strategy_in: StrategyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Updates strategy settings or registers a new Pine Script version."""
    strategy = db.query(Strategy).filter(
        Strategy.id == strategy_id,
        Strategy.user_id == current_user.id
    ).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
        
    # Check if pine script is changing. If yes, increment version code
    if strategy_in.pine_script is not None and strategy_in.pine_script != strategy.pine_script:
        strategy.version += 1
        strategy.pine_script = strategy_in.pine_script
        
    if strategy_in.name is not None:
        strategy.name = strategy_in.name
    if strategy_in.description is not None:
        strategy.description = strategy_in.description
    if strategy_in.settings is not None:
        strategy.settings = strategy_in.settings
    if strategy_in.is_active is not None:
        strategy.is_active = strategy_in.is_active
        
    db.commit()
    db.refresh(strategy)
    return strategy

@router.get("/{strategy_id}/performance")
def get_strategy_performance(
    strategy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Calculates live/paper trading statistics for this strategy."""
    strategy = db.query(Strategy).filter(
        Strategy.id == strategy_id,
        Strategy.user_id == current_user.id
    ).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
        
    trades = db.query(Trade).filter(
        Trade.strategy_id == strategy_id,
        Trade.status == "CLOSED"
    ).all()
    
    total_trades = len(trades)
    if total_trades == 0:
        return {
            "total_trades": 0,
            "win_rate": 0.0,
            "net_profit": 0.0,
            "profit_factor": 0.0
        }
        
    wins = [t.pnl for t in trades if t.pnl > 0]
    losses = [abs(t.pnl) for t in trades if t.pnl <= 0]
    
    win_rate = len(wins) / total_trades
    net_profit = sum(t.pnl for t in trades)
    
    sum_wins = sum(wins)
    sum_losses = sum(losses)
    profit_factor = sum_wins / sum_losses if sum_losses > 0 else sum_wins
    
    return {
        "total_trades": total_trades,
        "win_rate": win_rate,
        "net_profit": net_profit,
        "profit_factor": profit_factor,
        "average_trade": net_profit / total_trades
    }
