/**
 * RescueLoop Unified Frontend API Client
 * Connects all 18 screens to the FastAPI + PostgreSQL/SQLite Backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('rescueloop_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string, 
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const url = `${API_BASE}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers || {})
    };

    const res = await fetch(url, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errJson.message || errorMsg;
      } catch {
        // use fallback text
      }
      return { data: null, error: errorMsg };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Network request failed' };
  }
}

// ==================== AUTH API ====================
export const authApi = {
  async login(formData: FormData) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Login failed' }));
        return { data: null, error: err.detail || 'Login failed' };
      }
      const data = await res.json();
      if (typeof window !== 'undefined' && data.access_token) {
        localStorage.setItem('rescueloop_token', data.access_token);
        localStorage.setItem('rescueloop_user', JSON.stringify(data.user));
      }
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },

  async demoLogin(role: 'donor' | 'ngo' | 'volunteer' | 'ops') {
    const res = await request<any>(`/auth/demo-login/${role}`, { method: 'POST' });
    if (res.data?.access_token && typeof window !== 'undefined') {
      localStorage.setItem('rescueloop_token', res.data.access_token);
      localStorage.setItem('rescueloop_user', JSON.stringify(res.data.user));
    }
    return res;
  },

  async register(body: any) {
    return request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async getMe() {
    return request<any>('/auth/me');
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rescueloop_token');
      localStorage.removeItem('rescueloop_user');
    }
  }
};

// ==================== DONOR API ====================
export const donorApi = {
  async getDashboardStats() {
    return request<any>('/donor/dashboard-stats');
  },

  async getActiveDonations() {
    return request<any[]>('/donor/donations/active');
  },

  async createDonation(payload: any) {
    return request<any>('/donor/donations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getDonationDetails(idOrCode: string) {
    return request<any>(`/donor/donations/${idOrCode}`);
  },

  async getHistory() {
    return request<any[]>('/donor/donations/history');
  },

  async getTodayPickups() {
    return request<any[]>('/donor/pickups/today');
  },

  async getActivityFeed() {
    return request<any[]>('/donor/activity-feed');
  }
};

// ==================== NGO API ====================
export const ngoApi = {
  async getDashboardStats() {
    return request<any>('/ngo/dashboard-stats');
  },

  async getCapacity() {
    return request<any>('/ngo/capacity');
  },

  async getOffers(status = 'all', query = '') {
    const params = new URLSearchParams();
    if (status) params.append('status_filter', status);
    if (query) params.append('q', query);
    return request<any[]>(`/ngo/offers?${params.toString()}`);
  },

  async getOfferDetail(id: string) {
    return request<any>(`/ngo/offers/${id}`);
  },

  async respondToOffer(id: string, action: 'accept' | 'decline', body?: { accepted_meals: number; delivery_window?: string; notes?: string }) {
    return request<any>(`/ngo/offers/${id}/respond?action=${action}`, {
      method: 'POST',
      body: JSON.stringify(body || { accepted_meals: 0 })
    });
  },

  async getPreferences() {
    return request<any>('/ngo/preferences');
  },

  async updatePreferences(payload: any) {
    return request<any>('/ngo/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async getHistory() {
    return request<any[]>('/ngo/history');
  }
};

// ==================== VOLUNTEER API ====================
export const volunteerApi = {
  async getDashboardStats() {
    return request<any>('/volunteer/dashboard-stats');
  },

  async toggleAvailability(isAvailable: boolean) {
    return request<any>('/volunteer/availability', {
      method: 'PUT',
      body: JSON.stringify({ is_available: isAvailable })
    });
  },

  async getTask(taskId: string) {
    return request<any>(`/volunteer/tasks/${taskId}`);
  },

  async updateTaskStep(taskId: string, step: number) {
    return request<any>(`/volunteer/tasks/${taskId}/step`, {
      method: 'POST',
      body: JSON.stringify({ step })
    });
  },

  async verifyOtp(taskId: string, payload: { verified_qty: number; temp_at_drop: number; otp_code: string; receiver_name: string; notes?: string }) {
    return request<any>(`/volunteer/tasks/${taskId}/verify-otp`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getHistory() {
    return request<any[]>('/volunteer/history');
  }
};

// ==================== OPERATIONS API ====================
export const opsApi = {
  async getNetworkStats() {
    return request<any>('/ops/network-stats');
  },

  async getTelemetryNodes() {
    return request<any[]>('/ops/telemetry/nodes');
  },

  async getMissions(status = 'all', query = '') {
    const params = new URLSearchParams();
    if (status) params.append('status_filter', status);
    if (query) params.append('q', query);
    return request<any[]>(`/ops/missions?${params.toString()}`);
  },

  async getMissionDetail(id: string) {
    return request<any>(`/ops/missions/${id}`);
  },

  async getExceptions() {
    return request<any[]>('/ops/exceptions');
  },

  async resolveException(id: string, resolution: string, actionTaken: string) {
    return request<any>(`/ops/exceptions/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_status: resolution, action_taken: actionTaken })
    });
  },

  async getAuditLogs(limit = 20) {
    return request<any[]>(`/ops/audit-trail?limit=${limit}`);
  }
};

// ==================== AI COPILOT API ====================
export const aiApi = {
  async intakeCopilot(notes: string) {
    return request<any>('/ai/intake-copilot', {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  },

  async getMatchingRecommendations(donationId: string) {
    return request<any>(`/ai/matching/${donationId}`);
  },

  async getDispatchRecommendations(missionId: string) {
    return request<any>(`/ai/dispatch/${missionId}`);
  }
};
