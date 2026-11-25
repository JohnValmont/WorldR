/**
 * Chat moderation rules (services/chat.rules.ts, constants/chat.ts).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { canSeeMessage, isMuted, muteHours, rateLimitReason, shouldAutoHide } from '../src/api/services/chat.rules';
import {
  CHAT_AUTO_HIDE_REPORTS, CHAT_MAX_MESSAGES_PER_MINUTE, CHAT_MIN_SECONDS_BETWEEN_MESSAGES,
  CHAT_MUTE_DEFAULT_HOURS, CHAT_MUTE_MAX_HOURS,
} from '../src/api/constants/chat';

const NOW = Date.UTC(2026, 11, 5, 13, 0);
const sec = (s: number) => new Date(NOW - s * 1000);

describe('Chat moderation', () => {
  it('a message hides itself only once enough different players report it', () => {
    assert.strictEqual(CHAT_AUTO_HIDE_REPORTS >= 2, true, 'one player alone must never be able to hide a message');
    assert.strictEqual(shouldAutoHide(CHAT_AUTO_HIDE_REPORTS - 1), false);
    assert.strictEqual(shouldAutoHide(CHAT_AUTO_HIDE_REPORTS), true);
  });

  it('a mute runs until its time, then ends by itself', () => {
    assert.strictEqual(isMuted(null, NOW), false);
    assert.strictEqual(isMuted(new Date(NOW + 60_000), NOW), true);
    assert.strictEqual(isMuted(new Date(NOW - 1), NOW), false);
    assert.strictEqual(isMuted('not a date', NOW), false);
  });

  it('mute length: default when missing, clamped to 1 hour .. the maximum', () => {
    assert.strictEqual(muteHours(undefined), CHAT_MUTE_DEFAULT_HOURS);
    assert.strictEqual(muteHours('abc'), CHAT_MUTE_DEFAULT_HOURS);
    assert.strictEqual(muteHours(0.2), 1);
    assert.strictEqual(muteHours(10_000), CHAT_MUTE_MAX_HOURS);
    assert.strictEqual(muteHours(6), 6);
  });

  it('rate limit: a short gap between messages, and a cap per minute', () => {
    assert.strictEqual(rateLimitReason([], NOW), null);
    assert.notStrictEqual(rateLimitReason([sec(CHAT_MIN_SECONDS_BETWEEN_MESSAGES / 2)], NOW), null);
    assert.strictEqual(rateLimitReason([sec(CHAT_MIN_SECONDS_BETWEEN_MESSAGES + 1)], NOW), null);
    const burst = Array.from({ length: CHAT_MAX_MESSAGES_PER_MINUTE }, (_, i) => sec(5 + i * 4));
    assert.match(rateLimitReason(burst, NOW) ?? '', /a minute/);
    const older = Array.from({ length: CHAT_MAX_MESSAGES_PER_MINUTE }, (_, i) => sec(61 + i));
    assert.strictEqual(rateLimitReason(older, NOW), null, 'messages over a minute old do not count');
  });

  it('a player can only report what they can see', () => {
    const me = { characterId: 'me', rooms: ['world', 'nation:westmark'] };
    assert.strictEqual(canSeeMessage({ channel: 'world', character_id: 'x', target_character_id: null }, me), true);
    assert.strictEqual(canSeeMessage({ channel: 'nation:westmark', character_id: 'x', target_character_id: null }, me), true);
    assert.strictEqual(canSeeMessage({ channel: 'nation:national', character_id: 'x', target_character_id: null }, me), false);
    assert.strictEqual(canSeeMessage({ channel: 'party:9', character_id: 'x', target_character_id: null }, me), false);
    assert.strictEqual(canSeeMessage({ channel: 'private', character_id: 'x', target_character_id: 'me' }, me), true);
    assert.strictEqual(canSeeMessage({ channel: 'private', character_id: 'x', target_character_id: 'y' }, me), false);
  });
});
