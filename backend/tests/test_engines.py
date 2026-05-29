import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone, timedelta
from app.core.database import Base
from app.models.all_models import Account, Trade, RiskRules, User
from app.services.risk_engine import RiskEngine
from app.services.monte_carlo import run_monte_carlo_simulation

# Setup in-memory SQLite for testing
@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_monte_carlo_math():
    """Validates that the Monte Carlo output contains appropriate stats and bounds."""
    res = run_monte_carlo_simulation(
        starting_balance=10000.0,
        win_rate=0.55,
        risk_reward_ratio=1.5,
        avg_loss_cash=200.0,
        steps=20,
        target_profit=1000.0,
        max_drawdown=800.0,
        is_trailing_drawdown=False,
        num_simulations=100
    )
    
    assert "probability_pass" in res
    assert "probability_ruin" in res
    assert "sample_paths" in res
    assert 0.0 <= res["probability_pass"] <= 1.0
    assert len(res["sample_paths"]) == 100

def test_risk_engine_cooldown(db_session):
    """Verifies that the risk engine blocks orders within the cooldown duration."""
    # Create user
    user = User(email="test@test.com", hashed_password="hashedpassword")
    db_session.add(user)
    db_session.commit()
    
    # Create account
    account = Account(
        user_id=user.id,
        name="Test Account",
        broker_type="paper",
        balance=10000.0,
        starting_balance=10000.0,
        status="evaluation"
    )
    db_session.add(account)
    db_session.commit()
    
    # Configure Risk Rules with 5 minutes cooldown
    rules = RiskRules(
        account_id=account.id,
        daily_drawdown_limit=500.0,
        max_contracts=10,
        max_concurrent_trades=3,
        cooldown_period_minutes=5,
        last_trade_time=datetime.now(timezone.utc) - timedelta(minutes=2), # traded 2 mins ago
        session_start_hour=0,
        session_end_hour=24,
        is_locked=False
    )
    db_session.add(rules)
    db_session.commit()
    
    # Validate trade: should fail because of cooldown
    res = RiskEngine.validate_trade(db_session, account.id, "BTCUSD", 1.0, "BUY")
    assert res["approved"] is False
    assert "Cooldown" in res["reason"]

def test_risk_engine_daily_drawdown_lock(db_session):
    """Verifies that exceeding daily drawdown limits locks the account."""
    user = User(email="test2@test.com", hashed_password="hashedpassword")
    db_session.add(user)
    db_session.commit()
    
    account = Account(
        user_id=user.id,
        name="Test Account 2",
        broker_type="paper",
        balance=10000.0,
        starting_balance=10000.0,
        status="evaluation"
    )
    db_session.add(account)
    db_session.commit()
    
    # Set limit to $500
    rules = RiskRules(
        account_id=account.id,
        daily_drawdown_limit=500.0,
        max_contracts=10,
        max_concurrent_trades=3,
        cooldown_period_minutes=0,
        last_trade_time=None,
        session_start_hour=0,
        session_end_hour=24,
        is_locked=False
    )
    db_session.add(rules)
    
    # Simulate a closed trade losing $600 today
    trade = Trade(
        account_id=account.id,
        symbol="BTCUSD",
        side="BUY",
        qty=1.0,
        entry_price=1000.0,
        exit_price=400.0,
        entry_time=datetime.now(timezone.utc) - timedelta(hours=1),
        exit_time=datetime.now(timezone.utc),
        pnl=-600.0,
        status="CLOSED"
    )
    db_session.add(trade)
    db_session.commit()
    
    # Validate trade: should lock the account and fail
    res = RiskEngine.validate_trade(db_session, account.id, "BTCUSD", 1.0, "BUY")
    assert res["approved"] is False
    assert "drawdown limit reached" in res["reason"].lower()
    
    # Verify account is locked in database
    db_session.refresh(rules)
    assert rules.is_locked is True
