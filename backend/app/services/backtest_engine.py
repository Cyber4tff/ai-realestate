import pandas as pd
import numpy as np
from typing import List, Dict, Any

class BacktestEngine:
    @staticmethod
    def calculate_sma(series: pd.Series, period: int) -> pd.Series:
        return series.rolling(window=period).mean()

    @staticmethod
    def calculate_ema(series: pd.Series, period: int) -> pd.Series:
        return series.ewm(span=period, adjust=False).mean()

    @staticmethod
    def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    @staticmethod
    def run_backtest(
        bars: List[Dict[str, Any]],
        strategy_type: str = "ema_crossover",  # ema_crossover, rsi_bounce
        parameters: Dict[str, Any] = None,
        starting_capital: float = 100000.0,
        commission: float = 2.00,
        slippage: float = 0.05
    ) -> Dict[str, Any]:
        """
        Runs a historical backtest on bar data.
        Returns trade log, metrics, and equity curve.
        """
        if not bars:
            return {"error": "No bar data provided"}

        if parameters is None:
            parameters = {}

        df = pd.DataFrame(bars)
        df['time'] = pd.to_datetime(df['time'])
        df = df.sort_values('time').reset_index(drop=True)

        # 1. Compute Indicators based on Strategy Type
        if strategy_type == "ema_crossover":
            fast = int(parameters.get("fast_period", 9))
            slow = int(parameters.get("slow_period", 21))
            df['fast_ma'] = BacktestEngine.calculate_ema(df['close'], fast)
            df['slow_ma'] = BacktestEngine.calculate_ema(df['close'], slow)
            
            # Generate signals: 1 (BUY), -1 (SELL/EXIT)
            df['signal'] = 0
            # Buy when fast crosses above slow
            buy_cond = (df['fast_ma'] > df['slow_ma']) & (df['fast_ma'].shift(1) <= df['slow_ma'].shift(1))
            # Sell/Exit when fast crosses below slow
            exit_cond = (df['fast_ma'] < df['slow_ma']) & (df['fast_ma'].shift(1) >= df['slow_ma'].shift(1))
            
            df.loc[buy_cond, 'signal'] = 1
            df.loc[exit_cond, 'signal'] = -1

        elif strategy_type == "rsi_bounce":
            rsi_period = int(parameters.get("rsi_period", 14))
            oversold = float(parameters.get("oversold", 30))
            overbought = float(parameters.get("overbought", 70))
            df['rsi'] = BacktestEngine.calculate_rsi(df['close'], rsi_period)
            
            df['signal'] = 0
            # Buy when RSI crosses above oversold
            buy_cond = (df['rsi'] > oversold) & (df['rsi'].shift(1) <= oversold)
            # Exit when RSI crosses below overbought
            exit_cond = (df['rsi'] < overbought) & (df['rsi'].shift(1) >= overbought)
            
            df.loc[buy_cond, 'signal'] = 1
            df.loc[exit_cond, 'signal'] = -1
        else:
            # Default to simple breakout (High/Low channel)
            period = int(parameters.get("breakout_period", 20))
            df['highest_high'] = df['high'].shift(1).rolling(period).max()
            df['lowest_low'] = df['low'].shift(1).rolling(period).min()
            df['signal'] = 0
            df.loc[df['close'] > df['highest_high'], 'signal'] = 1
            df.loc[df['close'] < df['lowest_low'], 'signal'] = -1

        # 2. Replay Loop
        equity = starting_capital
        position_size = 0.0 # qty
        entry_price = 0.0
        entry_time = None
        trade_log = []
        equity_curve = []

        # Default size is e.g. 1 contract or 100 shares. Let's assume trade size in parameters
        qty = float(parameters.get("trade_size", 1.0))

        for idx, row in df.iterrows():
            signal = row['signal']
            close = row['close']
            time_str = row['time'].isoformat()

            # Process exit signal or reverse
            if position_size > 0 and (signal == -1 or idx == len(df) - 1):
                # Close trade
                exit_price = close - slippage
                raw_pnl = (exit_price - entry_price) * qty * position_size
                net_pnl = raw_pnl - (commission * 2)
                equity += net_pnl
                
                trade_log.append({
                    "id": len(trade_log) + 1,
                    "symbol": parameters.get("symbol", "BTCUSD"),
                    "side": "BUY",
                    "qty": qty,
                    "entry_price": entry_price,
                    "exit_price": exit_price,
                    "entry_time": entry_time,
                    "exit_time": time_str,
                    "pnl": net_pnl,
                    "return_pct": (exit_price - entry_price) / entry_price
                })
                position_size = 0
                entry_price = 0.0

            # Process entry signal
            elif position_size == 0 and signal == 1:
                position_size = 1.0
                entry_price = close + slippage
                entry_time = time_str
                equity -= commission

            # Track equity curve per bar
            current_floating_pnl = 0.0
            if position_size > 0:
                current_floating_pnl = (close - entry_price) * qty
            equity_curve.append({
                "time": time_str,
                "equity": equity + current_floating_pnl,
                "close": close
            })

        # 3. Compute Metrics
        trade_df = pd.DataFrame(trade_log)
        
        total_trades = len(trade_log)
        if total_trades > 0:
            winning_trades = trade_df[trade_df['pnl'] > 0]
            losing_trades = trade_df[trade_df['pnl'] <= 0]
            
            win_rate = len(winning_trades) / total_trades
            total_wins = winning_trades['pnl'].sum()
            total_losses = abs(losing_trades['pnl'].sum())
            
            profit_factor = total_wins / total_losses if total_losses > 0 else total_wins
            avg_pnl = trade_df['pnl'].mean()
            
            # Sharpe Ratio
            returns = trade_df['return_pct']
            std_dev = returns.std()
            sharpe = (returns.mean() / std_dev) * np.sqrt(252) if std_dev > 0 else 0.0
        else:
            win_rate = 0.0
            profit_factor = 0.0
            avg_pnl = 0.0
            sharpe = 0.0

        # Max Drawdown
        equity_series = pd.Series([eq['equity'] for eq in equity_curve])
        peaks = equity_series.cummax()
        drawdowns = peaks - equity_series
        max_drawdown = drawdowns.max()
        max_drawdown_pct = (drawdowns / peaks).max() if len(peaks) > 0 else 0.0

        return {
            "total_return_pct": (equity - starting_capital) / starting_capital,
            "final_equity": equity,
            "total_trades": total_trades,
            "win_rate": win_rate,
            "profit_factor": profit_factor,
            "average_trade_pnl": avg_pnl,
            "max_drawdown": max_drawdown,
            "max_drawdown_pct": max_drawdown_pct,
            "sharpe_ratio": sharpe,
            "trade_log": trade_log,
            "equity_curve": equity_curve
        }

    @staticmethod
    def walk_forward_validation(
        bars: List[Dict[str, Any]],
        strategy_type: str = "ema_crossover",
        parameters: Dict[str, Any] = None,
        train_ratio: float = 0.60
    ) -> Dict[str, Any]:
        """
        Splits data into In-Sample (training/optimization) and Out-of-Sample (testing).
        Runs backtests on both and returns the performance comparison.
        """
        if not bars:
            return {"error": "No bars"}
            
        split_idx = int(len(bars) * train_ratio)
        in_sample_bars = bars[:split_idx]
        out_of_sample_bars = bars[split_idx:]
        
        in_sample_results = BacktestEngine.run_backtest(in_sample_bars, strategy_type, parameters)
        out_of_sample_results = BacktestEngine.run_backtest(out_of_sample_bars, strategy_type, parameters)
        
        # Calculate walk-forward efficiency: out-of-sample annualized return / in-sample annualized return
        is_ret = in_sample_results.get("total_return_pct", 0)
        oos_ret = out_of_sample_results.get("total_return_pct", 0)
        efficiency = oos_ret / is_ret if is_ret != 0 else 0.0
        
        return {
            "walk_forward_efficiency": efficiency,
            "in_sample": {
                "total_return_pct": is_ret,
                "win_rate": in_sample_results.get("win_rate"),
                "profit_factor": in_sample_results.get("profit_factor"),
                "max_drawdown": in_sample_results.get("max_drawdown")
            },
            "out_of_sample": {
                "total_return_pct": oos_ret,
                "win_rate": out_of_sample_results.get("win_rate"),
                "profit_factor": out_of_sample_results.get("profit_factor"),
                "max_drawdown": out_of_sample_results.get("max_drawdown")
            }
        }
