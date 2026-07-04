/**
 * WORLDr — Notifications / Event Feed engine.
 *
 * A small, self-contained, SSR-safe, localStorage-backed feed of in-game
 * events. It is the data layer behind the header bell + notification panel and
 * the Chronicle "while you were away" return hook.
 *
 * Design rules (matching the Business-path direction doc):
 *   - Pure client store. No backend, no DB. Source of truth is one localStorage
 *     key in the active `worldr_*` namespace.
 *   - Anyone can emit an event with `addNotification(...)`. Central game actions
 *     (records, month advance, contracts) emit through here.
 *   - Every mutation broadcasts a `worldr:notifications` window event so the bell
 *     re-renders instantly, and listens to `storage` for cross-tab sync.
 */

export const NOTIF_KEY = 'worldr_notifications_v1';
const MAX_STORED = 100;
export const NOTIF_EVENT = 'worldr:notifications';

export type NotificationCategory =
  | 'business'
  | 'contract'
  | 'market'
  | 'record'
  | 'world'
  | 'system';

export interface GameNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  /** Real-world epoch ms when the event was recorded (for relative "2m ago"). */
  createdAt: number;
  /** In-game date string (e.g. "January, Year 0") at time of the event. */
  gameDate?: string;
  /** Optional in-app link the notification should route to when clicked. */
  href?: string;
  read: boolean;
}

/** Input accepted by addNotification — everything except the fields we derive. */
export interface NotificationInput {
  category: NotificationCategory;
  title: string;
  body?: string;
  href?: string;
  /** Provide a stable id to make an event idempotent (dedupes on re-emit). */
  id?: string;
  /** Override the game date string; defaults to the current world date. */
  gameDate?: string;
}

const isBrowser = (): boolean => typeof window !== 'undefined';

function readRaw(): GameNotification[] {
  if (!isBrowser()) return [];
  try {
    const stored = localStorage.getItem(NOTIF_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as GameNotification[]) : [];
  } catch {
    return [];
  }
}

function writeRaw(list: GameNotification[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(list.slice(0, MAX_STORED)));
    // Same-tab listeners (the `storage` event does not fire in the originating tab).
    window.dispatchEvent(new CustomEvent(NOTIF_EVENT));
  } catch {
    /* storage full / unavailable — fail silently, notifications are non-critical */
  }
}

/** All notifications, newest first. */
export function getNotifications(): GameNotification[] {
  return readRaw().sort((a, b) => b.createdAt - a.createdAt);
}

/** Count of unread notifications. */
export function getUnreadCount(): number {
  return readRaw().reduce((n, e) => (e.read ? n : n + 1), 0);
}

/**
 * Record a new event. Returns the created (or existing) notification.
 * If `id` is provided and already present, the call is a no-op (idempotent) —
 * this lets callers safely re-sync repeated sources like the ledger.
 */
export function addNotification(input: NotificationInput): GameNotification | null {
  if (!isBrowser()) return null;

  const list = readRaw();

  if (input.id && list.some((e) => e.id === input.id)) {
    return list.find((e) => e.id === input.id) ?? null;
  }

  const notification: GameNotification = {
    id: input.id ?? `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    category: input.category,
    title: input.title,
    body: input.body,
    href: input.href,
    gameDate: input.gameDate,
    createdAt: Date.now(),
    read: false,
  };

  writeRaw([notification, ...list]);
  return notification;
}

/** Day a single notification as read. */
export function markRead(id: string): void {
  const list = readRaw();
  let changed = false;
  const next = list.map((e) => {
    if (e.id === id && !e.read) {
      changed = true;
      return { ...e, read: true };
    }
    return e;
  });
  if (changed) writeRaw(next);
}

/** Day every notification as read. */
export function markAllRead(): void {
  const list = readRaw();
  if (!list.some((e) => !e.read)) return;
  writeRaw(list.map((e) => ({ ...e, read: true })));
}

/** Remove all notifications. */
export function clearNotifications(): void {
  writeRaw([]);
}

/**
 * Subscribe to feed changes (same-tab custom event + cross-tab storage event).
 * Returns an unsubscribe function. SSR-safe: no-op on the server.
 */
export function subscribeNotifications(callback: () => void): () => void {
  if (!isBrowser()) return () => {};
  const onCustom = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key === NOTIF_KEY) callback();
  };
  window.addEventListener(NOTIF_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(NOTIF_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

/** Map a record `type` (from businessCore.addRecord) to a feed category. */
export function categoryForRecordType(type: string): NotificationCategory {
  switch (type) {
    case 'contract':
      return 'contract';
    case 'market':
      return 'market';
    case 'world':
      return 'world';
    case 'system':
      return 'system';
    default:
      return 'record';
  }
}

/** Human-friendly relative time, e.g. "just now", "4m ago", "2h ago", "3d ago". */
export function relativeTime(fromMs: number, nowMs: number = Date.now()): string {
  const diff = Math.max(0, nowMs - fromMs);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  return `${wk}w ago`;
}
