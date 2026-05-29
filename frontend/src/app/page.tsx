"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { 
  Home, 
  Map, 
  Users, 
  Mail, 
  MessageSquare, 
  FileText, 
  Layers, 
  Activity, 
  Settings as SettingsIcon, 
  TrendingUp, 
  DollarSign, 
  ShieldAlert, 
  Percent, 
  RefreshCw, 
  Plus, 
  ArrowRight, 
  Sliders, 
  Eye, 
  CheckCircle, 
  Info,
  Calendar,
  AlertCircle,
  TrendingDown,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  Award
} from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [leadDetail, setLeadDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [runningAgent, setRunningAgent] = useState(false);
  const [reportSending, setReportSending] = useState(false);
  
  // Settings edit states
  const [settingsForm, setSettingsForm] = useState<any>({
    mode: "Autonomous",
    operator_email: "cyber4pf@gmail.com",
    resend_api_key: "",
    sendgrid_api_key: "",
    map_provider: "leaflet",
    is_active: true,
    acquisition_mode: "Fast Wholesale",
    confidence_threshold: 72,
    batchdata_api_key: "",
    propstream_api_key: "",
    clearbit_api_key: "",
    peopledatalabs_api_key: "",
    whitepages_api_key: "",
    regrid_api_key: "",
    attom_api_key: ""
  });
  
  // Simulation and action states inside detail modal
  const [simulatedReplyText, setSimulatedReplyText] = useState("");
  const [offerAmount, setOfferAmount] = useState(0);
  const [outreachStyle, setOutreachStyle] = useState("cash_offer");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const LRef = useRef<any>(null);

  // Fetch dashboard summary
  const fetchSummary = async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true);
    try {
      const res = await api.getRealEstateSummary();
      setData(res);
      if (res.settings) {
        setSettingsForm({
          mode: res.settings.mode,
          operator_email: res.settings.operator_email,
          resend_api_key: res.settings.resend_api_key || "", 
          sendgrid_api_key: res.settings.sendgrid_api_key || "",
          map_provider: res.settings.map_provider,
          is_active: res.settings.is_active,
          acquisition_mode: res.settings.acquisition_mode || "Fast Wholesale",
          confidence_threshold: res.settings.confidence_threshold || 72,
          batchdata_api_key: res.settings.batchdata_api_key || "",
          propstream_api_key: res.settings.propstream_api_key || "",
          clearbit_api_key: res.settings.clearbit_api_key || "",
          peopledatalabs_api_key: res.settings.peopledatalabs_api_key || "",
          whitepages_api_key: res.settings.whitepages_api_key || "",
          regrid_api_key: res.settings.regrid_api_key || "",
          attom_api_key: res.settings.attom_api_key || ""
        });
      }
    } catch (err) {
      console.error("Failed to load real estate summary", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(() => fetchSummary(true), 12000); 
    return () => clearInterval(interval);
  }, []);

  // Dynamically load Leaflet on client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((leaflet) => {
        LRef.current = leaflet;
        setLeafletLoaded(true);
      });
    }
  }, []);

  // Initialize and update Map when leaflet is loaded
  useEffect(() => {
    if (!leafletLoaded || !data || !mapContainerRef.current || activeTab !== "map") return;

    const L = LRef.current;
    
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (mapRef.current) {
      mapRef.current.remove();
    }

    const defaultCenter = [31.5, -101.0];
    mapRef.current = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 6,
      zoomControl: true
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapRef.current);

    const bounds = L.latLngBounds();

    // 1. Add Development Zones with Heatmap overlays
    data.zones?.forEach((z: any) => {
      const velocity = z.scores["Appreciation Velocity"] || 10.0;
      
      // Calculate heat color based on momentum velocity
      let heatColor = "#6366f1"; // indigo
      if (velocity >= 12.0) {
        heatColor = "#ef4444"; // red (very hot)
      } else if (velocity >= 9.0) {
        heatColor = "#f97316"; // orange (hot)
      }

      // Draw heat gradient circles representing development momentum
      L.circle([z.latitude, z.longitude], {
        color: heatColor,
        fillColor: heatColor,
        fillOpacity: 0.15,
        radius: 14000, 
        weight: 1
      }).addTo(mapRef.current);

      L.circle([z.latitude, z.longitude], {
        color: heatColor,
        fillColor: heatColor,
        fillOpacity: 0.05,
        radius: 25000,
        weight: 0
      }).addTo(mapRef.current);

      const zoneHtml = `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-xs font-black text-white glow-purple" style="box-shadow: 0 0 10px ${heatColor}80"><span style="color: ${heatColor}">🔥</span></div>`;
      const customIcon = L.divIcon({
        html: zoneHtml,
        className: "custom-div-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const popupContent = `
        <div style="background-color: #0f172a; color: white; padding: 10px; border-radius: 8px; border: 1px solid #334155; min-width: 210px;">
          <h4 style="font-weight: 950; margin: 0 0 5px 0; color: ${heatColor}; display: flex; align-items: center; gap: 4px;">
            <span>${z.name}</span>
          </h4>
          <p style="font-size: 11px; color: #94a3b8; margin: 0 0 8px 0;">${z.location}</p>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; border-top: 1px solid #1e293b; padding-top: 6px;">
            <div><strong>Velocity:</strong> <span style="color: #10b981; font-weight: bold;">+${velocity}% / year</span></div>
            <div><strong>Dev Momentum:</strong> ${z.scores["Growth Momentum"]}%</div>
            <div><strong>Investor Demand:</strong> ${z.scores["Investor Demand"]}%</div>
          </div>
        </div>
      `;

      L.marker([z.latitude, z.longitude], { icon: customIcon })
        .addTo(mapRef.current)
        .bindPopup(popupContent);
        
      bounds.extend([z.latitude, z.longitude]);
    });

    // 2. Add Lead markers with Tiers
    data.leads?.forEach((lead: any) => {
      if (lead.status === "Rejected") return; // exclude rejected lots from map view

      let tierColor = "#94a3b8"; // gray for C
      if (lead.scores?.["Acquisition Tier"] === "Tier S") {
        tierColor = "#ec4899"; // pink
      } else if (lead.scores?.["Acquisition Tier"] === "Tier A") {
        tierColor = "#6366f1"; // indigo
      } else if (lead.scores?.["Acquisition Tier"] === "Tier B") {
        tierColor = "#f59e0b"; // yellow
      }

      const leadHtml = `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-slate-950 border-2 text-[10px] font-black text-white shadow-lg shadow-black/80" style="border-color: ${tierColor}">${lead.score}</div>`;
      const customIcon = L.divIcon({
        html: leadHtml,
        className: "custom-div-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const popupContent = `
        <div style="background-color: #0f172a; color: white; padding: 10px; border-radius: 8px; border: 1px solid #334155; min-width: 230px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <h4 style="font-weight: 900; margin: 0;">${lead.address.split(',')[0]}</h4>
            <span style="font-size: 9px; font-weight: 900; background-color: ${tierColor}30; color: ${tierColor}; border: 1px solid ${tierColor}50; padding: 1px 4px; border-radius: 3px;">
              ${lead.scores?.["Acquisition Tier"] || "Tier B"}
            </span>
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin: 0 0 8px 0;">${lead.acreage} acres | ${lead.zoning}</p>
          <div style="font-size: 11px; margin-bottom: 8px; border-top: 1px solid #1e293b; padding-top: 6px;">
            <div><strong>Status:</strong> ${lead.status}</div>
            <div><strong>Spread Target:</strong> <span style="color: #10b981; font-weight: bold;">$${lead.wholesale_spread.toLocaleString()}</span></div>
          </div>
          <button id="btn-popup-${lead.id}" style="background-color: #4f46e5; color: white; border: none; padding: 6px 8px; font-weight: bold; font-size: 10px; border-radius: 6px; cursor: pointer; width: 100%;">
            Open Property Details
          </button>
        </div>
      `;

      const marker = L.marker([lead.latitude, lead.longitude], { icon: customIcon })
        .addTo(mapRef.current)
        .bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-popup-${lead.id}`);
        if (btn) {
          btn.onclick = () => {
            handleOpenLeadDetail(lead.id);
          };
        }
      });
        
      bounds.extend([lead.latitude, lead.longitude]);
    });

    if (data.leads?.length > 0 || data.zones?.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded, data, activeTab]);

  const handleOpenLeadDetail = async (id: number) => {
    setSelectedLeadId(id);
    setLoadingDetail(true);
    setActionSuccess(null);
    try {
      const res = await api.getLeadDetail(id);
      setLeadDetail(res);
      
      // Calculate smart offer dynamically if not set
      // Formula: Resale Value - Rehab - Buffer (10%) - Profit Margin (25%)
      const resale = res.lead.resale_value || 0;
      const rehab = res.lead.rehab_cost || 0;
      const buffer = resale * 0.1;
      const margin = resale * 0.25;
      const smartOffer = Math.max(0, Math.round(resale - rehab - buffer - margin));
      setOfferAmount(smartOffer);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseLeadDetail = () => {
    setSelectedLeadId(null);
    setLeadDetail(null);
  };

  const handleRunAgent = async () => {
    setRunningAgent(true);
    try {
      const res = await api.runAutonomousAgent();
      fetchSummary();
      alert(res.message);
    } catch (err: any) {
      alert("Agent run failed: " + err.message);
    } finally {
      setRunningAgent(false);
    }
  };

  const handleSendReport = async () => {
    setReportSending(true);
    try {
      const res = await api.generateManualReport();
      alert(`Upgraded Acquisition Report emailed successfully to ${res.sent_to} via ${res.service}.`);
    } catch (err: any) {
      alert("Failed to send report: " + err.message);
    } finally {
      setReportSending(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateRealEstateSettings(settingsForm);
      alert("Operator settings updated successfully!");
      fetchSummary();
    } catch (err: any) {
      alert("Failed to update settings: " + err.message);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!leadDetail) return;
    try {
      await api.updateLeadStatus(leadDetail.lead.id, newStatus);
      setActionSuccess(`Pipeline stage updated to: ${newStatus}`);
      const updated = await api.getLeadDetail(leadDetail.lead.id);
      setLeadDetail(updated);
      fetchSummary();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleGenerateOffer = async () => {
    if (!leadDetail) return;
    try {
      await api.generateOffer(leadDetail.lead.id, offerAmount);
      setActionSuccess(`Smart Contract offer generated for $${offerAmount.toLocaleString()}!`);
      const updated = await api.getLeadDetail(leadDetail.lead.id);
      setLeadDetail(updated);
      fetchSummary();
    } catch (err: any) {
      alert("Failed to generate contract: " + err.message);
    }
  };

  const handleSendOutreach = async () => {
    if (!leadDetail) return;
    try {
      const res = await api.sendOutreachEmail(leadDetail.lead.id, outreachStyle);
      setActionSuccess(`Outreach campaign dispatched via ${res.service}! CC sent to Operator.`);
      const updated = await api.getLeadDetail(leadDetail.lead.id);
      setLeadDetail(updated);
      fetchSummary();
    } catch (err: any) {
      alert("Failed to dispatch outreach: " + err.message);
    }
  };

  const handleSimulateReply = async () => {
    if (!leadDetail || !simulatedReplyText) return;
    try {
      await api.simulateReply(leadDetail.lead.id, simulatedReplyText);
      setActionSuccess("Seller response processed! Negotiation agent updated ranges.");
      setSimulatedReplyText("");
      const updated = await api.getLeadDetail(leadDetail.lead.id);
      setLeadDetail(updated);
      fetchSummary();
    } catch (err: any) {
      alert("Failed to post simulated reply: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-3">
        <div className="h-9 w-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-semibold tracking-wide">Connecting Acquisition Intelligence Engine...</p>
      </div>
    );
  }

  const kpis = data?.kpis || { total_leads: 0, active_outreach: 0, negotiations: 0, under_contract: 0, closed_deals: 0, total_acreage: 0, total_spread: 0 };
  const leads = data?.leads || [];
  const zones = data?.zones || [];
  const logs = data?.logs || [];
  const internal_listings = data?.internal_listings || [];
  const buyer_matches = data?.buyer_matches || [];

  const pipelineStages = [
    "Lead Found",
    "Owner Identified",
    "Outreach Sent",
    "Seller Responded",
    "Negotiation",
    "Offer Generated",
    "Under Contract",
    "Closed"
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">QuantFlow Real Estate Intelligence</span>
          </h1>
          <p className="text-gray-400 text-sm font-semibold mt-1">
            Institutional Land Acquisition Platform &bull; CC Operator: <span className="text-indigo-400 font-bold">{data?.settings?.operator_email || "cyber4pf@gmail.com"}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchSummary(true)} 
            disabled={refreshing}
            className="p-3 bg-gray-900/70 hover:bg-gray-800 border border-gray-800 rounded-xl transition-all duration-200 text-gray-400 hover:text-white disabled:opacity-50"
            title="Refresh dashboard state"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
          </button>
          
          <button 
            onClick={handleRunAgent}
            disabled={runningAgent}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-650 hover:bg-indigo-500 disabled:bg-indigo-850 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200 text-sm hover:scale-[1.02]"
          >
            <Activity className={`h-5 w-5 ${runningAgent ? "animate-pulse" : ""}`} />
            {runningAgent ? "Analyzing Growth Tiers..." : "Run Autonomous Cycle"}
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-800/80 gap-6">
        <button 
          onClick={() => setActiveTab("dashboard")} 
          className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 ${activeTab === "dashboard" ? "border-indigo-500 text-white" : "border-transparent text-gray-400 hover:text-gray-200"}`}
        >
          <Home className="h-4 w-4" /> Overview Summary
        </button>
        <button 
          onClick={() => setActiveTab("map")} 
          className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 ${activeTab === "map" ? "border-indigo-500 text-white" : "border-transparent text-gray-400 hover:text-gray-200"}`}
        >
          <Map className="h-4 w-4" /> Development Heatmap
        </button>
        <button 
          onClick={() => setActiveTab("pipeline")} 
          className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 ${activeTab === "pipeline" ? "border-indigo-500 text-white" : "border-transparent text-gray-400 hover:text-gray-200"}`}
        >
          <Layers className="h-4 w-4" /> CRM Pipeline
        </button>
        <button 
          onClick={() => setActiveTab("agents")} 
          className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 ${activeTab === "agents" ? "border-indigo-500 text-white" : "border-transparent text-gray-400 hover:text-gray-200"}`}
        >
          <SlidersHorizontal className="h-4 w-4" /> Targeting & AI Workspace
        </button>
      </div>

      {/* TABS CONTENT */}
      
      {/* 1. OVERVIEW TAB */}
      {activeTab === "dashboard" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Main KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel rounded-2xl p-6 flex items-center justify-between glow-cyan">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Acquisitions Scored</span>
                <h3 className="text-3xl font-black text-white mt-1">{leads.filter((l: any) => l.status !== "Rejected").length} Properties</h3>
                <span className="text-xs text-cyan-400 font-bold block mt-2">{kpis.total_acreage} Sourced Acres</span>
              </div>
              <div className="h-12 w-12 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center">
                <Layers className="h-6 w-6 text-cyan-400" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 flex items-center justify-between glow-purple">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Outreach Active</span>
                <h3 className="text-3xl font-black text-yellow-400 mt-1">{kpis.active_outreach} Sent</h3>
                <span className="text-xs text-gray-400 font-semibold block mt-2">Confidence Gated</span>
              </div>
              <div className="h-12 w-12 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-center">
                <Mail className="h-6 w-6 text-yellow-400" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 flex items-center justify-between glow-purple">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Negotiations</span>
                <h3 className="text-3xl font-black text-pink-400 mt-1">{kpis.negotiations} Deals</h3>
                <span className="text-xs text-pink-400 font-bold block mt-2">{kpis.under_contract} Under Contract</span>
              </div>
              <div className="h-12 w-12 bg-pink-500/10 border border-pink-500/30 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-pink-400" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 flex items-center justify-between glow-emerald">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Arbitrage Spread</span>
                <h3 className="text-3xl font-black text-emerald-400 mt-1">${kpis.total_spread?.toLocaleString()}</h3>
                <span className="text-xs text-emerald-400 font-bold block mt-2">{kpis.closed_deals} Closed Deals</span>
              </div>
              <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Alerts and Logs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Leads list with Priority Tiers */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black text-white">Acquisition Queue</h2>
                  <p className="text-gray-400 text-xs mt-0.5">High-probability land deals prioritized by weighted intelligence.</p>
                </div>
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                  Active Mode: <span className="bg-indigo-950 border border-indigo-900 px-2 py-0.5 rounded text-white font-extrabold">{settingsForm.acquisition_mode}</span>
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                      <th className="pb-3">Address</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3">Zoning</th>
                      <th className="pb-3 text-center">Score</th>
                      <th className="pb-3 text-center">Tier</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Offer Target</th>
                      <th className="pb-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/55 text-xs text-gray-300">
                    {leads.map((l: any) => {
                      const tier = l.scores?.["Acquisition Tier"] || "Tier B";
                      let tierClass = "bg-slate-800 text-gray-400 border-slate-700";
                      if (tier === "Tier S") tierClass = "bg-pink-500/10 text-pink-400 border-pink-500/30";
                      else if (tier === "Tier A") tierClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
                      else if (tier === "Tier B") tierClass = "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
                      else if (tier === "Tier C") tierClass = "bg-red-500/10 text-red-400 border-red-500/30";

                      return (
                        <tr key={l.id} className={`hover:bg-slate-900/40 ${l.status === "Rejected" ? "opacity-45" : ""}`}>
                          <td className="py-3.5 font-extrabold text-white truncate max-w-[140px]" title={l.address}>{l.address.split(',')[0]}</td>
                          <td className="py-3.5">{l.acreage} ac</td>
                          <td className="py-3.5 truncate max-w-[100px]">{l.zoning?.split(' ')[0]}</td>
                          <td className="py-3.5 text-center font-black text-white">{l.score}</td>
                          <td className="py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${tierClass}`}>
                              {tier}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${l.status === "Rejected" ? "bg-red-950/40 text-red-400 border border-red-900" : "bg-gray-900 text-gray-400 border border-gray-800"}`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right font-black text-emerald-400">${l.resale_value?.toLocaleString()}</td>
                          <td className="py-3.5 text-center">
                            <button 
                              onClick={() => handleOpenLeadDetail(l.id)}
                              className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-500 font-semibold">No properties in database. Run Autonomous cycle.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI activity feed & learning logs */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col h-[420px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-400 animate-pulse" /> Live Activity Feed
                </h2>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Realtime
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs scrollbar-thin">
                {logs.map((log: any) => (
                  <div key={log.id} className={`border-l-2 pl-3 py-1 hover:border-indigo-500 transition-colors ${log.log_level === "WARNING" ? "border-amber-500" : "border-slate-800"}`}>
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                      <span className={log.log_level === "WARNING" ? "text-amber-400" : "text-indigo-400"}>{log.agent_name}</span>
                      <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    <p className="text-gray-300 font-semibold mt-1 leading-relaxed">{log.message}</p>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-center text-gray-500 py-20 font-semibold">No logs in system. Run cycle.</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Suburbs appreciation cards & alerts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel rounded-2xl p-6 md:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-white">Growth Momentum Tracker</h2>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Early-Stage Markets</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {zones.map((z: any) => {
                  const vel = z.scores["Appreciation Velocity"] || 10.0;
                  return (
                    <div key={z.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4 relative overflow-hidden">
                      <div className="absolute top-2 right-2 flex items-center justify-center h-6 w-6 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black">
                        +{vel}%
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-sm truncate pr-6">{z.name.split(' ')[0]}</h4>
                        <p className="text-gray-400 text-[10px]">{z.location}</p>
                        <p className="text-gray-300 text-xs mt-2 line-clamp-2 leading-relaxed">{z.description}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-gray-500">Momentum Index:</span>
                        <span className="text-white">{z.scores["Growth Momentum"]}/100</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Market Expansion Alerts */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-indigo-400" /> Expansion Alerts
                </h2>
                <div className="space-y-3 mt-3">
                  <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 text-xs">
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 mb-1">
                      <span>BUCKEYE, AZ</span>
                      <span>ACTIVE</span>
                    </div>
                    <p className="text-gray-300 font-semibold leading-relaxed">Utility expansion corridor scheduled on West I-10 bypass. Rezoning approved.</p>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 text-xs">
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 mb-1">
                      <span>FORNEY, TX</span>
                      <span>MONITOR</span>
                    </div>
                    <p className="text-gray-300 font-semibold leading-relaxed">FSBO permit registry indicates surge in commercial parcel listings.</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleSendReport}
                disabled={reportSending}
                className="w-full py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
              >
                {reportSending ? "Dispatching summary..." : "Email Lead Report"}
              </button>
            </div>
          </div>

          {/* Internal Listings and Buyer Matches Queues */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Internal Listings Queue */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-black text-white">Internal AI Listings Queue</h2>
                <p className="text-gray-400 text-xs mt-0.5">High-confidence off-market opportunities generated internally. Not published publicly.</p>
              </div>
              <div className="overflow-x-auto max-h-[300px] scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                      <th className="pb-3">Address</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3">Zoning</th>
                      <th className="pb-3 text-center">ROI</th>
                      <th className="pb-3 text-center">Score</th>
                      <th className="pb-3">Target Type</th>
                      <th className="pb-3 text-right">Suggested Resale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/55 text-xs text-gray-300">
                    {internal_listings.map((lst: any) => (
                      <tr key={lst.id} className="hover:bg-slate-900/40">
                        <td className="py-3 font-extrabold text-white truncate max-w-[140px]" title={lst.address}>{lst.address.split(',')[0]}</td>
                        <td className="py-3">{lst.acreage} ac</td>
                        <td className="py-3 truncate max-w-[100px]">{lst.zoning}</td>
                        <td className="py-3 text-center font-black text-emerald-400">+{lst.estimated_roi}%</td>
                        <td className="py-3 text-center font-black text-white">{lst.acquisition_score}</td>
                        <td className="py-3">{lst.investor_target_type}</td>
                        <td className="py-3 text-right font-black text-indigo-300">${lst.suggested_resale_value?.toLocaleString()}</td>
                      </tr>
                    ))}
                    {internal_listings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500 font-semibold">No internal listings generated yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Buyer Match Queue */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col h-[380px]">
              <div className="mb-4">
                <h2 className="text-base font-black text-white">Buyer Match Queue</h2>
                <p className="text-gray-400 text-xs mt-0.5">Queued personalized outreach for matched institutional buyers.</p>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs scrollbar-thin">
                {buyer_matches.map((bm: any) => (
                  <div key={bm.id} className="border-l-2 border-indigo-500 pl-3 py-1 bg-slate-900/20 rounded">
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                      <span className="text-white font-extrabold">{bm.buyer_name}</span>
                      <span className="text-indigo-400">{bm.match_score}% Match</span>
                    </div>
                    <p className="text-gray-300 font-semibold mt-1">Property: {bm.address?.split(',')[0] || "Unknown"}</p>
                    <div className="flex justify-between items-center mt-2 text-[9px]">
                      <span className="text-gray-500">Criteria: {bm.matched_criteria?.join(', ')}</span>
                      <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-900 rounded font-black uppercase">
                        {bm.outreach_status}
                      </span>
                    </div>
                  </div>
                ))}
                {buyer_matches.length === 0 && (
                  <p className="text-center text-gray-500 py-20 font-semibold">No buyer matches found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. GIS MAP TAB */}
      {activeTab === "map" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-base font-black text-white">GIS Map Overlay</h3>
                <p className="text-gray-400 text-xs">Dynamic heatmap overlay. Circles represent appreciation momentum corridors.</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span> Tier S</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Tier A</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Tier B</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> Heat Zone</div>
              </div>
            </div>
            
            <div 
              ref={mapContainerRef} 
              className="w-full h-[550px] rounded-xl border border-gray-800/80 overflow-hidden shadow-inner" 
              style={{ background: "#0c101b" }}
            />
          </div>
        </div>
      )}

      {/* 3. PIPELINE CRM TAB */}
      {activeTab === "pipeline" && (
        <div className="space-y-4 overflow-x-auto pb-4 animate-in fade-in duration-200">
          <div className="min-w-[1200px] flex gap-4 pr-4">
            {pipelineStages.map((stage) => {
              const stageLeads = leads.filter((l: any) => l.status === stage);
              
              return (
                <div key={stage} className="flex-1 min-w-[240px] max-w-[280px] bg-slate-950/40 border border-slate-900 rounded-2xl p-4 flex flex-col h-[600px]">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3">
                    <span className="text-xs font-black text-white tracking-wide">{stage}</span>
                    <span className="bg-slate-900 border border-slate-800 text-gray-400 px-2 py-0.5 rounded text-[10px] font-bold">
                      {stageLeads.length}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 scrollbar-none pr-1">
                    {stageLeads.map((l: any) => {
                      const tier = l.scores?.["Acquisition Tier"] || "Tier B";
                      let tierBorderColor = "border-slate-800/80";
                      if (tier === "Tier S") tierBorderColor = "border-pink-500/40";
                      else if (tier === "Tier A") tierBorderColor = "border-indigo-500/40";
                      else if (tier === "Tier B") tierBorderColor = "border-yellow-500/40";

                      return (
                        <div 
                          key={l.id} 
                          onClick={() => handleOpenLeadDetail(l.id)}
                          className={`bg-slate-900/60 hover:bg-slate-900 border ${tierBorderColor} rounded-xl p-3.5 cursor-pointer transition-all hover:translate-y-[-2px] space-y-3`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-extrabold text-white text-xs truncate max-w-[160px]" title={l.address}>
                              {l.address.split(',')[0]}
                            </h4>
                            <span className="text-[9px] font-black text-indigo-300 bg-indigo-950/50 border border-indigo-900 px-1.5 py-0.5 rounded">
                              {l.score}
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-gray-400 space-y-1">
                            <div>Size: {l.acreage} acres</div>
                            <div>Tier: <span className="text-white font-extrabold">{tier}</span></div>
                            <div>Spread: <span className="text-emerald-400 font-extrabold">${l.wholesale_spread?.toLocaleString()}</span></div>
                          </div>
                          
                          <div className="flex justify-between items-center text-[9px] text-gray-500 pt-2 border-t border-slate-900">
                            <span>{l.zoning?.split(' ')[0]}</span>
                            <span className="italic">{l.source?.split(' ')[0] || "Off-Market"}</span>
                          </div>
                        </div>
                      );
                    })}
                    {stageLeads.length === 0 && (
                      <div className="text-center py-16 text-[10px] text-gray-600 font-medium">No leads in stage</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. AI WORKSPACE & SETTINGS TAB */}
      {activeTab === "agents" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-200">
          
          {/* Agent Registry Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-black text-white">Acquisition Agents Console</h2>
                <p className="text-gray-400 text-xs mt-0.5">Scoring rules, Comparable Market Analysis (CMA), and rejection logic are configured locally.</p>
              </div>
              
              <div className="space-y-4">
                {[
                  { name: "Scout Agent", description: "Identifies off-market vacant tracts in Forney, Austin, and Buckeye using county records and permit registries.", focus: "County records parsing", status: "Active" },
                  { name: "Development Intelligence Agent", description: "Performs road expansion, logistic permit, and economic indicator checking to calculate growth momentum.", focus: "Buckeye logictics corridors", status: "Active" },
                  { name: "Land Discovery Agent & Utility Audit", description: "Gathers road access easements, utility metrics, and terrain slopes. Rejects impossible zoning.", focus: "Flood plain mapping overlays", status: "Active" },
                  { name: "CMA Arbitrage Agent", description: "Runs Comparable Market Analysis. Calculates average price per acre, resale bounds, and rejects low margins.", focus: "Comparative pricing models", status: "Active" },
                  { name: "Owner Discovery (OSINT)", description: "Performs public deeds lookups, LLC business managers tracking, and public records sourcing.", focus: "LLC registration tracking", status: "Active" },
                  { name: "Smart Outreach Agent", description: "Personalizes outreach proposals detailing local growth velocity and outstanding county back taxes.", focus: "Awaiting cycle triggers", status: "Idle" },
                  { name: "Negotiation Agent", description: "Examines seller answers for motivation triggers, debt flags, and recommends offer contract guidelines.", focus: "Idle", status: "Idle" }
                ].map((a, idx) => (
                  <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-white text-sm">{a.name}</h4>
                      <p className="text-gray-400 text-xs mt-0.5">{a.description}</p>
                      <p className="text-[10px] text-gray-500 font-semibold mt-2">
                        Focus: <span className="text-indigo-400">{a.focus}</span>
                      </p>
                    </div>
                    
                    <div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${a.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-gray-400 border border-slate-700"}`}>
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="glass-panel rounded-2xl p-6 h-fit space-y-6">
            <div>
              <h2 className="text-base font-black text-white">Targeting & Filters</h2>
              <p className="text-gray-400 text-xs mt-0.5">Customize AI targeting filters and confidence thresholds.</p>
            </div>
            
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Acquisition Targeting Mode</label>
                <select 
                  value={settingsForm.acquisition_mode}
                  onChange={(e) => setSettingsForm({ ...settingsForm, acquisition_mode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="Fast Wholesale">Fast Wholesale (Targets liquidity & fast flip)</option>
                  <option value="Deep Value">Deep Value (High tax delinquents & distress)</option>
                  <option value="Development Land">Development Land (LI zoning & road hubs)</option>
                  <option value="Rural Expansion">Rural Expansion (Undeveloped edge suburbs)</option>
                  <option value="Long-Term Appreciation">Long-Term Appreciation (High growth momentum)</option>
                  <option value="High-Liquidity Flip">High-Liquidity Flip (Residential lots)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">AI Confidence Gating ({settingsForm.confidence_threshold}/100)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="40" 
                    max="90" 
                    value={settingsForm.confidence_threshold}
                    onChange={(e) => setSettingsForm({ ...settingsForm, confidence_threshold: Number(e.target.value) })}
                    className="flex-1 accent-indigo-500 cursor-pointer bg-slate-900 rounded-lg h-2 border border-slate-800"
                  />
                  <span className="text-sm font-black text-white bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
                    {settingsForm.confidence_threshold}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                  The system will automatically skip outbound outreach campaigns for leads scoring below this threshold.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">System Routing Mode</label>
                <select 
                  value={settingsForm.mode}
                  onChange={(e) => setSettingsForm({ ...settingsForm, mode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-xs focus:outline-none"
                >
                  <option value="Manual">Manual Approval Required</option>
                  <option value="Assisted">Assisted (Drafts ready for approval)</option>
                  <option value="Autonomous">Autonomous (AI dispatches emails instantly)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Operator Notification CC</label>
                <input 
                  type="email"
                  value={settingsForm.operator_email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, operator_email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">Outbound Outreach Credentials</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Resend API Key</label>
                    <input 
                      type="password"
                      value={settingsForm.resend_api_key}
                      onChange={(e) => setSettingsForm({ ...settingsForm, resend_api_key: e.target.value })}
                      placeholder="re_..."
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">SendGrid API Key</label>
                    <input 
                      type="password"
                      value={settingsForm.sendgrid_api_key}
                      onChange={(e) => setSettingsForm({ ...settingsForm, sendgrid_api_key: e.target.value })}
                      placeholder="SG...."
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">Paid OSINT Skip Tracing Keys (Optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">BatchData API Key</label>
                    <input 
                      type="password"
                      value={settingsForm.batchdata_api_key}
                      onChange={(e) => setSettingsForm({ ...settingsForm, batchdata_api_key: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">PropStream API Key</label>
                    <input 
                      type="password"
                      value={settingsForm.propstream_api_key}
                      onChange={(e) => setSettingsForm({ ...settingsForm, propstream_api_key: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Clearbit API Key</label>
                    <input 
                      type="password"
                      value={settingsForm.clearbit_api_key}
                      onChange={(e) => setSettingsForm({ ...settingsForm, clearbit_api_key: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">PeopleDataLabs Key</label>
                    <input 
                      type="password"
                      value={settingsForm.peopledatalabs_api_key}
                      onChange={(e) => setSettingsForm({ ...settingsForm, peopledatalabs_api_key: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Whitepages API Key</label>
                    <input 
                      type="password"
                      value={settingsForm.whitepages_api_key}
                      onChange={(e) => setSettingsForm({ ...settingsForm, whitepages_api_key: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Regrid API Key</label>
                    <input 
                      type="password"
                      value={settingsForm.regrid_api_key}
                      onChange={(e) => setSettingsForm({ ...settingsForm, regrid_api_key: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">ATTOM Data API Key</label>
                    <input 
                      type="password"
                      value={settingsForm.attom_api_key}
                      onChange={(e) => setSettingsForm({ ...settingsForm, attom_api_key: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-650 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition"
                >
                  Save Configurations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD DETAIL MODAL */}
      {selectedLeadId !== null && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 relative scrollbar-thin">
            
            <button 
              onClick={handleCloseLeadDetail}
              className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl font-bold bg-slate-900 border border-slate-800 p-1.5 rounded-lg transition"
            >
              &times;
            </button>

            {loadingDetail ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 text-xs">Querying Property OSINT Database...</p>
              </div>
            ) : leadDetail ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-950/40 border border-indigo-900 px-2.5 py-1 rounded-full">
                      Lead ID: #{leadDetail.lead.id}
                    </span>
                    <h2 className="text-2xl font-black text-white mt-2">{leadDetail.lead.address}</h2>
                  </div>
                  
                  {/* Acquisition Tier Badge */}
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs font-bold">Deal Tier Ranking:</span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-black border ${leadDetail.lead.scores?.["Acquisition Tier"] === "Tier S" ? "bg-pink-500/10 text-pink-400 border-pink-500/30" : leadDetail.lead.scores?.["Acquisition Tier"] === "Tier A" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"}`}>
                      {leadDetail.lead.scores?.["Acquisition Tier"] || "Tier B"}
                    </span>
                    <span className="text-gray-400 text-xs font-bold">
                      AI Acquisition Confidence: <span className="text-white font-extrabold">{leadDetail.lead.scores?.["AI Confidence"] || leadDetail.lead.scores?.["Confidence Score"] || 0}%</span>
                    </span>
                  </div>
                </div>

                {actionSuccess && (
                  <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> {actionSuccess}
                  </div>
                )}

                {/* Main Split Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Left Column: Characteristics & Owner */}
                  <div className="space-y-6">
                    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-4">
                      <h3 className="font-extrabold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-indigo-400" /> Utility & Land Feasibility
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500 block">Acreage</span>
                          <span className="text-white font-bold">{leadDetail.lead.acreage} ac</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Zoning Code</span>
                          <span className="text-white font-bold">{leadDetail.lead.zoning}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Utilities Sourced</span>
                          <span className="text-white font-bold">{leadDetail.lead.utility_access}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Road Access</span>
                          <span className="text-white font-bold">{leadDetail.lead.road_access}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Topography</span>
                          <span className="text-white font-bold">{leadDetail.lead.terrain}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Flood Risk</span>
                          <span className="text-white font-bold">{leadDetail.lead.flood_risk}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Source Sourced</span>
                          <span className="text-white font-bold">{leadDetail.lead.source}</span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-800 text-xs">
                        <span className="text-gray-500 block mb-1">CMA & Feasibility Notes</span>
                        <p className="text-gray-300 bg-slate-950/40 p-2.5 rounded border border-slate-950 font-semibold">{leadDetail.lead.notes}</p>
                      </div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-4">
                      <h3 className="font-extrabold text-white text-sm border-b border-slate-800 pb-2 flex items-center justify-between">
                        <span>OSINT Owner Intelligence</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Public Records</span>
                      </h3>
                      {leadDetail.owners?.map((owner: any) => {
                        const isUnverified = owner.name === "UNVERIFIED" || owner.name === "No Verified Contact Found" || !owner.name;
                        
                        let classificationClass = "bg-slate-900 text-gray-400 border-slate-800";
                        if (owner.contact_classification === "Verified Email") classificationClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        else if (owner.contact_classification === "Likely Email") classificationClass = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
                        else if (owner.contact_classification === "Business Contact") classificationClass = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                        else if (owner.contact_classification === "Mailing Address Only") classificationClass = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
                        else if (owner.contact_classification === "No Contact Found" || owner.contact_classification === "UNVERIFIED") classificationClass = "bg-red-500/10 text-red-400 border-red-500/20";

                        const lastVerified = owner.verification_timestamp 
                          ? owner.verification_timestamp.split("T")[0] 
                          : "2026-05-29";

                        return (
                          <div key={owner.id} className="space-y-4 text-xs">
                            {isUnverified ? (
                              <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 text-center space-y-1">
                                <div className="text-xs font-black text-red-400 uppercase tracking-widest">Owner Contact Status: UNVERIFIED</div>
                                <p className="text-[11px] text-gray-400 font-semibold">No confirmed public contact records found.</p>
                              </div>
                            ) : (
                              /* Contact Details */
                              <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-950">
                                <div>
                                  <span className="text-gray-500 block text-[10px]">Deed Holder Name</span>
                                  <span className="text-white font-extrabold text-xs">{owner.name}</span>
                                </div>
                                {owner.llc_ownership && (
                                  <div>
                                    <span className="text-gray-500 block text-[10px]">LLC Entity</span>
                                    <span className="text-white font-bold text-xs">{owner.llc_ownership}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-500 block text-[10px]">Contact Email</span>
                                  <span className="text-white font-semibold">{owner.contact_email || "None Sourced"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block text-[10px]">Mailing Address</span>
                                  <span className="text-white font-semibold truncate block" title={owner.mailing_address}>{owner.mailing_address}</span>
                                </div>
                              </div>
                            )}

                            {/* Confidence & Sources Grid (Required for ALL records) */}
                            <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold text-gray-300">
                              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-900">
                                <span className="text-[8px] text-gray-500 block uppercase tracking-wider mb-1">Owner Confidence Score</span>
                                <span className={`text-xs font-black ${owner.confidence_score >= 75 ? "text-emerald-400" : owner.confidence_score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                  {owner.confidence_score}%
                                </span>
                              </div>
                              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-900">
                                <span className="text-[8px] text-gray-500 block uppercase tracking-wider mb-1">Source Count</span>
                                <span className="text-xs font-black text-white">{owner.source_count} Sources</span>
                              </div>
                              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-900">
                                <span className="text-[8px] text-gray-500 block uppercase tracking-wider mb-1">Verification Timestamp</span>
                                <span className="text-xs font-black text-indigo-300">{lastVerified}</span>
                              </div>
                              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-900">
                                <span className="text-[8px] text-gray-500 block uppercase tracking-wider mb-1">Source Reliability</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${classificationClass} inline-block mt-0.5`}>
                                  {owner.contact_classification}
                                </span>
                              </div>
                            </div>

                            {/* Intelligence Labels / Tags */}
                            {owner.intelligence_labels && owner.intelligence_labels.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Owner Intelligence Labels</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {owner.intelligence_labels.map((label: string, lIdx: number) => (
                                    <span key={lIdx} className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] text-gray-300 rounded-md font-semibold">
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Data Sources transparency checklist (Required for ALL records) */}
                            {owner.data_sources && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Public Records Checklist</span>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-400 font-semibold bg-slate-950/30 p-2.5 rounded border border-slate-950/50">
                                  {["County Assessor", "GIS Parcel Records", "Secretary of State", "Tax Records"].map((sourceName) => {
                                    const isIncluded = owner.data_sources.includes(sourceName);
                                    return (
                                      <div key={sourceName} className="flex items-center gap-1.5">
                                        <span className={isIncluded ? "text-emerald-400 font-extrabold" : "text-gray-700"}>
                                          {isIncluded ? "✓" : "✗"}
                                        </span>
                                        <span className={isIncluded ? "text-gray-300" : "text-gray-600 line-through"}>{sourceName}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Business Records Logs */}
                            <div className="text-[10px] text-gray-400 bg-slate-950/40 p-2.5 rounded border border-slate-950/60 leading-relaxed font-semibold">
                              <strong>Verification Logs:</strong> {owner.business_records}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Pricing Engine & Actions */}
                  <div className="space-y-6">
                    
                    {/* Smart Offer Analytics */}
                    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                          <TrendingUp className="h-4 w-4 text-indigo-400" /> Smart Offer Analytics
                        </h3>
                        <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase">CMA Engine</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-950 border border-slate-900 rounded-xl p-3">
                          <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest block">Expected Resale</span>
                          <span className="text-xs font-black text-white block mt-1">${leadDetail.lead.resale_value?.toLocaleString()}</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-900 rounded-xl p-3">
                          <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest block">Est. ARV</span>
                          <span className="text-xs font-black text-white block mt-1">${leadDetail.lead.arv?.toLocaleString()}</span>
                        </div>
                        <div className="bg-slate-950 border border-slate-900 rounded-xl p-3">
                          <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest block">Wholesale spread</span>
                          <span className="text-xs font-black text-emerald-400 block mt-1">${leadDetail.lead.wholesale_spread?.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Score break-down bar */}
                      <div className="space-y-3 pt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Weighted Intelligence Subscores</span>
                        {leadDetail.lead.scores && Object.entries(leadDetail.lead.scores).map(([name, score]: any) => {
                          if (name === "Overall Score" || name === "AI Confidence" || name === "Acquisition Tier") return null;
                          return (
                            <div key={name} className="space-y-1 text-[11px]">
                              <div className="flex justify-between font-semibold text-gray-300">
                                <span>{name}</span>
                                <span className={name.includes("Risk") || name.includes("Complexity") ? "text-amber-400" : "text-white"}>
                                  {score}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${name.includes("Risk") || name.includes("Complexity") ? "bg-amber-500" : "bg-indigo-500"}`} 
                                  style={{ width: `${score}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 space-y-4">
                      <h3 className="font-extrabold text-white text-sm border-b border-slate-800 pb-2">Acquisition Execution Panel</h3>
                      
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-gray-400 block">Personalized Outreach Campaign</span>
                        <div className="flex gap-2">
                          <select 
                            value={outreachStyle} 
                            onChange={(e) => setOutreachStyle(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs flex-1 outline-none"
                          >
                            <option value="cash_offer">Cash Offer Inquiry (Delinquency context)</option>
                            <option value="partnership_proposal">Development Joint Venture</option>
                            <option value="land_acquisition_inquiry">Vacant Land Sweep Proposal</option>
                          </select>
                          <button 
                            onClick={handleSendOutreach}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition"
                          >
                            Dispatch Email
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-900">
                        <span className="text-xs font-bold text-gray-400 block">Purchase Contract price</span>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            value={offerAmount} 
                            onChange={(e) => setOfferAmount(Number(e.target.value))}
                            className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs flex-1 outline-none font-bold"
                          />
                          <button 
                            onClick={handleGenerateOffer}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition"
                          >
                            Generate Contract
                          </button>
                        </div>
                        {leadDetail.offers?.length > 0 && (
                          <div className="bg-slate-950 p-2.5 rounded border border-slate-900 text-[10px] text-gray-400 leading-relaxed font-semibold">
                            <strong>Proposal Active:</strong> {leadDetail.offers[0].status} for ${leadDetail.offers[0].amount.toLocaleString()} Cash.
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-900">
                        <span className="text-xs font-bold text-gray-400 block">Simulate Seller Reply (Local Sandbox Test)</span>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={simulatedReplyText} 
                            onChange={(e) => setSimulatedReplyText(e.target.value)}
                            placeholder="e.g. Back taxes are $8,500. Can you pay them off?"
                            className="bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs flex-1 outline-none font-semibold"
                          />
                          <button 
                            onClick={handleSimulateReply}
                            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition border border-slate-700"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Communication Log & Negotiation Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-900 pt-6">
                  <div className="space-y-3">
                    <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5"><Mail className="h-4 w-4 text-indigo-400" /> Communications History</h3>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {leadDetail.outreach?.map((log: any) => (
                        <div key={log.id} className="bg-slate-900/40 border border-slate-900 rounded-xl p-3 text-xs space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-indigo-400 uppercase">{log.style.replace('_', ' ')} email</span>
                            <span className="text-gray-500">{new Date(log.sent_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-gray-300 whitespace-pre-line font-medium leading-relaxed bg-slate-950/40 p-2.5 rounded border border-slate-950">{log.content}</p>
                          
                          {log.response_received && (
                            <div className="border-t border-slate-950 pt-2 space-y-1 pl-2 border-l-2 border-emerald-500">
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-emerald-400">Owner Response</span>
                                <span className="text-gray-500">{new Date(log.response_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-emerald-200 italic font-semibold">&ldquo;{log.response_content}&rdquo;</p>
                            </div>
                          )}
                        </div>
                      ))}
                      {leadDetail.outreach?.length === 0 && (
                        <p className="text-xs text-gray-500 font-semibold italic text-center py-6">No outbound outreach logs.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-extrabold text-white text-sm flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-indigo-400" /> AI Negotiation Analysis</h3>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {leadDetail.negotiations?.map((n: any) => (
                        <div key={n.id} className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 text-xs space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                            <div className="bg-slate-950/65 p-2 rounded">
                              <span className="text-gray-500 block uppercase tracking-wider">Motivation</span>
                              <span className="text-rose-400 text-xs font-black">{n.detected_motivation}</span>
                            </div>
                            <div className="bg-slate-950/65 p-2 rounded">
                              <span className="text-gray-500 block uppercase tracking-wider">Urgency</span>
                              <span className="text-rose-400 text-xs font-black">{n.detected_urgency}</span>
                            </div>
                          </div>
                          
                          <div className="text-xs bg-slate-950/50 p-3 rounded border border-slate-950">
                            <span className="text-indigo-300 font-bold block mb-1">Recommended Negotiation Tactics:</span>
                            <p className="text-gray-300 font-medium leading-relaxed">{n.proposed_strategy}</p>
                          </div>
                        </div>
                      ))}
                      {leadDetail.negotiations?.length === 0 && (
                        <p className="text-xs text-gray-500 font-semibold italic text-center py-6">Negotiation tactics await owner reply.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-white text-center py-8">Error loading details.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
