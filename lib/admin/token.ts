import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// The admin is signed in by a cookie holding "<expiry time>.<signature>".
// The signature is an HMAC of the expiry, keyed with the admin password, so:
// - nobody can make a valid token without knowing the password;
// - the expiry can't be pushed back by editing the cookie;
// - changing ADMIN_PASSWORD signs every existing session out.
// Pure functions (no cookies, no env), so they're easy to test.

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // one shift

function sign(expiresAt: number, secret: string) {
  return createHmac('sha256', secret).update(`admin-session:${expiresAt}`).digest('base64url');
}

export function createSessionToken(secret: string, now = Date.now()): string {
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

export function isValidSessionToken(token: string | undefined, secret: string, now = Date.now()): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const expiresAt = Number(parts[0]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  return safeEqual(parts[1], sign(expiresAt, secret));
}

export function isCorrectPassword(attempt: string, password: string): boolean {
  return safeEqual(attempt, password);
}

// Compares in constant time, so how long the check takes can't reveal how much
// of a guess was right. Hashing first gives timingSafeEqual the equal-length
// inputs it needs, without revealing the real value's length.
function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}
