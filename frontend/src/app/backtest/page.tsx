"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { createChart, ColorType } from "lightweight-charts";
import { 
  Play, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  ArrowUpRight,
  TrendingDown,
  Layers,
  LineChart
} from "lucide-react";

export default function Backtest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  // Backtest Inputs
  const [symbol, setSymbol] = useState("SPY");
  const [strategyType, setStrategyType] = useState("ema_crossover"); // ema_crossover, rsi_bounce
  const [fastPeriod, setFastPeriod] = useState(9);
  const [slowPeriod, setSlowPeriod] = useState(21);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [oversold, setOversold] = useState(30);
  const [overbought, setOverbought] = useState(70);
  const [tradeSize, setTradeSize] = useState(1.0);
  const [days, setDays] = useState(180);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  const triggerBacktest = async () => {
    setLoading(true);
    try {
      const res = await api.runBacktest({
        symbol,
        strategy_type: strategyType,
        fast_period: fastPeriod,
        slow_period: slowPeriod,
        rsi_period: rsiPeriod,
        oversold,
        overbought,
        trade_size: tradeSize,
        days
      });
      setResults(res);
    } catch (err: any) {
      alert("Backtest failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    triggerBacktest();
  }, []);

  // Update chart with backtest bars and trade markers
  useEffect(() => {
    if (!chartContainerRef.current || !results?.equity_curve) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart: any = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9CA3AF",
      },
      grid: {
        vertLines: { color: "#1F2937" },
        horzLines: { color: "#1F2937" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
      timeScale: {
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    });

    // 1. Candlestick series
    const candSeries = chart.addCandlestickSeries({
      upColor: "#10B981",
      downColor: "#EF4444",
      borderVisible: false,
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444",
    });

    const ohlcData = results.equity_curve.map((bar: any) => ({
      time: bar.time.split("T")[0],
      open: bar.close * 0.995, // mock open/high/low from closed series
      high: bar.close * 1.005,
      low: bar.close * 0.99,
      close: bar.close,
    }));

    candSeries.setData(ohlcData);

    // 2. Set Trade markers
    if (results.trade_log && results.trade_log.length > 0) {
      const markers: any[] = [];
      results.trade_log.forEach((trade: any) => {
        markers.push({
          time: trade.entry_time.split("T")[0],
          position: "belowBar",
          color: "#3B82F6",
          shape: "arrowUp",
          text: `BUY ${trade.qty}`,
        });
        markers.push({
          time: trade.exit_time.split("T")[0],
          position: "aboveBar",
          color: "#F59E0B",
          shape: "arrowDown",
          text: `EXIT (${trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(0)})`,
        });
      });
      candSeries.setMarkers(markers);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [results]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Backtest Engine</h1>
        <p className="text-gray-400 font-semibold mt-1">Replay historical quotes and analyze strategy performance logs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Input Configuration */}
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <h2 className="text-md font-black text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            Backtest Parameters
          </h2>

          <div className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Asset Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white"
              >
                <option value="SPY">SPY (S&P 500 ETF)</option>
                <option value="BTCUSD">BTC/USD (Bitcoin)</option>
                <option value="EURUSD">EUR/USD (Euro Forex)</option>
                <option value="AAPL">AAPL (Apple Inc)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Rule Strategy</label>
              <select
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white"
              >
                <option value="ema_crossover">EMA Crossover</option>
                <option value="rsi_bounce">RSI Oversold Bounce</option>
              </select>
            </div>

            {strategyType === "ema_crossover" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Fast Period</label>
                  <input
                    type="number"
                    value={fastPeriod}
                    onChange={(e) => setFastPeriod(parseInt(e.target.value) || 9)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Slow Period</label>
                  <input
                    type="number"
                    value={slowPeriod}
                    onChange={(e) => setSlowPeriod(parseInt(e.target.value) || 21)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">RSI Period</label>
                  <input
                    type="number"
                    value={rsiPeriod}
                    onChange={(e) => setRsiPeriod(parseInt(e.target.value) || 14)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-2 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Oversold</label>
                  <input
                    type="number"
                    value={oversold}
                    onChange={(e) => setOversold(parseInt(e.target.value) || 30)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-2 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Overbought</label>
                  <input
                    type="number"
                    value={overbought}
                    onChange={(e) => setOverbought(parseInt(e.target.value) || 70)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-2 py-2 text-xs text-white"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Position Qty</label>
                <input
                  type="number"
                  step="0.1"
                  value={tradeSize}
                  onChange={(e) => setTradeSize(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Range Days</label>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 180)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>
            </div>

            <button
              onClick={triggerBacktest}
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/35 transition-all duration-200 text-xs flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LineChart className="h-4 w-4" />
                  Run Backtest Replay
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side Results Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main metrics */}
          {results && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Total Return</span>
                <h4 className={`text-xl font-black ${(results.total_return_pct * 100) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {(results.total_return_pct * 100).toFixed(1)}%
                </h4>
              </div>
              <div className="glass-panel rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Win Rate ({results.total_trades} trades)</span>
                <h4 className="text-xl font-black text-emerald-400">
                  {(results.win_rate * 100).toFixed(0)}%
                </h4>
              </div>
              <div className="glass-panel rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Profit Factor</span>
                <h4 className="text-xl font-black text-indigo-400">
                  {results.profit_factor.toFixed(2)}
                </h4>
              </div>
              <div className="glass-panel rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Sharpe Ratio</span>
                <h4 className="text-xl font-black text-cyan-400">
                  {results.sharpe_ratio.toFixed(2)}
                </h4>
              </div>
            </div>
          )}

          {/* Interactive Chart */}
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-sm font-extrabold text-white mb-4">Historical Trade Overlay Chart</h2>
            <div ref={chartContainerRef} className="w-full" />
          </div>

          {/* Trade Executions Logs */}
          {results?.trade_log && (
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-sm font-extrabold text-white mb-4">Replay Execution Log</h2>
              <div className="overflow-y-auto max-h-[200px] text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800/80 font-bold uppercase tracking-wider">
                      <th className="pb-3">Trade</th>
                      <th className="pb-3">Entry Time</th>
                      <th className="pb-3">Exit Time</th>
                      <th className="pb-3">Entry / Exit</th>
                      <th className="pb-3 text-right">Net PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.trade_log.map((trade: any) => (
                      <tr key={trade.id} className="border-b border-gray-850/40 hover:bg-gray-800/10 font-medium">
                        <td className="py-3 text-white font-extrabold">#{trade.id}</td>
                        <td className="py-3 text-gray-400">{trade.entry_time.split("T")[0]}</td>
                        <td className="py-3 text-gray-400">{trade.exit_time.split("T")[0]}</td>
                        <td className="py-3 text-gray-300">${trade.entry_price.toFixed(2)} → ${trade.exit_price.toFixed(2)}</td>
                        <td className={`py-3 text-right font-extrabold ${trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          ${trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
