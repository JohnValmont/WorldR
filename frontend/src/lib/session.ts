/**
 * Server-side source of truth for "where should this player be?".
 *
 * The browser's localStorage keys (worldr_citizen_file_v1 etc.) are only a
 * CACHE that older screens still read. Whether a player has a character is
 * always decided by the server, so clearing the browser, switching device or
 * using a private window never traps anyone in an onboarding loop.
 */
import { characterApi, getAccessToken } from './api';

export const CITIZEN_CACHE_KEYS = {
  motherland: 'worldr_selected_motherland',
  citizenFile: 'worldr_citizen_file_v1',
  entered: 'worldr_living_world_entry_v1',
} as const;

export const LOGIN_PATH = '/landing/onboarding.html?action=login';
export const CREATE_CHARACTER_PATH = '/landing/onboarding.html?action=character';
export const HOME_PATH = '/drennia/chronicle';

export type SessionState =
  | { kind: 'ready'; character: any }
  | { kind: 'no_character' }
  | { kind: 'signed_out' }
  | { kind: 'offline'; hasCache: boolean };

function writeCache(character: any) {
  try {
    localStorage.setItem(CITIZEN_CACHE_KEYS.motherland, character.motherland_country_id || 'drennia');
    localStorage.setItem(CITIZEN_CACHE_KEYS.citizenFile, JSON.stringify(character));
    localStorage.setItem(CITIZEN_CACHE_KEYS.entered, 'true');
  } catch { /* storage may be unavailable (private mode) — the server is the truth anyway */ }
}

function clearCache() {
  try {
    Object.values(CITIZEN_CACHE_KEYS).forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

function hasCache(): boolean {
  try {
    return !!localStorage.getItem(CITIZEN_CACHE_KEYS.citizenFile);
  } catch {
    return false;
  }
}

/** Ask the server whether the signed-in player has a character, and refresh the local cache. */
export async function resolveSession(): Promise<SessionState> {
  if (!getAccessToken()) return { kind: 'signed_out' };
  try {
    const res = await characterApi.getMe();
    const character = res.data;
    if (!character || !character.id) {
      clearCache();
      return { kind: 'no_character' };
    }
    writeCache(character);
    return { kind: 'ready', character };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 404) {
      clearCache();
      return { kind: 'no_character' };
    }
    if (status === 401) return { kind: 'signed_out' }; // api interceptor also redirects to login
    return { kind: 'offline', hasCache: hasCache() };
  }
}

/** Synchronous best guess for entry points that must redirect immediately; the game layout re-checks with the server. */
export function getEntryPath(): string {
  return getAccessToken() ? HOME_PATH : LOGIN_PATH;
}
