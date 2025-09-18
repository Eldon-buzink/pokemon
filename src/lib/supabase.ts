import { createClient } from '@supabase/supabase-js'

// Client-side supabase client (safe for browser)
export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Legacy export for backward compatibility
export const supabase = createSupabaseClient();

// Server-side client with service role key - DEPRECATED, use @/src/server/supabase instead
export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
