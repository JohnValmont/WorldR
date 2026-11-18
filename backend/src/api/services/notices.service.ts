/**
 * Inbox: short notes about what happened to a player while they were away
 * (an offer on their desk, a promise judged, a leadership challenge, their
 * world rank). Written inside whatever transaction caused the event.
 * Read on the Desk (desk.service.ts); marked read with POST /politics/notices/read.
 */
import { NOTICES_ON_DESK } from '../constants/worldStage';

export type NoticeTab = 'desk' | 'chamber' | 'corridors' | 'party' | 'wire' | 'voters' | 'nation' | 'map';

export async function notify(trx: any, characterId: string | null | undefined, arc: number, kind: string, text: string, tab: NoticeTab | null = null): Promise<void> {
  if (!characterId) return;
  await trx('player_notices').insert({ character_id: characterId, arc, kind, text: String(text).slice(0, 400), tab });
}

/** Notify several people (duplicates and blanks ignored). */
export async function notifyMany(trx: any, ids: (string | null | undefined)[], arc: number, kind: string, text: string, tab: NoticeTab | null = null): Promise<void> {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (!unique.length) return;
  await trx('player_notices').insert(unique.map(id => ({ character_id: id, arc, kind, text: String(text).slice(0, 400), tab })));
}

export async function noticesFor(conn: any, characterId: string) {
  const items = await conn('player_notices').where({ character_id: characterId })
    .orderBy('created_at', 'desc').limit(NOTICES_ON_DESK).select('id', 'arc', 'kind', 'text', 'tab', 'read_at', 'created_at');
  const unread = Number((await conn('player_notices').where({ character_id: characterId }).whereNull('read_at').count('* as n').first())?.n) || 0;
  return { unread, items: items.map((r: any) => ({ id: r.id, arc: r.arc, kind: r.kind, text: r.text, tab: r.tab, read: !!r.read_at, at: r.created_at })) };
}

export async function markNoticesRead(conn: any, characterId: string): Promise<number> {
  return conn('player_notices').where({ character_id: characterId }).whereNull('read_at').update({ read_at: conn.fn.now() });
}
