"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { 
  Cpu, 
  Play, 
  HelpCircle, 
  Award, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Code,
  ArrowUpRight
} from "lucide-react";

export default function AIResearch() {
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState("");
  const [auditResult, setAuditResult] = useState<any>(null);
  const [optResult, setOptResult] = useState<any>(null);
  const [activeMode, setActiveMode] = useState<"audit" | "optimize">("audit");

  const handleAudit = async () => {
    if (!script) {
      alert("Please paste a Pine Script code block first.");
      return;
    }
    setLoading(true);
    setAuditResult(null);
    try {
      const res = await api.auditScript(script);
      setAuditResult(res);
    } catch (err: any) {
      alert("Audit failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    setOptResult(null);
    try {
      // Optimize a default EMA strategy
      const res = await api.optimizeParams("SPY", "ema_crossover", {
        fast_period: 9,
        slow_period: 21,
        symbol: "SPY",
        trade_size: 1.0
      });
      setOptResult(res.recommendations);
    } catch (err: any) {
      alert("Optimization failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-indigo-400 animate-pulse glow-purple" />
          AI Research Node
        </h1>
        <p className="text-gray-400 font-semibold mt-1">Audit Pine Script strategies and run localized grid param optimization</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Script Input Form */}
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <div className="flex gap-4 border-b border-gray-800/80 pb-4">
            <button
              onClick={() => setActiveMode("audit")}
              className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                activeMode === "audit" ? "text-indigo-400 border-b-2 border-indigo-500 pb-2" : "text-gray-500 hover:text-gray-300 pb-2"
              }`}
            >
              Auditor
            </button>
            <button
              onClick={() => setActiveMode("optimize")}
              className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                activeMode === "optimize" ? "text-indigo-400 border-b-2 border-indigo-500 pb-2" : "text-gray-500 hover:text-gray-300 pb-2"
              }`}
            >
              Optimizer
            </button>
          </div>

          {activeMode === "audit" ? (
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Paste Pine Script strategy</span>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="//@version=5&#10;strategy('My Strategy'...)&#10;// code here..."
                rows={12}
                className="w-full bg-gray-950 border border-gray-900 rounded-xl p-4 font-mono text-xs text-indigo-200 focus:outline-none focus:border-indigo-500/50"
              />
              <button
                onClick={handleAudit}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200 text-xs flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Cpu className="h-4 w-4" />
                    Analyze Code Integrity
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-xs font-semibold">
              <p className="text-gray-400 leading-normal">
                Optimize SMA/EMA Crossover parameters on SPY. Runs a grid sweep evaluating 16 combinations, ranking them by Monte Carlo pass probability.
              </p>
              <button
                onClick={handleOptimize}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200 text-xs flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Sweep Parameters
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Audit / Optimization Reports */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
          {/* Audit Results View */}
          {activeMode === "audit" && (
            <div className="space-y-6 h-full flex flex-col justify-center">
              {auditResult ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Audit Score Header */}
                  <div className="flex justify-between items-center bg-gray-950/40 border border-gray-900 rounded-2xl p-5">
                    <div>
                      <h3 className="text-sm font-extrabold text-white">Analysis Node Rating</h3>
                      <p className="text-xs text-gray-500 mt-1 font-semibold">Syntax compatibility and execution checks</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="h-16 w-16 bg-indigo-500/10 border-2 border-indigo-500 rounded-full flex items-center justify-center text-xl font-black text-indigo-400 glow-purple">
                        {auditResult.audit_score}
                      </div>
                    </div>
                  </div>

                  {/* Vulnerabilities and Suggestions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-rose-950/10 border border-rose-900/30 rounded-2xl p-5 space-y-3">
                      <h4 className="font-extrabold text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                        Identified Logical Vulnerabilities
                      </h4>
                      <ul className="space-y-2 list-disc list-inside text-gray-400 font-medium">
                        {auditResult.vulnerabilities.map((v: string, i: number) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-emerald-950/10 border border-emerald-900/30 rounded-2xl p-5 space-y-3">
                      <h4 className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        Refactoring Suggestions
                      </h4>
                      <ul className="space-y-2 list-disc list-inside text-gray-400 font-medium">
                        {auditResult.suggestions.map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-xs font-semibold text-gray-500">
                  Paste script code on the left and run analysis to compile audit.
                </div>
              )}
            </div>
          )}

          {/* Optimizer Results View */}
          {activeMode === "optimize" && (
            <div className="space-y-6">
              {optResult ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h3 className="text-sm font-extrabold text-white">Recommended Optimized Configurations</h3>
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-800/80 font-bold uppercase tracking-wider">
                          <th className="pb-3">Rank</th>
                          <th className="pb-3">Parameters</th>
                          <th className="pb-3">Backtest Return</th>
                          <th className="pb-3">Sharpe</th>
                          <th className="pb-3">MC Pass Probability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {optResult.map((run: any, index: number) => (
                          <tr key={index} className="border-b border-gray-850/40 hover:bg-gray-800/10 font-medium">
                            <td className="py-3.5 text-white font-extrabold">#{index + 1}</td>
                            <td className="py-3.5">
                              <span className="font-mono text-cyan-400 bg-gray-950 border border-gray-900 px-2 py-1 rounded">
                                Fast: {run.parameters.fast_period}, Slow: {run.parameters.slow_period}
                              </span>
                            </td>
                            <td className="py-3.5 text-emerald-400 font-bold">+{(run.total_return_pct * 100).toFixed(1)}%</td>
                            <td className="py-3.5 text-gray-300">{run.sharpe_ratio?.toFixed(2)}</td>
                            <td className="py-3.5 text-indigo-400 font-black">{(run.probability_pass * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-xs font-semibold text-gray-500">
                  Press Sweep Parameters to run optimization sweep.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
