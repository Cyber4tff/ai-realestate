from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from app.api.deps import get_current_active_user
from app.models.all_models import User, Account, RiskRules
from app.schemas.all_schemas import UserCreate, UserOut, Token

router = APIRouter()

@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registers a new user and configures a default Paper Trading account."""
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
        
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        role=user_in.role or "trader",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Auto-initialize a default Paper Trading account for evaluation tracking
    default_account = Account(
        user_id=user.id,
        name="FTMO 100k Challenge (Paper)",
        broker_type="paper",
        balance=100000.0,
        starting_balance=100000.0,
        leverage=100.0,
        status="evaluation",
        prop_firm_target=10000.0,      # $10,000 profit target (10%)
        prop_firm_max_drawdown=10000.0, # $10,000 max drawdown limit (10%)
        prop_firm_daily_drawdown=5000.0 # $5,000 daily drawdown limit (5%)
    )
    db.add(default_account)
    db.commit()
    db.refresh(default_account)
    
    # Auto-initialize risk rules for the account
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

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Verifies user credentials and issues a JWT token."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            user.email, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Returns details of the currently authenticated user."""
    return current_user
