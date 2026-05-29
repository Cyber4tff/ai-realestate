"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Terminal, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Copy, 
  ShieldCheck,
  Code
} from "lucide-react";

export default function WebhookLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = "http://localhost:8000/api/v1/webhooks/tradingview";
  const examplePayload = `{
  "secret": "quantflow_webhook_secret_key_123",
  "action": "buy",
  "symbol": "SPY",
  "qty": 2.0,
  "price": 455.50,
  "strategy_name": "Ema Crossover Custom Strategy"
}`;

  const fetchLogs = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await api.getWebhookLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => fetchLogs(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-semibold">Tuning webhook listener...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Webhook Ingestion</h1>
          <p className="text-gray-400 font-semibold mt-1">Receive signals from TradingView alerts and trigger execution</p>
        </div>
        <button 
          onClick={() => fetchLogs(true)} 
          disabled={refreshing}
          className="p-3 bg-gray-900/60 hover:bg-gray-800/85 border border-gray-850 rounded-xl transition-all duration-200 text-gray-400 hover:text-white"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webhook Configuration Guide */}
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <h2 className="text-md font-black text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            Ingress Settings
          </h2>

          <div className="space-y-4 text-xs font-semibold">
            <div>
              <span className="text-gray-400 uppercase tracking-widest text-[9px] block mb-1.5 font-bold">TradingView Webhook URL</span>
              <div className="flex bg-gray-950 border border-gray-900 rounded-xl px-3 py-2.5 items-center justify-between">
                <code className="text-indigo-300 font-mono text-[10px] truncate max-w-[200px]">{webhookUrl}</code>
                <button 
                  onClick={handleCopyUrl}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {copied && <span className="text-[10px] text-emerald-400 font-bold mt-1 block">Copied link to clipboard!</span>}
            </div>

            <div>
              <span className="text-gray-400 uppercase tracking-widest text-[9px] block mb-1.5 font-bold">Webhook Security Secret</span>
              <div className="bg-gray-950 border border-gray-900 rounded-xl px-3 py-2.5">
                <code className="text-cyan-400 font-mono text-[10px]">quantflow_webhook_secret_key_123</code>
              </div>
            </div>

            <div>
              <span className="text-gray-400 uppercase tracking-widest text-[9px] block mb-1.5 font-bold">Payload format (JSON)</span>
              <pre className="bg-gray-950 border border-gray-900 rounded-xl p-3.5 font-mono text-[10px] text-gray-400 overflow-x-auto">
                {examplePayload}
              </pre>
            </div>
          </div>
        </div>

        {/* Live Signal Feed Logs */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
          <h2 className="text-md font-black text-white mb-4 flex items-center gap-2">
            <Terminal className="h-5 w-5 text-indigo-400" />
            Live Inbound Signals Feed
          </h2>

          {logs.length === 0 ? (
            <div className="text-center py-10 text-xs font-semibold text-gray-500">
              No alert logs captured. Send alerts from TradingView to test ingestion.
            </div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800/80 font-bold uppercase tracking-wider">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Symbol</th>
                    <th className="pb-3">Action</th>
                    <th className="pb-3">Verification</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isSucc = log.status === "SUCCESS";
                    const isErr = log.status === "ERROR" || log.status === "REJECTED";
                    
                    return (
                      <tr key={log.id} className="border-b border-gray-850/40 hover:bg-gray-800/10 font-medium">
                        <td className="py-3 text-gray-400">{new Date(log.received_at).toLocaleString()}</td>
                        <td className="py-3 text-white font-extrabold">{log.payload.symbol}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase ${log.payload.action === "buy" ? "bg-emerald-950/40 text-emerald-400" : "bg-rose-950/40 text-rose-400"}`}>
                            {log.payload.action}
                          </span>
                        </td>
                        <td className="py-3">
                          {log.signature_valid ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Encrypted Signature Verified
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <XCircle className="h-3 w-3" /> Signature Verification Error
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSucc 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : isErr 
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                : "bg-gray-500/10 text-gray-400"
                          }`}>
                            {log.status}
                          </span>
                          {log.error_message && (
                            <span className="text-[10px] text-rose-400 font-semibold block mt-1 leading-normal">Err: {log.error_message}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
