'use server';

import { z } from 'zod';
import { endAdminSession, startAdminSession } from '@/lib/admin/session';
import { isCorrectPassword } from '@/lib/admin/token';
import { adminPassword } from '@/lib/env';

// Server Actions are public POST endpoints: anyone can call them without the UI.
// So every input is validated here, and admin-only actions check the session.

export type LoginState = { error?: string };

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const attempt = z.string().max(200).safeParse(formData.get('password'));
  if (!attempt.success || !isCorrectPassword(attempt.data, adminPassword())) {
    // A short pause on every wrong guess slows down password guessing.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: 'That password is not right.' };
  }
  // Setting the cookie makes Next.js re-render /admin in this same round trip,
  // so the order board appears without a redirect.
  await startAdminSession();
  return {};
}

export async function logout() {
  await endAdminSession();
}
