from typing import Generator
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.all_models import User, Account, RiskRules

def get_current_user(
    db: Session = Depends(get_db)
) -> User:
    """
    Bypasses authentication for local desktop deployment.
    Always returns a default seeded user profile and account configuration.
    """
    user = db.query(User).filter(User.email == "trader@quantflow.io").first()
    
    if not user:
        from app.core.security import get_password_hash
        user = User(
            email="trader@quantflow.io",
            hashed_password=get_password_hash("defaultpassword123"),
            full_name="Default Local Trader",
            role="trader",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Auto-initialize standard evaluation account
        default_account = Account(
            user_id=user.id,
            name="QuantFlow Challenge Account",
            broker_type="paper",
            balance=100000.0,
            starting_balance=100000.0,
            leverage=100.0,
            status="evaluation",
            prop_firm_target=10000.0,
            prop_firm_max_drawdown=10000.0,
            prop_firm_daily_drawdown=5000.0
        )
        db.add(default_account)
        db.commit()
        db.refresh(default_account)
        
        # Auto-initialize risk rules
        default_rules = RiskRules(
            account_id=default_account.id,
            daily_drawdown_limit=5000.0,
            trailing_drawdown_limit=10000.0,
            max_contracts=10,
            max_concurrent_trades=3,
            cooldown_period_minutes=1,
            session_start_hour=0,
            session_end_hour=24,
            is_locked=False
        )
        db.add(default_rules)
        db.commit()
        
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user
