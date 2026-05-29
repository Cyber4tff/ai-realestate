"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  Key, 
  Plus, 
  ShieldAlert, 
  Activity, 
  CheckCircle, 
  XCircle,
  HelpCircle,
  TrendingUp,
  Cpu
} from "lucide-react";

export default function BrokerHub() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [brokerName, setBrokerName] = useState("alpaca");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [environment, setEnvironment] = useState("paper");

  const loadConnections = async () => {
    try {
      const data = await api.getBrokers();
      setConnections(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveBroker(brokerName, apiKey, secretKey, environment);
      alert(`${brokerName.toUpperCase()} connection keys saved (AES-256 Encrypted)!`);
      setApiKey("");
      setSecretKey("");
      loadConnections();
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (id: number) => {
    try {
      const res = await api.testBroker(id);
      if (res.is_connected) {
        alert("Connection ping succeeded!");
      } else {
        alert("Ping failed: Verify key format and permissions.");
      }
      loadConnections();
    } catch (err: any) {
      alert("Verification error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-semibold">Scanning encrypted vault keys...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Broker Connections</h1>
        <p className="text-gray-400 font-semibold mt-1">Configure and monitor API links to live execution houses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Save API credentials */}
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <h2 className="text-md font-black text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-400" />
            Connect Broker Node
          </h2>

          <div className="p-4 bg-indigo-950/20 border border-indigo-900/50 rounded-2xl flex gap-3 text-xs font-semibold text-indigo-300 leading-normal">
            <ShieldAlert className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              Your API and secret keys are encrypted at rest using AES-256 (Fernet) keys. They are decrypted in-memory only when sending orders.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Brokerage Platform</label>
              <select
                value={brokerName}
                onChange={(e) => setBrokerName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white"
              >
                <option value="alpaca">Alpaca Securities</option>
                <option value="tradovate">Tradovate Futures</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">API Key</label>
              <input
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AKP..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Secret Key</label>
              <input
                type="password"
                required
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Network Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white"
              >
                <option value="paper">Paper Trading / Sandbox</option>
                <option value="live">Live Accounts Production</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200 text-xs flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              {saving ? "Saving keys..." : "Register API Credentials"}
            </button>
          </form>
        </div>

        {/* Saved connection list */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
          <h2 className="text-md font-black text-white mb-4 flex items-center gap-2">
            <Key className="h-5 w-5 text-indigo-400" />
            Configured Credentials
          </h2>

          {connections.length === 0 ? (
            <div className="text-center py-10 text-xs font-semibold text-gray-500">
              No API credentials configured. Add Alpaca or Tradovate credentials on the left.
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((conn) => (
                <div key={conn.id} className="bg-gray-950/40 border border-gray-900 rounded-2xl p-5 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{conn.broker_name}</h3>
                    <div className="flex gap-4 mt-2 text-xs font-semibold text-gray-500">
                      <span>Env: <span className="text-gray-300 uppercase">{conn.environment}</span></span>
                      <span className="flex items-center gap-1">
                        Status:{" "}
                        {conn.is_connected ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Online
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" /> Pending Verification
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTestConnection(conn.id)}
                    className="px-4 py-2 border border-gray-800 hover:bg-gray-900 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all duration-200"
                  >
                    Test Latency Link
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
