import 'server-only';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { adminPassword } from '@/lib/env';
import { createSessionToken, isValidSessionToken, SESSION_MAX_AGE_SECONDS } from './token';

const COOKIE = 'us_admin';
const PATH = '/admin';

// Checked by the admin page and by every admin Server Action.
export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  // The expiry check reads the clock. connection() tells Next.js this only runs
  // for a real request, never while prerendering (Cache Components flags any
  // clock read during a prerender).
  await connection();
  return isValidSessionToken(token, adminPassword(), Date.now());
}

export async function startAdminSession() {
  (await cookies()).set(COOKIE, createSessionToken(adminPassword()), {
    httpOnly: true, // page scripts can't read it, so injected JS can't steal it
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // never sent on requests started from another site
    path: PATH, // only sent to admin pages
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endAdminSession() {
  (await cookies()).delete({ name: COOKIE, path: PATH });
}
