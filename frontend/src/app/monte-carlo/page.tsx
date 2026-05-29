"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { createChart, ColorType } from "lightweight-charts";
import { 
  TrendingUp, 
  HelpCircle, 
  Play, 
  Percent, 
  BarChart4, 
  Flame, 
  Settings,
  Activity
} from "lucide-react";

export default function MonteCarlo() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  // Simulator State Inputs
  const [startingBalance, setStartingBalance] = useState(100000);
  const [winRate, setWinRate] = useState(50); // percentage
  const [riskReward, setRiskReward] = useState(1.5);
  const [avgLoss, setAvgLoss] = useState(1000);
  const [steps, setSteps] = useState(100);
  const [targetProfit, setTargetProfit] = useState(10000);
  const [maxDrawdown, setMaxDrawdown] = useState(5000);
  const [isTrailing, setIsTrailing] = useState(true);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await api.createSimulation("Monte Carlo Run", {
        starting_balance: startingBalance,
        win_rate: winRate / 100,
        risk_reward_ratio: riskReward,
        avg_loss_cash: avgLoss,
        steps: steps,
        target_profit: targetProfit,
        max_drawdown: maxDrawdown,
        is_trailing_drawdown: isTrailing,
        num_simulations: 10000
      });
      
      // Wait briefly for simulation save and read status (fallback locally runs synchronously)
      const detail = await api.getSimulationDetail(res.id);
      
      // Keep fetching until results are ready (for Celery background tasks)
      let pollCount = 0;
      let finalResult = detail;
      while (!finalResult.results?.probability_pass && pollCount < 10) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        finalResult = await api.getSimulationDetail(res.id);
        pollCount++;
      }
      
      setResults(finalResult.results);
    } catch (err: any) {
      alert("Simulation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run a default simulation on mount
  useEffect(() => {
    runSimulation();
  }, []);

  // Update chart when results change
  useEffect(() => {
    if (!chartContainerRef.current || !results?.sample_paths) return;

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

    // Plot a sample of 25 curves to not overload canvas, using low opacity lines
    const colors = [
      "rgba(99, 102, 241, 0.15)", // Indigo
      "rgba(6, 182, 212, 0.15)",  // Cyan
      "rgba(168, 85, 247, 0.15)", // Purple
      "rgba(16, 185, 129, 0.15)"  // Emerald
    ];

    results.sample_paths.slice(0, 25).forEach((path: number[], index: number) => {
      const lineSeries = chart.addLineSeries({
        color: colors[index % colors.length],
        lineWidth: 1.5,
      });

      const pathData = path.map((val, step) => ({
        time: String(step),
        value: val,
      }));

      lineSeries.setData(pathData);
    });

    // Plot target and drawdown limits
    const targetLine = chart.addLineSeries({
      color: "#10B981",
      lineWidth: 2.5,
      lineStyle: 1, // dotted
      title: "Profit Target",
    });
    targetLine.setData(Array.from({ length: steps + 1 }, (_, i) => ({
      time: String(i),
      value: startingBalance + targetProfit
    })));

    const ddLine = chart.addLineSeries({
      color: "#EF4444",
      lineWidth: 2.5,
      lineStyle: 1, // dotted
      title: "Ruin Limit",
    });
    ddLine.setData(Array.from({ length: steps + 1 }, (_, i) => ({
      time: String(i),
      value: startingBalance - maxDrawdown
    })));

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
        <h1 className="text-3xl font-black tracking-tight text-white">Monte Carlo Engine</h1>
        <p className="text-gray-400 font-semibold mt-1">Stress-test strategy win-rates and evaluate prop-firm payout likelihoods</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Sliders for Parameters */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <h2 className="text-md font-black text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-400" />
            Simulation Inputs
          </h2>

          <div className="space-y-5 text-xs font-semibold">
            {/* Starting Balance */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-400">Starting Balance</span>
                <span className="text-white">${startingBalance.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={10000}
                max={300000}
                step={5000}
                value={startingBalance}
                onChange={(e) => setStartingBalance(parseInt(e.target.value))}
                className="w-full accent-indigo-500 bg-gray-900 h-1.5 rounded-lg"
              />
            </div>

            {/* Win Rate */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-400">Strategy Win Rate</span>
                <span className="text-white">{winRate}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={90}
                value={winRate}
                onChange={(e) => setWinRate(parseInt(e.target.value))}
                className="w-full accent-indigo-500 bg-gray-900 h-1.5 rounded-lg"
              />
            </div>

            {/* Risk to Reward Ratio */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-400">Risk to Reward (R:R)</span>
                <span className="text-white">{riskReward}:1</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.1}
                value={riskReward}
                onChange={(e) => setRiskReward(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-gray-900 h-1.5 rounded-lg"
              />
            </div>

            {/* Average Loss Cash */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-400">Average Loss Size</span>
                <span className="text-white">${avgLoss}</span>
              </div>
              <input
                type="range"
                min={100}
                max={5000}
                step={100}
                value={avgLoss}
                onChange={(e) => setAvgLoss(parseInt(e.target.value))}
                className="w-full accent-indigo-500 bg-gray-900 h-1.5 rounded-lg"
              />
            </div>

            {/* Steps / Total Trades */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-400">Simulated Steps (Trades)</span>
                <span className="text-white">{steps}</span>
              </div>
              <input
                type="range"
                min={20}
                max={300}
                step={10}
                value={steps}
                onChange={(e) => setSteps(parseInt(e.target.value))}
                className="w-full accent-indigo-500 bg-gray-900 h-1.5 rounded-lg"
              />
            </div>

            {/* Target Profit */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-400">Profit Target</span>
                <span className="text-white">${targetProfit.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={1000}
                max={30000}
                step={500}
                value={targetProfit}
                onChange={(e) => setTargetProfit(parseInt(e.target.value))}
                className="w-full accent-indigo-500 bg-gray-900 h-1.5 rounded-lg"
              />
            </div>

            {/* Maximum Drawdown */}
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-400">Drawdown Ruin Threshold</span>
                <span className="text-white">${maxDrawdown.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={1000}
                max={20000}
                step={500}
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(parseInt(e.target.value))}
                className="w-full accent-indigo-500 bg-gray-900 h-1.5 rounded-lg"
              />
            </div>

            {/* Trailing Check */}
            <div className="flex items-center justify-between border-t border-gray-800/80 pt-4 text-xs font-semibold">
              <span className="text-gray-400">Enable Trailing Drawdown</span>
              <button
                onClick={() => setIsTrailing(!isTrailing)}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                  isTrailing ? "bg-indigo-600" : "bg-gray-800"
                }`}
              >
                <span className={`w-4 h-4 bg-white rounded-full transition-transform ${isTrailing ? "translate-x-6" : "translate-x-0"}`}></span>
              </button>
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/35 transition-all duration-200 text-xs flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Run 10,000 simulations
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Charts & Metrics Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Stats Row */}
          {results && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-emerald-500">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Probability of Passing</span>
                <h3 className="text-3xl font-black text-emerald-400 mt-1">{(results.probability_pass * 100).toFixed(1)}%</h3>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-2">Likelihood of reaching target before hitting drawdown limit.</p>
              </div>

              <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-rose-500">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Risk of Ruin (Max DD)</span>
                <h3 className="text-3xl font-black text-rose-500 mt-1">{(results.probability_ruin * 100).toFixed(1)}%</h3>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-2">Likelihood of breaching account limit parameters.</p>
              </div>

              <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-cyan-500">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Avg Max Drawdown</span>
                <h3 className="text-3xl font-black text-cyan-400 mt-1">${results.average_max_drawdown?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-2">Expected mean peak-to-trough drop across all paths.</p>
              </div>
            </div>
          )}

          {/* Equity Paths Overlay Chart */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-extrabold text-white">Equity Paths Visualization (Sample 25)</h2>
              <span className="text-xs text-indigo-400 font-bold flex items-center gap-1">
                <Activity className="h-3 w-3 animate-pulse" />
                Vectorized Math Paths (10,000 paths mapped)
              </span>
            </div>
            <div ref={chartContainerRef} className="w-full" />
          </div>

          {/* Quantile Distributions */}
          {results?.drawdown_quantiles && (
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-sm font-extrabold text-white mb-4">Worst-Case Drawdown Quantile Ranges</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div className="bg-gray-950/40 border border-gray-900 rounded-xl p-3">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">10% Path (Best Case)</span>
                  <span className="text-xs font-black text-emerald-400">${results.drawdown_quantiles.q10.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="bg-gray-950/40 border border-gray-900 rounded-xl p-3">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">25% Path</span>
                  <span className="text-xs font-black text-cyan-400">${results.drawdown_quantiles.q25.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="bg-gray-950/40 border border-gray-900 rounded-xl p-3">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">50% Path (Median)</span>
                  <span className="text-xs font-black text-indigo-400">${results.drawdown_quantiles.q50.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="bg-gray-950/40 border border-gray-900 rounded-xl p-3">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">75% Path</span>
                  <span className="text-xs font-black text-orange-400">${results.drawdown_quantiles.q75.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="bg-gray-950/40 border border-gray-900 rounded-xl p-3">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">90% Path (Worst Case)</span>
                  <span className="text-xs font-black text-rose-500">${results.drawdown_quantiles.q90.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
