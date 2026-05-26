import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) return 'http://localhost:4000/api/v1';
  return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/$/, '')}/api/v1`;
};
const API_BASE = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// ── Token storage helpers ──────────────────────────────────────────────────
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('worldr_access_token');
}
export function setAccessToken(token: string): void {
  localStorage.setItem('worldr_access_token', token);
}
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('worldr_refresh_token');
}
export function setRefreshToken(token: string): void {
  localStorage.setItem('worldr_refresh_token', token);
}
export function clearTokens(): void {
  localStorage.removeItem('worldr_access_token');
  localStorage.removeItem('worldr_refresh_token');
}

// ── Request interceptor: inject Bearer token ─────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ─────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(p => (token ? p.resolve(token) : p.reject(error)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Typed API methods ─────────────────────────────────────────────────────

// Auth
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  verifyEmail: (email: string, otp: string) =>
    api.post('/auth/verify-email', { email, otp }),
  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),
  me: () => api.get('/auth/me'),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) =>
    api.post('/auth/reset-password', data)
};

// Profile
export const profileApi = {
  get: () => api.get('/profile'),
  create: (data: { display_name: string; ideology: string; bio?: string }) =>
    api.post('/profile', data),
  update: (data: Partial<{ display_name: string; ideology: string; bio: string }>) =>
    api.patch('/profile', data)
};

// Nation
export const nationApi = {
  getState: (nationId: string) => api.get(`/nations/${nationId}`),
  getHistory: (nationId: string, limit = 24) =>
    api.get(`/nations/${nationId}/history?limit=${limit}`),
  updateBudget: (nationId: string, data: any) =>
    api.patch(`/nations/${nationId}/budget`, data),
  // NOTE: Ticks are managed automatically by the server (every 8 real hours).
  // This endpoint is admin-only. Calling it as a regular user returns 403.
  triggerTick: (nationId: string) =>
    api.post(`/nations/${nationId}/tick`)
};

// Laws
export const lawsApi = {
  getLaws: (nationId: string) => api.get(`/nations/${nationId}/laws`),
  proposeLaw: (nationId: string, data: any) =>
    api.post(`/nations/${nationId}/laws`, data),
  getLawsConfig: (nationId: string) => api.get(`/nations/${nationId}/laws/config`),
  proposeBill: (nationId: string, data: any) =>
    api.post(`/nations/${nationId}/laws/propose-bill`, data)
};

// Parties
export const partiesApi = {
  getParties: (nationId: string) => api.get(`/nations/${nationId}/parties`),
  getMyParty: (nationId: string) => api.get(`/nations/${nationId}/parties/my`),
  getPartyDetails: (nationId: string, partyId: string) =>
    api.get(`/nations/${nationId}/parties/${partyId}`),
  createParty: (nationId: string, data: any) =>
    api.post(`/nations/${nationId}/parties`, data),
  joinParty: (nationId: string, partyId: string) =>
    api.post(`/nations/${nationId}/parties/${partyId}/join`),
  leaveParty: (nationId: string) =>
    api.delete(`/nations/${nationId}/parties/leave`),
  runRally: (nationId: string) =>
    api.post(`/nations/${nationId}/parties/action/rally`),
  runFundraise: (nationId: string, targetBloc: string) =>
    api.post(`/nations/${nationId}/parties/action/fundraise`, { targetBloc })
};

// Notifications
export const notificationsApi = {
  get: (limit = 50) => api.get(`/notifications?limit=${limit}`),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all')
};

// World
export const worldApi = {
  getWorldState: () => api.get('/world'),
  getNations: () => api.get('/world/nations'),
  getTickStatus: () => api.get('/world/tick-status')
};

// Elections
export const electionsApi = {
  getStatus: (nationId: string) => api.get(`/nations/${nationId}/elections/status`),
  getLatest: (nationId: string) => api.get(`/nations/${nationId}/elections/latest`),
  getHistory: (nationId: string, limit = 5) => api.get(`/nations/${nationId}/elections?limit=${limit}`)
};

// Reports
export const reportsApi = {
  getLatest: (nationId: string) => api.get(`/nations/${nationId}/reports/latest`),
  getHistory: (nationId: string, limit = 12) => api.get(`/nations/${nationId}/reports?limit=${limit}`)
};

// Nation list (public)
export const nationListApi = {
  list: () => api.get('/nations')
};

// Voter Blocs
export const voterBlocsApi = {
  getBlocs: (nationId: string) => api.get(`/nations/${nationId}/voter-blocs`),
  getAffinities: (nationId: string) => api.get(`/nations/${nationId}/voter-blocs/affinities`),
};

// Party Staff
export const partyStaffApi = {
  getStaff: (nationId: string, partyId: string) =>
    api.get(`/nations/${nationId}/parties/${partyId}/staff`),
  hireStaff: (nationId: string, partyId: string, data: {
    role: string; name?: string; seniority?: string;
  }) => api.post(`/nations/${nationId}/parties/${partyId}/staff`, data),
  fireStaff: (nationId: string, partyId: string, staffId: string) =>
    api.delete(`/nations/${nationId}/parties/${partyId}/staff/${staffId}`),
};

// Governance
export const governanceApi = {
  getContinents: () => api.get('/world/continents'),
  getGovernanceSystems: () => api.get('/world/governance-systems'),
  getNationGovernance: (nationId: string) =>
    api.get(`/nations/${nationId}/governance`),
};

// Parliament
export const parliamentApi = {
  getSessions: (nationId: string) =>
    api.get(`/nations/${nationId}/parliament/sessions`),
  getSession: (nationId: string, sessionId: string) =>
    api.get(`/nations/${nationId}/parliament/sessions/${sessionId}`),
};

// Canonical Alpha Nation
export const KELDORIA_ID = 'b1a2c3d4-e5f6-7890-abcd-ef1234567890';

