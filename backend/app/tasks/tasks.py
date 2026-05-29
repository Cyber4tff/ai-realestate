from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.all_models import Simulation, AlertLog, Account, Strategy
from app.services.monte_carlo import run_monte_carlo_simulation
from app.services.execution_engine import ExecutionEngine
import logging

logger = logging.getLogger(__name__)

@celery_app.task(name="run_async_monte_carlo")
def run_async_monte_carlo(simulation_id: int):
    """Runs a Monte Carlo simulation in the background and saves results to DB."""
    db = SessionLocal()
    try:
        sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
        if not sim:
            logger.error(f"Simulation ID {simulation_id} not found.")
            return False
            
        params = sim.parameters
        # Run simulation
        results = run_monte_carlo_simulation(
            starting_balance=float(params.get("starting_balance", 100000.0)),
            win_rate=float(params.get("win_rate", 0.5)),
            risk_reward_ratio=float(params.get("risk_reward_ratio", 1.5)),
            avg_loss_cash=float(params.get("avg_loss_cash", 1000.0)),
            steps=int(params.get("steps", 100)),
            target_profit=float(params.get("target_profit", 6000.0)),
            max_drawdown=float(params.get("max_drawdown", 5000.0)),
            is_trailing_drawdown=bool(params.get("is_trailing_drawdown", True)),
            num_simulations=int(params.get("num_simulations", 10000))
        )
        
        sim.results = results
        db.commit()
        logger.info(f"Simulation {simulation_id} completed successfully.")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Error running simulation {simulation_id}: {str(e)}")
        return False
    finally:
        db.close()

@celery_app.task(name="process_webhook_signal")
def process_webhook_signal(payload: dict, signal_id: int):
    """Processes an incoming TradingView signal webhook."""
    db = SessionLocal()
    try:
        # Check active accounts
        accounts = db.query(Account).filter(Account.status == "evaluation").all()
        if not accounts:
            accounts = db.query(Account).all() # fallback to any account if none under evaluation
            
        if not accounts:
            logger.error("No trading accounts found to process webhook signal.")
            alert = db.query(AlertLog).filter(AlertLog.id == signal_id).first()
            if alert:
                alert.status = "ERROR"
                alert.error_message = "No accounts registered in system."
                db.commit()
            return False
            
        strategy_name = payload.get("strategy_name")
        strategy = None
        if strategy_name:
            strategy = db.query(Strategy).filter(Strategy.name == strategy_name).first()
            
        # Process signal for all matching accounts or the first active one
        target_account = accounts[0]
        
        res = ExecutionEngine.execute_signal(
            db=db,
            account_id=target_account.id,
            action=payload.get("action"),
            symbol=payload.get("symbol"),
            qty=payload.get("qty", 1.0),
            price=payload.get("price"),
            strategy_id=strategy.id if strategy else None,
            signal_id=signal_id,
            stop_loss=payload.get("stop_loss"),
            take_profit=payload.get("take_profit")
        )
        
        logger.info(f"Signal ID {signal_id} execution result: {res}")
        return res.get("success", False)
    except Exception as e:
        logger.error(f"Error processing signal ID {signal_id}: {str(e)}")
        alert = db.query(AlertLog).filter(AlertLog.id == signal_id).first()
        if alert:
            alert.status = "ERROR"
            alert.error_message = str(e)
            db.commit()
        return False
    finally:
        db.close()
