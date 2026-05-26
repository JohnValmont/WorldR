import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearTokens, setAccessToken, setRefreshToken } from '../lib/api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  nation_id: string | null;
  is_verified: boolean;
  display_name: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        clearTokens();
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      }
    }),
    {
      name: 'worldr-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
