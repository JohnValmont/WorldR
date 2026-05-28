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
