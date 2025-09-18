// src/server/supabase.ts
import { createClient } from '@supabase/supabase-js';

export function getServiceClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL; // fallback if you use this name
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE; // allow either env name

  if (!url || !key) {
    // Return null instead of throwing at import/build time.
    return null;
  }
  return createClient(url, key);
}

export function getAnonClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
