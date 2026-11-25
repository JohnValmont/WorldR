/**
 * Closed-alpha sign-up gate (pure rules; tests/signup.test.ts).
 * The invite code lives in the SIGNUP_ACCESS_CODE env var, never in code or the client.
 */
import crypto from 'crypto';

/** Case and spaces don't matter: "Drennia 2026" = "drennia2026". */
export function normaliseInviteCode(code: unknown): string {
  return typeof code === 'string' ? code.replace(/\s+/g, '').toLowerCase() : '';
}

/** True when sign-up is open (no code configured) or the given code matches. Constant-time compare. */
export function inviteCodeAccepted(required: string | undefined | null, given: unknown): boolean {
  const want = normaliseInviteCode(required);
  if (!want) return true;
  const got = normaliseInviteCode(given);
  const a = crypto.createHash('sha256').update(want).digest();
  const b = crypto.createHash('sha256').update(got).digest();
  return got.length > 0 && crypto.timingSafeEqual(a, b);
}
