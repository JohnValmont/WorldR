import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) return 'http://localhost:4000/api/v1';
  return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/$/, '')}/api/v1`;
};
const API_BASE = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
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

// Auth Only
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

// Characters
export const characterApi = {
  getMe: () => api.get('/characters/me'),
  create: (data: { name: string; motherland_country_id: string; home_state_id?: string; currency_id: string }) =>
    api.post('/characters', data)
};

// Companies
export const companyApi = {
  getMy: () => api.get('/companies/my'),
  getById: (id: string) => api.get(`/companies/${id}`),
  create: (data: { name: string; country_id: string; headquarters_state_id: string; industry_id: string; subsector_id?: string | null; legal_structure_id: string; currency_id: string; starting_capital: number }) =>
    api.post('/companies', data),
  withdrawCapital: (id: string, amount: number) =>
    api.post(`/companies/${id}/withdraw-capital`, { amount }),
  updateFinances: (id: string, data: any) =>
    api.patch(`/companies/${id}/finances`, data)
};

// Registry
export const registryApi = {
  getCompanies: () => api.get(`/registry/companies?t=${Date.now()}`),
  getCompany: (id: string) => api.get(`/registry/companies/${id}?t=${Date.now()}`)
};

// Logistics
export const logisticsApi = {
  getProcurement: () => api.get('/logistics/procurement'),
  getCompanyLogistics: (companyId: string) => api.get(`/logistics/company/${companyId}?t=${Date.now()}`),
  hireStaff: (companyId: string, role: string) => api.post(`/logistics/company/${companyId}/staff/hire`, { role }),
  fireStaff: (companyId: string, role: string) => api.post(`/logistics/company/${companyId}/staff/fire`, { role }),
  purchaseVehicle: (companyId: string, catalogVehicleId: string) => api.post(`/logistics/company/${companyId}/vehicles/purchase`, { catalogVehicleId }),
  leaseFacility: (companyId: string, catalogFacilityId: string) => api.post(`/logistics/company/${companyId}/facilities/lease`, { catalogFacilityId }),
  assignOperation: (companyId: string, vehicleId: string, poolId: string) => api.post(`/logistics/company/${companyId}/operations/assign`, { vehicleId, poolId }),
  processTest: (companyId: string) => api.post(`/logistics/company/${companyId}/operations/process-test`)
};

// Manufacturing
export const manufacturingApi = {
  getBootstrap: () => api.get('/manufacturing/bootstrap'),
  getCompanyData: (companyId: string) => api.get(`/companies/${companyId}/manufacturing/data?t=${Date.now()}`),
  leaseFactory: (companyId: string, factoryTypeId: string) => api.post(`/companies/${companyId}/manufacturing/factories/lease`, { factoryTypeId }),
  createModel: (companyId: string, data: any) => api.post(`/companies/${companyId}/manufacturing/models`, data),
  updateModelPrice: (companyId: string, modelId: string, salePrice: number) => api.patch(`/companies/${companyId}/manufacturing/models/${modelId}/price`, { salePrice }),
  saveProductionPlan: (companyId: string, data: { lineId: string, modelId: string | null, qualitySetting: string, targetUnitsPerArc: number }) => api.post(`/companies/${companyId}/manufacturing/production/save-plan`, data),
  hireStaff: (companyId: string, role: string) => api.post(`/companies/${companyId}/manufacturing/staff/hire`, { role }),
  fireStaff: (companyId: string, role: string) => api.post(`/companies/${companyId}/manufacturing/staff/fire`, { role }),
  processArcAdmin: (companyId: string) => api.post(`/admin/manufacturing/process-company/${companyId}`)
};
