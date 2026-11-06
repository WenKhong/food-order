import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from '@/lib/env';

// The app's only way to reach the database. It uses the secret key, which bypasses
// RLS, so this module must never end up in the browser: the `server-only` import
// makes the build fail if a Client Component imports it, even indirectly.
let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = supabaseEnv();
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      // Nobody logs in through this client, so there is no session to store or refresh.
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
