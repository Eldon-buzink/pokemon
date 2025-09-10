// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';

let cached: ReturnType<typeof createClient> | null = null;

/**
 * Returns a singleton Supabase server client.
 * Lazy-reads env vars at call time to avoid build-time failures.
 */
export function getServerSupabase() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Throw only when actually called at request time
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  cached = createClient(url, anon);
  return cached;
}
