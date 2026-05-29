from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_active_user
from app.models.all_models import User
from app.services.ai_research import AIResearchService
from app.api.v1.backtest import generate_synthetic_bars
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()

class AuditRequest(BaseModel):
    pine_script: str

class OptimizeRequest(BaseModel):
    symbol: str = "SPY"
    strategy_type: str = "ema_crossover"
    base_parameters: Dict[str, Any]

@router.post("/audit")
def audit_script(
    req: AuditRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Audits Pine Script trading rules using AI recommendations or local parser."""
    return AIResearchService.audit_pine_script(req.pine_script)

@router.post("/optimize")
def optimize_params(
    req: OptimizeRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Searches parameter ranges to optimize return and Monte Carlo pass rates."""
    # Generate 180 days of bars for optimization sweep
    bars = generate_synthetic_bars(req.symbol, 180)
    
    optimized_runs = AIResearchService.optimize_parameters(
        bars=bars,
        strategy_type=req.strategy_type,
        base_parameters=req.base_parameters
    )
    
    return {
        "symbol": req.symbol,
        "strategy_type": req.strategy_type,
        "recommendations": optimized_runs[:5] # Return top 5 parameter configurations
    }
