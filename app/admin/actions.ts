'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import { endAdminSession, isAdmin, startAdminSession } from '@/lib/admin/session';
import { isCorrectPassword } from '@/lib/admin/token';
import { adminPassword } from '@/lib/env';
import { updateOrderStatus } from '@/lib/orders/queries';
import { canMoveTo } from '@/lib/orders/status';
import { OrderStatus } from '@/lib/schemas/order';

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

// Only a reference and the change come from the browser: which order, the
// status the admin saw, and the status they want.
const StatusChange = z.object({
  orderId: z.uuid(),
  from: OrderStatus,
  to: OrderStatus,
});

export async function changeOrderStatus(formData: FormData) {
  // Only showing the buttons to signed-in staff is not a security boundary:
  // anyone can POST to this action. So the session is checked here, every time.
  if (!(await isAdmin())) {
    refresh(); // re-renders /admin, which shows the sign-in form
    return;
  }

  const change = StatusChange.safeParse({
    orderId: formData.get('orderId'),
    from: formData.get('from'),
    to: formData.get('to'),
  });
  if (!change.success || !canMoveTo(change.data.from, change.data.to)) {
    return; // malformed, or not an allowed step: change nothing
  }

  await updateOrderStatus(change.data.orderId, change.data.from, change.data.to);
  refresh(); // re-render the board with the new status in this same round trip
}
