const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://172.20.10.3:8000/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem("quantflow_token");
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let url = `${BASE_URL}${path}`;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("quantflow_token");
    if (window.location.pathname !== "/login" && window.location.pathname !== "/signup") {
      window.location.href = "/login";
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Request failed");
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);
    const data = await request<{ access_token: string }>(`/auth/login`, {
      method: "POST",
      body: formData,
    });
    localStorage.setItem("quantflow_token", data.access_token);
    return data;
  },
  signup: async (email: string, fullName: string, password: string) => {
    return request<any>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, full_name: fullName, password }),
    });
  },
  me: async () => {
    return request<any>("/auth/me");
  },
  logout: () => {
    localStorage.removeItem("quantflow_token");
    window.location.href = "/login";
  },

  // Dashboard
  getDashboardSummary: async () => {
    return request<any>("/dashboard/summary");
  },

  // Strategies
  getStrategies: async () => {
    return request<any[]>("/strategies/");
  },
  createStrategy: async (name: string, description: string, pineScript: string, settings: any = {}) => {
    return request<any>("/strategies/", {
      method: "POST",
      body: JSON.stringify({ name, description, pine_script: pineScript, settings }),
    });
  },
  updateStrategy: async (id: number, data: { name?: string; description?: string; pine_script?: string; settings?: any }) => {
    return request<any>(`/strategies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  getStrategyPerformance: async (id: number) => {
    return request<any>(`/strategies/${id}/performance`);
  },

  // Simulations
  getSimulations: async () => {
    return request<any[]>("/simulations/");
  },
  createSimulation: async (name: string, parameters: any, strategyId?: number) => {
    return request<any>("/simulations/", {
      method: "POST",
      body: JSON.stringify({ name, parameters, strategy_id: strategyId }),
    });
  },
  getSimulationDetail: async (id: number) => {
    return request<any>(`/simulations/${id}`);
  },

  // Webhooks
  getWebhookLogs: async () => {
    return request<any[]>("/webhooks/logs");
  },

  // Risk Rules
  getRiskRules: async (accountId: number) => {
    return request<any>(`/risk/rules/${accountId}`);
  },
  updateRiskRules: async (accountId: number, rules: any) => {
    return request<any>(`/risk/rules/${accountId}`, {
      method: "PUT",
      body: JSON.stringify(rules),
    });
  },
  toggleAccountLock: async (accountId: number, lockStatus: boolean) => {
    return request<any>(`/risk/lock/${accountId}?lock_status=${lockStatus}`, {
      method: "POST",
    });
  },
  getAuditLogs: async () => {
    return request<any[]>("/risk/audit-logs");
  },

  // Backtester
  runBacktest: async (params: {
    symbol: string;
    strategy_type: string;
    fast_period: number;
    slow_period: number;
    rsi_period: number;
    oversold: number;
    overbought: number;
    trade_size: number;
    days: number;
  }) => {
    return request<any>("/backtest/run", {
      method: "POST",
      params: Object.keys(params).reduce((acc, key) => {
        acc[key] = String((params as any)[key]);
        return acc;
      }, {} as Record<string, string>),
    });
  },
  runWalkForward: async (params: {
    symbol: string;
    strategy_type: string;
    fast_period: number;
    slow_period: number;
    rsi_period: number;
    oversold: number;
    overbought: number;
    train_ratio: number;
    days: number;
  }) => {
    return request<any>("/backtest/walk-forward", {
      method: "POST",
      params: Object.keys(params).reduce((acc, key) => {
        acc[key] = String((params as any)[key]);
        return acc;
      }, {} as Record<string, string>),
    });
  },

  // AI Research
  auditScript: async (pineScript: string) => {
    return request<any>("/ai/audit", {
      method: "POST",
      body: JSON.stringify({ pine_script: pineScript }),
    });
  },
  optimizeParams: async (symbol: string, strategyType: string, baseParameters: any) => {
    return request<any>("/ai/optimize", {
      method: "POST",
      body: JSON.stringify({ symbol, strategy_type: strategyType, base_parameters: baseParameters }),
    });
  },

  // Brokers
  getBrokers: async () => {
    return request<any[]>("/brokers/");
  },
  saveBroker: async (brokerName: string, apiKey: string, secretKey: string, environment = "paper") => {
    return request<any>("/brokers/", {
      method: "POST",
      body: JSON.stringify({ broker_name: brokerName, api_key: apiKey, secret_key: secretKey, environment }),
    });
  },
  testBroker: async (id: number) => {
    return request<any>(`/brokers/${id}/test`, {
      method: "POST",
    });
  },

  // Real Estate Autonomous Acquisition System
  getRealEstateSummary: async () => {
    return request<any>("/realestate/summary");
  },
  getLeads: async () => {
    return request<any[]>("/realestate/leads");
  },
  getLeadDetail: async (id: number) => {
    return request<any>(`/realestate/leads/${id}`);
  },
  updateLeadStatus: async (id: number, status: string) => {
    return request<any>(`/realestate/leads/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },
  generateOffer: async (id: number, amount: number, offerType = "cash") => {
    return request<any>(`/realestate/leads/${id}/generate-offer`, {
      method: "POST",
      body: JSON.stringify({ amount, offer_type: offerType }),
    });
  },
  sendOutreachEmail: async (id: number, style: string) => {
    return request<any>(`/realestate/leads/${id}/send-outreach`, {
      method: "POST",
      body: JSON.stringify({ style }),
    });
  },
  simulateReply: async (id: number, replyText: string) => {
    return request<any>(`/realestate/leads/${id}/simulate-reply`, {
      method: "POST",
      body: JSON.stringify({ reply_text: replyText }),
    });
  },
  runAutonomousAgent: async () => {
    return request<any>("/realestate/run-agent", {
      method: "POST",
    });
  },
  generateManualReport: async () => {
    return request<any>("/realestate/report", {
      method: "POST",
    });
  },
  getRealEstateSettings: async () => {
    return request<any>("/realestate/settings");
  },
  updateRealEstateSettings: async (settingsData: any) => {
    return request<any>("/realestate/settings", {
      method: "POST",
      body: JSON.stringify(settingsData),
    });
  }
};
