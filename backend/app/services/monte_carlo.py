import numpy as np
from typing import Dict, Any, List

def run_monte_carlo_simulation(
    starting_balance: float = 100000.0,
    win_rate: float = 0.50,
    risk_reward_ratio: float = 1.5,
    avg_loss_cash: float = 1000.0,
    steps: int = 100,
    target_profit: float = 6000.0,
    max_drawdown: float = 5000.0,
    is_trailing_drawdown: bool = True,
    num_simulations: int = 10000
) -> Dict[str, Any]:
    """
    Runs a high-performance vectorized Monte Carlo simulation.
    Returns statistical metrics: passing rate, risk of ruin, drawdown distributions, consistency,
    and a sample of 100 equity curves for charting.
    """
    avg_win_cash = avg_loss_cash * risk_reward_ratio
    
    # 1. Generate Bernoulli outcomes for all trials: Shape (num_simulations, steps)
    # outcomes[i, j] = avg_win_cash with probability win_rate, else -avg_loss_cash
    random_matrix = np.random.rand(num_simulations, steps)
    outcomes = np.where(random_matrix < win_rate, avg_win_cash, -avg_loss_cash)
    
    # 2. Compute equity paths (including step 0)
    # Shape: (num_simulations, steps + 1)
    equity = np.zeros((num_simulations, steps + 1))
    equity[:, 0] = starting_balance
    np.cumsum(outcomes, axis=1, out=equity[:, 1:])
    
    # 3. Track peaks, drawdowns, and limits per step
    # Running peaks for each path
    running_peaks = np.maximum.accumulate(equity, axis=1)
    
    # Calculate drawdown thresholds
    if is_trailing_drawdown:
        # Trailing drawdown limits: peak minus drawdown
        drawdown_thresholds = running_peaks - max_drawdown
        # Adjust so it cannot exceed starting balance or initial target checks depending on prop firm.
        # But generally, trailing drawdown trail behind the peak.
    else:
        # Static drawdown limit
        drawdown_thresholds = np.full_like(equity, starting_balance - max_drawdown)
        
    # Check breaches
    breached = equity <= drawdown_thresholds
    
    # 4. Check targets
    target_value = starting_balance + target_profit
    hit_target = equity >= target_value
    
    # Find step of breach and target hit
    # argmax returns the first index of True, or 0 if all False. We check if there actually was a True.
    has_breached = np.any(breached, axis=1)
    has_hit_target = np.any(hit_target, axis=1)
    
    # For paths that hit both, we must find which one happened first
    first_breach_idx = np.where(breached, np.arange(steps + 1), steps + 2).min(axis=1)
    first_target_idx = np.where(hit_target, np.arange(steps + 1), steps + 2).min(axis=1)
    
    passed_paths = has_hit_target & (~has_breached | (first_target_idx < first_breach_idx))
    ruined_paths = has_breached & (~has_hit_target | (first_breach_idx <= first_target_idx))
    
    # 5. Consistency score (e.g. FTMO/Apex style consistency: no single trade should account for > 40% of total profit)
    # We evaluate paths that passed or ended positive.
    net_profits = outcomes.copy()
    net_profits[net_profits < 0] = 0 # only look at positive trade days/trades
    max_single_win = np.max(net_profits, axis=1)
    total_positive_win = np.sum(net_profits, axis=1)
    
    # Avoid division by zero
    with np.errstate(divide='ignore', invalid='ignore'):
        consistency_ratios = max_single_win / total_positive_win
        consistency_ratios = np.nan_to_num(consistency_ratios, nan=1.0)
    
    # Consistency score is high if maximum single win is a small percentage of total wins
    # FTMO / Apex rules penalize > 30% or 40% consistency. Let's return consistency percentage passing.
    consistency_passed = consistency_ratios < 0.40
    
    # Compute max drawdown of each path
    # Peak-to-trough drawdown calculation
    peaks = np.maximum.accumulate(equity, axis=1)
    drawdowns = peaks - equity
    max_drawdowns_per_path = np.max(drawdowns, axis=1)
    
    # 6. Calculate statistics
    p_pass = float(np.mean(passed_paths))
    p_ruin = float(np.mean(ruined_paths))
    p_payout = float(np.mean(passed_paths & consistency_passed))
    avg_max_drawdown = float(np.mean(max_drawdowns_per_path))
    median_max_drawdown = float(np.median(max_drawdowns_per_path))
    
    # Get 10%, 25%, 50%, 75%, 90% drawdown quantiles
    dd_quantiles = {
        "q10": float(np.percentile(max_drawdowns_per_path, 10)),
        "q25": float(np.percentile(max_drawdowns_per_path, 25)),
        "q50": float(np.percentile(max_drawdowns_per_path, 50)),
        "q75": float(np.percentile(max_drawdowns_per_path, 75)),
        "q90": float(np.percentile(max_drawdowns_per_path, 90)),
    }
    
    # Consistency average
    avg_consistency_ratio = float(np.mean(consistency_ratios))
    
    # 7. Select 100 sample curves for charting to keep payload small
    sample_indices = np.random.choice(num_simulations, size=min(100, num_simulations), replace=False)
    sample_paths = equity[sample_indices].tolist()
    
    # Distribution of final equity
    final_equity = equity[:, -1]
    final_equity_quantiles = {
        "q10": float(np.percentile(final_equity, 10)),
        "q50": float(np.percentile(final_equity, 50)),
        "q90": float(np.percentile(final_equity, 90)),
    }
    
    return {
        "probability_pass": p_pass,
        "probability_ruin": p_ruin,
        "probability_payout": p_payout,
        "average_max_drawdown": avg_max_drawdown,
        "median_max_drawdown": median_max_drawdown,
        "drawdown_quantiles": dd_quantiles,
        "average_consistency_ratio": avg_consistency_ratio,
        "final_equity_quantiles": final_equity_quantiles,
        "sample_paths": sample_paths,
        "steps": steps
    }
