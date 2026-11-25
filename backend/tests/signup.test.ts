/**
 * Closed-alpha invite code (services/signup.rules.ts).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { inviteCodeAccepted, normaliseInviteCode } from '../src/api/services/signup.rules';

describe('Invite-only sign-up', () => {
  it('no code configured: everyone may sign up', () => {
    assert.strictEqual(inviteCodeAccepted(undefined, undefined), true);
    assert.strictEqual(inviteCodeAccepted('', 'anything'), true);
    assert.strictEqual(inviteCodeAccepted('   ', undefined), true);
  });

  it('code configured: the right code gets in, ignoring case and spaces', () => {
    assert.strictEqual(inviteCodeAccepted('Drennia 2026', 'drennia2026'), true);
    assert.strictEqual(inviteCodeAccepted('Drennia 2026', ' DRENNIA 2026 '), true);
  });

  it('code configured: a missing, empty or wrong code is refused', () => {
    assert.strictEqual(inviteCodeAccepted('Drennia2026', undefined), false);
    assert.strictEqual(inviteCodeAccepted('Drennia2026', ''), false);
    assert.strictEqual(inviteCodeAccepted('Drennia2026', 'Drennia2025'), false);
    assert.strictEqual(inviteCodeAccepted('Drennia2026', 12345 as unknown), false);
  });

  it('normalising never throws on odd input', () => {
    assert.strictEqual(normaliseInviteCode(null), '');
    assert.strictEqual(normaliseInviteCode({}), '');
  });
});
