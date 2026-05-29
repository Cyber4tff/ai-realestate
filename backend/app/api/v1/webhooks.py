from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.all_models import AlertLog
from app.schemas.all_schemas import TradingViewAlertPayload
from app.tasks.tasks import process_webhook_signal
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/tradingview")
def receive_tradingview_alert(
    payload: TradingViewAlertPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Receives an alert webhook from TradingView.
    Validates security secret and dispatches trade signal to queue.
    """
    # 1. Log receipt
    logger.info(f"Received webhook alert for {payload.symbol}: {payload.action}")
    
    # 2. Check secret verification
    signature_valid = (payload.secret == settings.WEBHOOK_SECRET)
    
    # Create database alert entry
    alert = AlertLog(
        payload=payload.model_dump(),
        signature_valid=signature_valid,
        processed=False,
        status="PENDING"
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    if not signature_valid:
        logger.warning(f"Invalid secret received in webhook alert. Alert Log ID: {alert.id}")
        alert.status = "REJECTED"
        alert.error_message = "Invalid security secret"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Webhook secret mismatch."
        )
        
    # 3. Dispatch to execution queue
    try:
        process_webhook_signal.delay(payload.model_dump(), alert.id)
    except Exception as e:
        # Fallback to local background runner if Celery/Redis is down
        logger.warning(f"Celery queue error: {str(e)}. Processing webhook signal synchronously.")
        background_tasks.add_task(run_local_signal_processing, payload.model_dump(), alert.id)
        
    return {"status": "queued", "alert_id": alert.id}

@router.get("/logs")
def get_webhook_logs(
    db: Session = Depends(get_db)
):
    """Retrieves recent webhook alert logs."""
    return db.query(AlertLog).order_by(AlertLog.received_at.desc()).limit(100).all()

def run_local_signal_processing(payload_dict: dict, alert_id: int):
    """Fallback processor for signal execution when Celery queue is not active."""
    db = get_db().__next__()
    try:
        from app.tasks.tasks import process_webhook_signal
        process_webhook_signal(payload_dict, alert_id)
    except Exception as e:
        logger.error(f"Local webhook process failed: {str(e)}")
    finally:
        db.close()
