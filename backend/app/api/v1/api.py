from fastapi import APIRouter
from app.api.v1 import auth, dashboard, strategies, simulations, webhooks, risk, backtest, ai_research, brokers, real_estate

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(real_estate.router, prefix="/realestate", tags=["real_estate"])
api_router.include_router(strategies.router, prefix="/strategies", tags=["strategies"])
api_router.include_router(simulations.router, prefix="/simulations", tags=["simulations"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(risk.router, prefix="/risk", tags=["risk"])
api_router.include_router(backtest.router, prefix="/backtest", tags=["backtester"])
api_router.include_router(ai_research.router, prefix="/ai", tags=["ai_research"])
api_router.include_router(brokers.router, prefix="/brokers", tags=["brokers"])

