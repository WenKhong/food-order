import 'server-only';
import { z } from 'zod';

// Secrets come from .env.local locally and from Vercel's environment settings in
// production, never from code. Each getter validates on first use, so a missing or
// malformed value fails with a clear message instead of an odd error deep inside
// a library. The messages name the variable, never its value.

const SupabaseEnv = z.object({
  SUPABASE_URL: z.url('SUPABASE_URL must be a URL'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string('SUPABASE_SERVICE_ROLE_KEY is missing')
    .startsWith('sb_secret_', 'SUPABASE_SERVICE_ROLE_KEY must be a Supabase secret key (sb_secret_...)'),
});

export function supabaseEnv() {
  const result = SupabaseEnv.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid server environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
