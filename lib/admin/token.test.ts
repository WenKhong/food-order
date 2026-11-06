import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, isCorrectPassword, isValidSessionToken, SESSION_MAX_AGE_SECONDS } from './token';

const secret = 'correct horse battery staple';
const now = Date.UTC(2026, 10, 7, 12, 0, 0);
const token = createSessionToken(secret, now);

test('a fresh token is valid', () => {
  assert.equal(isValidSessionToken(token, secret, now), true);
  assert.equal(isValidSessionToken(token, secret, now + 60 * 60 * 1000), true); // an hour later
});

test(`a token expires after ${SESSION_MAX_AGE_SECONDS / 3600} hours`, () => {
  assert.equal(isValidSessionToken(token, secret, now + SESSION_MAX_AGE_SECONDS * 1000 + 1), false);
});

test('editing the expiry to extend the session breaks the signature', () => {
  const [expiresAt, signature] = token.split('.');
  const extended = `${Number(expiresAt) + 24 * 60 * 60 * 1000}.${signature}`;
  assert.equal(isValidSessionToken(extended, secret, now), false);
});

test('a tampered signature is rejected', () => {
  const [expiresAt, signature] = token.split('.');
  const flipped = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A');
  assert.equal(isValidSessionToken(`${expiresAt}.${flipped}`, secret, now), false);
});

test('a token signed with a different secret (e.g. an old password) is rejected', () => {
  assert.equal(isValidSessionToken(token, 'a different password', now), false);
});

test('missing or malformed tokens are rejected without throwing', () => {
  for (const bad of [undefined, '', 'garbage', 'a.b', '123', `${token}.extra`, '.']) {
    assert.equal(isValidSessionToken(bad, secret, now), false, `should reject ${bad}`);
  }
});

test('password check: exact match only, any length, never throws', () => {
  assert.equal(isCorrectPassword(secret, secret), true);
  assert.equal(isCorrectPassword(secret + ' ', secret), false);
  assert.equal(isCorrectPassword('', secret), false);
  assert.equal(isCorrectPassword('x'.repeat(500), secret), false);
});
