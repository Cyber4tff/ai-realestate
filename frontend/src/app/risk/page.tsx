"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Save, 
  Clock, 
  Settings, 
  FileText,
  AlertTriangle
} from "lucide-react";

export default function RiskRules() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);

  // Form Fields
  const [dailyLimit, setDailyLimit] = useState(5000);
  const [trailingLimit, setTrailingLimit] = useState(10000);
  const [maxContracts, setMaxContracts] = useState(5);
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  const [cooldown, setCooldown] = useState(5);
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(24);
  const [isLocked, setIsLocked] = useState(false);

  const loadData = async () => {
    try {
      const summary = await api.getDashboardSummary();
      const actId = summary.account.id;
      setAccountId(actId);

      const r = await api.getRiskRules(actId);
      setRules(r);
      setDailyLimit(r.daily_drawdown_limit);
      setTrailingLimit(r.trailing_drawdown_limit);
      setMaxContracts(r.max_contracts);
      setMaxConcurrent(r.max_concurrent_trades);
      setCooldown(r.cooldown_period_minutes);
      setStartHour(r.session_start_hour);
      setEndHour(r.session_end_hour);
      setIsLocked(r.is_locked);

      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error("Failed to load risk rules data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (!accountId) return;
    try {
      const updated = await api.updateRiskRules(accountId, {
        daily_drawdown_limit: dailyLimit,
        trailing_drawdown_limit: trailingLimit,
        max_contracts: maxContracts,
        max_concurrent_trades: maxConcurrent,
        cooldown_period_minutes: cooldown,
        session_start_hour: startHour,
        session_end_hour: endHour,
        is_locked: isLocked
      });
      setRules(updated);
      alert("Pre-Trade Risk Guidelines Secured!");
      loadData();
    } catch (err: any) {
      alert("Failed to save rules: " + err.message);
    }
  };

  const handleToggleLock = async () => {
    if (!accountId) return;
    const targetStatus = !isLocked;
    const actionStr = targetStatus ? "LOCK" : "UNLOCK";
    if (!confirm(`Are you sure you want to manually ${actionStr} trading execution for this node?`)) return;
    
    try {
      await api.toggleAccountLock(accountId, targetStatus);
      setIsLocked(targetStatus);
      alert(`Account manual status updated to: ${actionStr}ED.`);
      loadData();
    } catch (err: any) {
      alert("Operation failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-semibold">Retrieving security rules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Risk Controller</h1>
        <p className="text-gray-400 font-semibold mt-1">Pre-trade check settings and emergency circuit breakers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Edit Rules */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-gray-800/80 pb-4">
            <h2 className="text-md font-black text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-400" />
              Pre-Trade Rule Configurations
            </h2>
            
            {/* Kill Switch Toggle */}
            <button
              onClick={handleToggleLock}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                isLocked 
                  ? "bg-rose-950/45 border border-rose-500/30 text-rose-400 shadow-md shadow-rose-900/10" 
                  : "bg-emerald-950/45 border border-emerald-500/30 text-emerald-400"
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="h-4 w-4" />
                  Locked (Un-halt)
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 animate-pulse" />
                  Active (Emergency Lock)
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
            {/* Daily Drawdown Limit */}
            <div>
              <label className="block text-gray-400 uppercase tracking-wider mb-2">Daily Drawdown limit ($)</label>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white"
              />
              <span className="text-[10px] text-gray-500 block mt-1.5 leading-normal">Manually lock the account if daily losses exceed this amount.</span>
            </div>

            {/* Trailing Drawdown Limit */}
            <div>
              <label className="block text-gray-400 uppercase tracking-wider mb-2">Max Trailing Drawdown ($)</label>
              <input
                type="number"
                value={trailingLimit}
                onChange={(e) => setTrailingLimit(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white"
              />
              <span className="text-[10px] text-gray-500 block mt-1.5 leading-normal">Trails the highest recorded balance point of the account.</span>
            </div>

            {/* Max Position size (Contracts) */}
            <div>
              <label className="block text-gray-400 uppercase tracking-wider mb-2">Max Order Contract Size</label>
              <input
                type="number"
                value={maxContracts}
                onChange={(e) => setMaxContracts(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white"
              />
              <span className="text-[10px] text-gray-500 block mt-1.5 leading-normal">Maximum open size permitted on a single trade symbol.</span>
            </div>

            {/* Max Concurrent positions */}
            <div>
              <label className="block text-gray-400 uppercase tracking-wider mb-2">Max Concurrent Trades</label>
              <input
                type="number"
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white"
              />
              <span className="text-[10px] text-gray-500 block mt-1.5 leading-normal">Halt order placing if this many positions are already open.</span>
            </div>

            {/* Cooldown period */}
            <div>
              <label className="block text-gray-400 uppercase tracking-wider mb-2">Order Cooldown Time (Minutes)</label>
              <input
                type="number"
                value={cooldown}
                onChange={(e) => setCooldown(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white"
              />
              <span className="text-[10px] text-gray-500 block mt-1.5 leading-normal">Minimum elapsed time between opening consecutive positions.</span>
            </div>

            {/* Trading Sessions */}
            <div>
              <label className="block text-gray-400 uppercase tracking-wider mb-2">Session Filters (Hour bounds UTC)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={startHour}
                  onChange={(e) => setStartHour(parseInt(e.target.value) || 0)}
                  placeholder="Start"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white text-center"
                />
                <span className="text-gray-600">to</span>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={endHour}
                  onChange={(e) => setEndHour(parseInt(e.target.value) || 0)}
                  placeholder="End"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white text-center"
                />
              </div>
              <span className="text-[10px] text-gray-500 block mt-1.5 leading-normal">Hours active window. e.g. 0 to 24 permits round-the-clock trading.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800/80 flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all duration-200 hover:scale-[1.02]"
            >
              <Save className="h-4 w-4" />
              Secure Risk Configurations
            </button>
          </div>
        </div>

        {/* Right Sidebar: Security Logs / Audit logs */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col h-[500px]">
          <h2 className="text-md font-black text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            Node Security Audit Log
          </h2>

          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-xs font-semibold text-gray-500 my-auto">
              No audit logs captured.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {auditLogs.map((log) => {
                const isBreach = log.action === "RISK_LIMIT_BREACH" || log.action === "ACCOUNT_LOCKED" || log.action === "TRADE_REJECTED";
                return (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded-xl border font-semibold ${
                      isBreach 
                        ? "bg-rose-950/20 border-rose-900/50 text-rose-300" 
                        : "bg-gray-950/40 border-gray-900 text-gray-400"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1 text-[10px] font-bold">
                      <span className={isBreach ? "text-rose-400" : "text-indigo-400"}>{log.action}</span>
                      <span className="text-gray-600 font-semibold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="leading-normal">{log.details}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
