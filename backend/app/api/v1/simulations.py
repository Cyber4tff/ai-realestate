from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.all_models import User, Simulation, Strategy
from app.schemas.all_schemas import SimulationCreate, SimulationOut
from app.tasks.tasks import run_async_monte_carlo
from app.services.monte_carlo import run_monte_carlo_simulation

router = APIRouter()

@router.post("/", response_model=SimulationOut, status_code=status.HTTP_201_CREATED)
def trigger_simulation(
    sim_in: SimulationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Creates a Simulation record. Launches the Monte Carlo simulator 
    via Celery queue, falling back to a background task if Celery is unavailable.
    """
    # Verify strategy exists if provided
    if sim_in.strategy_id:
        strategy = db.query(Strategy).filter(
            Strategy.id == sim_in.strategy_id,
            Strategy.user_id == current_user.id
        ).first()
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")
            
    # Save base entry
    sim = Simulation(
        user_id=current_user.id,
        strategy_id=sim_in.strategy_id,
        name=sim_in.name,
        parameters=sim_in.parameters,
        results={} # Initial empty results
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)
    
    # Attempt async Celery running, fallback to FastAPI BackgroundTasks for SQLite/Redis-less setups!
    try:
        from celery.exceptions import OperationalError
        # Try sending to worker queue
        run_async_monte_carlo.delay(sim.id)
    except Exception:
        # Fallback to local background runner (e.g. sqlite/redis-less local setup)
        # This keeps the application fully functional out-of-the-box!
        background_tasks.add_task(run_local_simulation, sim.id)
        
    return sim

@router.get("/", response_model=List[SimulationOut])
def get_simulations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves all Monte Carlo simulations for the user."""
    return db.query(Simulation).filter(Simulation.user_id == current_user.id).order_by(Simulation.created_at.desc()).all()

@router.get("/{sim_id}", response_model=SimulationOut)
def get_simulation_detail(
    sim_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieves detailed results for a single simulation."""
    sim = db.query(Simulation).filter(
        Simulation.id == sim_id,
        Simulation.user_id == current_user.id
    ).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim

def run_local_simulation(simulation_id: int):
    """Fallback runner for local systems without Celery running."""
    db = get_db().__next__()
    try:
        sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
        if sim:
            p = sim.parameters
            res = run_monte_carlo_simulation(
                starting_balance=float(p.get("starting_balance", 100000.0)),
                win_rate=float(p.get("win_rate", 0.5)),
                risk_reward_ratio=float(p.get("risk_reward_ratio", 1.5)),
                avg_loss_cash=float(p.get("avg_loss_cash", 1000.0)),
                steps=int(p.get("steps", 100)),
                target_profit=float(p.get("target_profit", 6000.0)),
                max_drawdown=float(p.get("max_drawdown", 5000.0)),
                is_trailing_drawdown=bool(p.get("is_trailing_drawdown", True)),
                num_simulations=int(p.get("num_simulations", 10000))
            )
            sim.results = res
            db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()
