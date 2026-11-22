/**
 * Which nation a request is about (three starter nations, docs/POLITICS_FLOOR.md).
 *
 * A player's politics always happens in their own nation: the national
 * parliament (pol_states row) of their character's motherland. The politics
 * router looks that up once per request and keeps it here, so the dozens of
 * existing handlers that used to default to Drennia ('national') pick up the
 * player's nation without each being rewritten.
 */
import { AsyncLocalStorage } from 'async_hooks';
import { db } from '../../config/database';
import { DRENNIA, NATIONS_BY_COUNTRY } from '../constants/nations';

const context = new AsyncLocalStorage<{ polStateCode: string; pinned: boolean }>();

/** The pol_states.code to use when a request does not name one. */
export function currentPolStateCode(): string {
  return context.getStore()?.polStateCode ?? DRENNIA.polStateCode;
}

/**
 * The nation (pol_states code or id) a request is about. A read may look at
 * another nation (?stateId=...); a write (POST/PUT/PATCH/DELETE) always happens
 * in the player's own nation, whatever the request names. Without this a player
 * could found a party, rally or table bills in a parliament they don't belong to.
 */
export function requestedPolState(requested?: unknown): string {
  const store = context.getStore();
  const own = store?.polStateCode ?? DRENNIA.polStateCode;
  if (store?.pinned) return own;
  return typeof requested === 'string' && requested ? requested : own;
}

export async function polStateCodeForUser(userId: string | number | null | undefined): Promise<string> {
  if (!userId) return DRENNIA.polStateCode;
  const character = await db('characters').where({ user_id: userId, status: 'active' }).select('motherland_country_id').first();
  return NATIONS_BY_COUNTRY[character?.motherland_country_id]?.polStateCode ?? DRENNIA.polStateCode;
}

/** Express middleware: run the rest of the request inside the player's nation. */
export function withPlayerNation() {
  return async (req: any, _res: any, next: (err?: any) => void) => {
    try {
      const polStateCode = await polStateCodeForUser(req.user?.id);
      const pinned = !['GET', 'HEAD', 'OPTIONS'].includes(String(req.method).toUpperCase());
      context.run({ polStateCode, pinned }, () => next());
    } catch (err) { next(err); }
  };
}
