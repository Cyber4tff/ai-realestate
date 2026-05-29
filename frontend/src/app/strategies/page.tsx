"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Code2, 
  Plus, 
  Layers, 
  Play, 
  TrendingUp, 
  HelpCircle,
  FileCode2,
  Trash
} from "lucide-react";

const SAMPLE_PINE_SCRIPT = `//@version=5
strategy("Ema Crossover Custom Strategy", overlay=true, margin_long=100, margin_short=100)

// Strategy settings inputs
fastLength = input.int(9, title="Fast EMA Period")
slowLength = input.int(21, title="Slow EMA Period")

fastEMA = ta.ema(close, fastLength)
slowEMA = ta.ema(close, slowLength)

plot(fastEMA, color=color.blue, title="Fast EMA")
plot(slowEMA, color=color.orange, title="Slow EMA")

buyCondition = ta.crossover(fastEMA, slowEMA)
sellCondition = ta.crossunder(fastEMA, slowEMA)

if (buyCondition)
    strategy.entry("LongEntry", strategy.long)

if (sellCondition)
    strategy.close("LongEntry")
`;

export default function Strategies() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState(SAMPLE_PINE_SCRIPT);
  const [settings, setSettings] = useState<any>({ symbol: "SPY", fast_period: 9, slow_period: 21 });
  const [performance, setPerformance] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "settings" | "performance">("code");

  const loadStrategies = async () => {
    try {
      const list = await api.getStrategies();
      setStrategies(list);
      if (list.length > 0 && !selectedStrategy) {
        handleSelectStrategy(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStrategies();
  }, []);

  const handleSelectStrategy = async (strategy: any) => {
    setSelectedStrategy(strategy);
    setName(strategy.name);
    setDescription(strategy.description || "");
    setCode(strategy.pine_script || "");
    setSettings(strategy.settings || {});
    
    // Fetch performance data
    try {
      const stats = await api.getStrategyPerformance(strategy.id);
      setPerformance(stats);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await api.createStrategy(name, description, code, settings);
      alert("Pine Script Strategy Registered!");
      loadStrategies();
      handleSelectStrategy(created);
    } catch (err: any) {
      alert("Failed: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedStrategy) return;
    try {
      const updated = await api.updateStrategy(selectedStrategy.id, {
        name,
        description,
        pine_script: code,
        settings
      });
      alert("Strategy configuration saved! (Version " + updated.version + ")");
      loadStrategies();
      handleSelectStrategy(updated);
    } catch (err: any) {
      alert("Failed to update: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-semibold">Scanning pine repository...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Strategy Engine</h1>
        <p className="text-gray-400 font-semibold mt-1">Manage and audit TradingView Pine Script alerts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Strategy List & Creator */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-md font-black text-white mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              Active Profiles
            </h2>

            {strategies.length === 0 ? (
              <p className="text-xs text-gray-500 font-semibold text-center py-6">No strategies saved yet.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {strategies.map((strat) => {
                  const isSel = selectedStrategy?.id === strat.id;
                  return (
                    <button
                      key={strat.id}
                      onClick={() => handleSelectStrategy(strat)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 text-xs font-semibold ${
                        isSel 
                          ? "bg-indigo-600/25 border-indigo-500 text-white glow-purple"
                          : "bg-gray-900/40 border-gray-800 text-gray-400 hover:bg-gray-800/30 hover:text-white"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-extrabold text-sm">{strat.name}</span>
                        <span className="bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded-md font-bold">V{strat.version}</span>
                      </div>
                      <p className="text-gray-500 truncate max-w-[200px]">{strat.description || "No description"}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create strategy form */}
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-md font-black text-white mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-400 animate-pulse" />
              Import Strategy
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Strategy Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BTC Breakout"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short strategy explanation"
                  rows={2}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 text-xs flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                {creating ? "Uploading node..." : "Add New Profile"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Code Editor and Configurations */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            {/* Tabs Selector */}
            <div className="flex gap-4 border-b border-gray-800/80 pb-4 mb-6">
              <button
                onClick={() => setActiveTab("code")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "code" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Pine Script Code
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "settings" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Strategy Settings
              </button>
              <button
                onClick={() => setActiveTab("performance")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "performance" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Performance Summary
              </button>
            </div>

            {/* TAB: CODE */}
            {activeTab === "code" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-950 border border-gray-850 px-4 py-2 rounded-xl text-[11px] font-bold text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <FileCode2 className="h-4 w-4 text-orange-400" />
                    PineScript Editor (Read/Write)
                  </span>
                  <span>Active Profile: {name || "None"}</span>
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-900 rounded-xl p-4 font-mono text-xs text-indigo-200 focus:outline-none focus:border-indigo-500/50"
                  rows={15}
                  placeholder="Paste TradingView Pine Script here..."
                />
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="bg-gray-950/40 border border-gray-900 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-extrabold text-white">Default Symbol Parameters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Trading Symbol</label>
                      <input
                        type="text"
                        value={settings.symbol || "SPY"}
                        onChange={(e) => setSettings({ ...settings, symbol: e.target.value.toUpperCase() })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Fast Parameter</label>
                      <input
                        type="number"
                        value={settings.fast_period || 9}
                        onChange={(e) => setSettings({ ...settings, fast_period: parseInt(e.target.value) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Slow Parameter</label>
                      <input
                        type="number"
                        value={settings.slow_period || 21}
                        onChange={(e) => setSettings({ ...settings, slow_period: parseInt(e.target.value) || 0 })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PERFORMANCE */}
            {activeTab === "performance" && (
              <div className="space-y-6">
                {performance ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-950/40 border border-gray-900 rounded-2xl p-4 text-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Trades Run</span>
                      <h4 className="text-xl font-extrabold text-white">{performance.total_trades}</h4>
                    </div>
                    <div className="bg-gray-950/40 border border-gray-900 rounded-2xl p-4 text-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Win Rate</span>
                      <h4 className="text-xl font-extrabold text-emerald-400">{(performance.win_rate * 100).toFixed(1)}%</h4>
                    </div>
                    <div className="bg-gray-950/40 border border-gray-900 rounded-2xl p-4 text-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Profit Factor</span>
                      <h4 className="text-xl font-extrabold text-indigo-400">{performance.profit_factor.toFixed(2)}</h4>
                    </div>
                    <div className="bg-gray-950/40 border border-gray-900 rounded-2xl p-4 text-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Net PnL</span>
                      <h4 className={`text-xl font-extrabold ${performance.net_profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        ${performance.net_profit.toFixed(2)}
                      </h4>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs font-semibold text-gray-500">
                    No performance logs. Open trades on paper broker to view live telemetry.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-gray-800/80 flex justify-end gap-3">
            <button
              onClick={handleUpdate}
              disabled={!selectedStrategy}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all duration-200 hover:scale-[1.02] disabled:opacity-50"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
