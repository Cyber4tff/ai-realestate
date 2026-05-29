from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.all_models import User, RiskRules, Account, AuditLog
from app.schemas.all_schemas import RiskRulesUpdate, RiskRulesOut
from typing import List

router = APIRouter()

@router.get("/rules/{account_id}", response_model=RiskRulesOut)
def get_risk_rules(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves active risk rules for an account."""
    # Ensure account belongs to user
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    rules = db.query(RiskRules).filter(RiskRules.account_id == account_id).first()
    if not rules:
        # Auto-create default rules if none exist
        rules = RiskRules(
            account_id=account_id,
            daily_drawdown_limit=5000.0,
            trailing_drawdown_limit=10000.0,
            max_contracts=5,
            max_concurrent_trades=3,
            cooldown_period_minutes=5,
            session_start_hour=0,
            session_end_hour=24,
            is_locked=False
        )
        db.add(rules)
        db.commit()
        db.refresh(rules)
        
    return rules

@router.put("/rules/{account_id}", response_model=RiskRulesOut)
def update_risk_rules(
    account_id: int,
    rules_in: RiskRulesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Updates risk limits and properties."""
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    rules = db.query(RiskRules).filter(RiskRules.account_id == account_id).first()
    if not rules:
        raise HTTPException(status_code=404, detail="Risk rules not found")
        
    # Update fields
    for field, value in rules_in.model_dump(exclude_unset=True).items():
        setattr(rules, field, value)
        
    # Log the update in Audit Logs
    audit = AuditLog(
        user_id=current_user.id,
        action="RISK_RULES_MODIFIED",
        details=f"Risk parameters modified for Account {account_id}."
    )
    db.add(audit)
    db.commit()
    db.refresh(rules)
    return rules

@router.post("/lock/{account_id}")
def toggle_account_lock(
    account_id: int,
    lock_status: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Force locks or unlocks an account immediately (Emergency Kill Switch)."""
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    rules = db.query(RiskRules).filter(RiskRules.account_id == account_id).first()
    if not rules:
        raise HTTPException(status_code=404, detail="Risk rules not found")
        
    rules.is_locked = lock_status
    
    # Log emergency switch
    status_str = "LOCKED" if lock_status else "UNLOCKED"
    audit = AuditLog(
        user_id=current_user.id,
        action=f"ACCOUNT_{status_str}",
        details=f"Emergency switch activated: Account {account_id} has been manually {status_str.lower()}."
    )
    db.add(audit)
    db.commit()
    return {"status": status_str, "account_id": account_id}

@router.get("/audit-logs", response_model=List[dict])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves security, error, and action logs for the user."""
    logs = db.query(AuditLog).filter(AuditLog.user_id == current_user.id).order_by(AuditLog.timestamp.desc()).limit(100).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "details": l.details,
            "timestamp": l.timestamp.isoformat()
        } for l in logs
    ]
