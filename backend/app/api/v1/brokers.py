from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.all_models import User, BrokerConnection
from app.core.security import encrypt_api_key, decrypt_api_key
from pydantic import BaseModel
from typing import List

router = APIRouter()

class ConnectionCreate(BaseModel):
    broker_name: str
    api_key: str
    secret_key: str
    environment: str = "paper"

class ConnectionOut(BaseModel):
    id: int
    broker_name: str
    environment: str
    is_connected: bool

    class Config:
        from_attributes = True

@router.post("/", response_model=ConnectionOut)
def create_or_update_connection(
    conn_in: ConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Saves or updates API keys for a broker, encrypting keys at rest."""
    # Check if connection already exists
    conn = db.query(BrokerConnection).filter(
        BrokerConnection.user_id == current_user.id,
        BrokerConnection.broker_name == conn_in.broker_name
    ).first()
    
    enc_api = encrypt_api_key(conn_in.api_key)
    enc_secret = encrypt_api_key(conn_in.secret_key)
    
    # Mock validation: we check if keys are non-empty
    is_connected = len(conn_in.api_key) > 5 and len(conn_in.secret_key) > 5
    
    if conn:
        conn.api_key_encrypted = enc_api
        conn.secret_key_encrypted = enc_secret
        conn.environment = conn_in.environment
        conn.is_connected = is_connected
    else:
        conn = BrokerConnection(
            user_id=current_user.id,
            broker_name=conn_in.broker_name,
            api_key_encrypted=enc_api,
            secret_key_encrypted=enc_secret,
            environment=conn_in.environment,
            is_connected=is_connected
        )
        db.add(conn)
        
    db.commit()
    db.refresh(conn)
    return conn

@router.get("/", response_model=List[ConnectionOut])
def get_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Lists all configured broker connections for the user."""
    return db.query(BrokerConnection).filter(BrokerConnection.user_id == current_user.id).all()

@router.post("/{conn_id}/test")
def test_connection(
    conn_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Tests an active broker connection and returns status."""
    conn = db.query(BrokerConnection).filter(
        BrokerConnection.id == conn_id,
        BrokerConnection.user_id == current_user.id
    ).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Broker connection not found")
        
    # Decrypt API key to verify it functions
    api_key = decrypt_api_key(conn.api_key_encrypted)
    
    # Simulate API ping check
    success = ("Error" not in api_key) and (len(api_key) > 0)
    conn.is_connected = success
    db.commit()
    
    return {"is_connected": success, "broker_name": conn.broker_name}
