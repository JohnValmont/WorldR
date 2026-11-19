/**
 * A memo that lives for ONE read request (GET /politics/desk and friends).
 *
 * The desk is built from many helpers that each look up the same facts (who
 * governs, the laws in force, the latest economy month) for every section and
 * every nation that needs them: 235 queries, one after another, for one screen.
 * Inside withReadCache each fact is fetched once and shared.
 *
 * Safe by construction:
 * - Only reads through the global `db` are memoised. Anything run on a
 *   transaction (`trx`) always goes to the database, so writes and the reads
 *   that follow them inside a transaction are never served stale.
 * - Outside withReadCache / readCacheForGets (ticks, actions) nothing is
 *   memoised at all.
 * - The memo is dropped when the request ends.
 * - Callers must treat memoised results as read-only (do not mutate them).
 */
import { AsyncLocalStorage } from 'async_hooks';
import { db } from '../../config/database';

const store = new AsyncLocalStorage<Map<string, Promise<any>>>();

/** Run fn with a fresh per-request memo. */
export function withReadCache<T>(fn: () => Promise<T>): Promise<T> {
  return store.run(new Map(), fn);
}

/** Express middleware: every GET request below it gets its own memo. */
export function readCacheForGets() {
  return (req: any, _res: any, next: () => void) => {
    if (req.method !== 'GET') return next();
    store.run(new Map(), () => next());
  };
}

/**
 * The memoised result of load() for this key, when called on the global db
 * inside a memo; otherwise load() itself. A failed load is not kept.
 */
export function cachedRead<T>(conn: any, key: string, load: () => Promise<T>): Promise<T> {
  const memo = store.getStore();
  if (!memo || conn !== db) return load();
  const hit = memo.get(key);
  if (hit) return hit;
  const p = load();
  memo.set(key, p);
  p.catch(() => memo.delete(key));
  return p;
}
