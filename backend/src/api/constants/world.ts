/**
 * World-level tunables (player activity, public snapshot, game speed).
 * All numbers that shape what players see about the world live here.
 */

/**
 * Fallback real seconds per game month, used only if world_clock has no value.
 * The live value is world_clock.real_seconds_per_month / pol_real_seconds_per_month
 * (set by migration 0095 to 4 hours; adjustable via PATCH /world/clock/speed).
 */
export const DEFAULT_REAL_SECONDS_PER_MONTH = 4 * 60 * 60; // 4 hours

/** How often (at most) a signed-in player's users.last_seen_at is refreshed. */
export const LAST_SEEN_UPDATE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/** A player counts as "active" if seen within this window. */
export const ACTIVE_PLAYER_WINDOW_DAYS = 7;

/** /world/snapshot is public and hit by the landing page; cache it this long. */
export const WORLD_SNAPSHOT_CACHE_MS = 60 * 1000; // 1 minute

/**
 * Accounts that are NOT real players: system/NPC accounts created by seeds.
 * NPC chairmen use <name>@npc.worldr.game; the system account cannot log in.
 */
export const NPC_EMAIL_DOMAIN_SUFFIX = '@npc.worldr.game';
export const SYSTEM_NPC_EMAIL = 'system_npc@worldr.game';
export const NO_LOGIN_PASSWORD_HASH = 'no_login_allowed';
