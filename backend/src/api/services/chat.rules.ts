/**
 * Chat moderation rules (pure functions; tests/chat.test.ts). Numbers: constants/chat.ts.
 */
import {
  CHAT_AUTO_HIDE_REPORTS, CHAT_MAX_MESSAGES_PER_MINUTE, CHAT_MIN_SECONDS_BETWEEN_MESSAGES,
  CHAT_MUTE_DEFAULT_HOURS, CHAT_MUTE_MAX_HOURS,
} from '../constants/chat';

/** A message is hidden once enough DIFFERENT players have reported it. */
export function shouldAutoHide(distinctReporters: number): boolean {
  return distinctReporters >= CHAT_AUTO_HIDE_REPORTS;
}

/** Is a mute still running? A missing or past time means not muted. */
export function isMuted(mutedUntil: Date | string | null | undefined, now: number = Date.now()): boolean {
  if (!mutedUntil) return false;
  const t = new Date(mutedUntil).getTime();
  return Number.isFinite(t) && t > now;
}

/** Hours for an admin mute: default when missing/invalid, never below 1 or above the maximum. */
export function muteHours(requested: unknown): number {
  const h = Number(requested);
  if (!Number.isFinite(h) || h <= 0) return CHAT_MUTE_DEFAULT_HOURS;
  return Math.min(CHAT_MUTE_MAX_HOURS, Math.max(1, Math.round(h)));
}

/**
 * Why a new message must wait, or null if it may be sent.
 * recentSentAt: the player's own send times within (at least) the last minute.
 */
export function rateLimitReason(recentSentAt: (Date | string)[], now: number = Date.now()): string | null {
  const times = recentSentAt.map(t => new Date(t).getTime()).filter(Number.isFinite);
  const last = times.length ? Math.max(...times) : null;
  if (last !== null && now - last < CHAT_MIN_SECONDS_BETWEEN_MESSAGES * 1000) return 'You are sending messages too quickly.';
  const inLastMinute = times.filter(t => now - t < 60_000).length;
  if (inLastMinute >= CHAT_MAX_MESSAGES_PER_MINUTE) return `Slow down: at most ${CHAT_MAX_MESSAGES_PER_MINUTE} messages a minute.`;
  return null;
}

/**
 * May this player see (and so report) a message in this stored channel?
 * myRooms: the stored channel names the player can read ('world', 'nation:<code>', 'party:<id>').
 */
export function canSeeMessage(
  msg: { channel: string; character_id: string; target_character_id: string | null },
  me: { characterId: string; rooms: string[] },
): boolean {
  if (msg.channel === 'private') return msg.character_id === me.characterId || msg.target_character_id === me.characterId;
  return me.rooms.includes(msg.channel);
}
