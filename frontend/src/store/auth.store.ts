import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearTokens, setAccessToken, setRefreshToken } from '../lib/api';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  is_verified: boolean;
  display_name: string | null;
  character?: any | null;
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
        
        // Hydrate localStorage if character is attached
        if (typeof window !== 'undefined' && user.character) {
          localStorage.setItem('worldr_selected_motherland', user.character.state_id);
          localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(user.character));
          localStorage.setItem('worldr_living_world_entry_v1', 'true');
        }
        
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (user) => {
        if (typeof window !== 'undefined' && user.character) {
          localStorage.setItem('worldr_selected_motherland', user.character.state_id);
          localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(user.character));
          localStorage.setItem('worldr_living_world_entry_v1', 'true');
        }
        set({ user });
      },

      logout: () => {
        clearTokens();
        // Clear all game-state keys so the next account that logs in
        // doesn't inherit another player's character, company, or citizen file.
        if (typeof window !== 'undefined') {
          const PRESERVE = new Set([
            'worldr-auth',              // zustand auth store — contains the new user's tokens
            'worldr_world_clock_v1',    // server-driven, not player-specific
            'worldr_account_settings',  // UI prefs
          ]);
          const toRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('worldr') && !PRESERVE.has(key)) {
              toRemove.push(key);
            }
          }
          toRemove.forEach(k => localStorage.removeItem(k));
        }
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
