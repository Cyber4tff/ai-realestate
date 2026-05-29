from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "trader"

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Account Schemas
class AccountBase(BaseModel):
    name: str
    broker_type: str = "paper" # paper, alpaca, tradovate
    balance: float
    starting_balance: float
    leverage: Optional[float] = 1.0
    status: Optional[str] = "evaluation" # active, evaluation, passed, failed
    prop_firm_target: Optional[float] = 0.0
    prop_firm_max_drawdown: Optional[float] = 0.0
    prop_firm_daily_drawdown: Optional[float] = 0.0

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[float] = None
    status: Optional[str] = None
    prop_firm_target: Optional[float] = None
    prop_firm_max_drawdown: Optional[float] = None
    prop_firm_daily_drawdown: Optional[float] = None

class AccountOut(AccountBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Trade Schemas
class TradeBase(BaseModel):
    symbol: str
    side: str # BUY, SELL
    qty: float
    entry_price: float
    exit_price: Optional[float] = None
    entry_time: datetime
    exit_time: Optional[datetime] = None
    pnl: Optional[float] = 0.0
    commission: Optional[float] = 0.0
    status: str = "OPEN" # OPEN, CLOSED

class TradeCreate(BaseModel):
    account_id: int
    symbol: str
    side: str
    qty: float
    price: float
    strategy_id: Optional[int] = None
    signal_id: Optional[int] = None

class TradeOut(TradeBase):
    id: int
    account_id: int
    strategy_id: Optional[int] = None
    signal_id: Optional[int] = None

    class Config:
        from_attributes = True

# Strategy Schemas
class StrategyBase(BaseModel):
    name: str
    description: Optional[str] = None
    pine_script: Optional[str] = None
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_active: Optional[bool] = True

class StrategyCreate(StrategyBase):
    pass

class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    pine_script: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class StrategyOut(StrategyBase):
    id: int
    user_id: int
    version: int
    created_at: datetime

    class Config:
        from_attributes = True

# Simulation Schemas
class SimulationBase(BaseModel):
    name: str
    strategy_id: Optional[int] = None
    parameters: Dict[str, Any] # starting_balance, win_rate, risk_reward, steps, target, max_drawdown, etc.

class SimulationCreate(SimulationBase):
    pass

class SimulationOut(SimulationBase):
    id: int
    user_id: int
    results: Dict[str, Any] # pass_rate, ruin_rate, max_drawdown_dist, etc.
    created_at: datetime

    class Config:
        from_attributes = True

# Broker Connection Schemas
class BrokerConnectionBase(BaseModel):
    broker_name: str
    environment: str = "paper"
    is_connected: bool = False

class BrokerConnectionCreate(BrokerConnectionBase):
    api_key: str
    secret_key: str

class BrokerConnectionOut(BrokerConnectionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Risk Rules Schemas
class RiskRulesBase(BaseModel):
    daily_drawdown_limit: float = 0.0
    trailing_drawdown_limit: float = 0.0
    max_contracts: int = 5
    max_concurrent_trades: int = 3
    cooldown_period_minutes: int = 5
    session_start_hour: int = 0
    session_end_hour: int = 24
    is_locked: bool = False

class RiskRulesUpdate(BaseModel):
    daily_drawdown_limit: Optional[float] = None
    trailing_drawdown_limit: Optional[float] = None
    max_contracts: Optional[int] = None
    max_concurrent_trades: Optional[int] = None
    cooldown_period_minutes: Optional[int] = None
    session_start_hour: Optional[int] = None
    session_end_hour: Optional[int] = None
    is_locked: Optional[bool] = None

class RiskRulesOut(RiskRulesBase):
    id: int
    account_id: int

    class Config:
        from_attributes = True

# Webhook Alert Schemas (for incoming alert requests)
class TradingViewAlertPayload(BaseModel):
    secret: str
    action: str  # buy, sell, exit
    symbol: str
    qty: float
    price: float
    strategy_name: Optional[str] = None
    order_type: Optional[str] = "market"  # market, limit
    limit_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
