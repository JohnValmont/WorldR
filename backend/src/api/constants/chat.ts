// Chat and chat moderation numbers. Rules: services/chat.rules.ts (tests/chat.test.ts).
// Moderation: players report a message; CHAT_AUTO_HIDE_REPORTS different players
// hide it automatically (so the room is protected while no admin is online);
// admins hide messages, mute players and work through the reports list.

export const CHAT_MAX_MESSAGE_LENGTH = 500;
export const CHAT_DEFAULT_LIMIT = 50;
export const CHAT_MAX_LIMIT = 100;
/** Minimum gap between two messages from one player. */
export const CHAT_MIN_SECONDS_BETWEEN_MESSAGES = 2;
/** At most this many messages per player in any rolling minute. */
export const CHAT_MAX_MESSAGES_PER_MINUTE = 12;
/** Reports from this many different players hide a message until an admin looks. */
export const CHAT_AUTO_HIDE_REPORTS = 3;
export const CHAT_REPORT_REASON_MAX_LENGTH = 200;
/** Admin mute length when none is given, and the longest allowed. */
export const CHAT_MUTE_DEFAULT_HOURS = 24;
export const CHAT_MUTE_MAX_HOURS = 24 * 30;
