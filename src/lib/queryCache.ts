// Query cache system for eBay API calls
import crypto from "crypto";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function qhash(s: string) { 
  return crypto.createHash("sha1").update(s).digest("hex"); 
}

export async function getCached(q: string, page: number) {
  const key = qhash(`${page}:${q}`);
  
  try {
    const { data } = await supabase
      .from("ebay_query_cache")
      .select("payload, fetched_at")
      .eq("qhash", key)
      .maybeSingle();
    
    if (!data) return null;
    
    const fresh = Date.now() - new Date(data.fetched_at).getTime() < 12 * 60 * 60 * 1000;
    return fresh ? data.payload : null;
  } catch (error) {
    // If table doesn't exist, return null (will be created on first write)
    return null;
  }
}

export async function setCached(q: string, page: number, payload: any) {
  const key = qhash(`${page}:${q}`);
  
  try {
    await supabase.from("ebay_query_cache").upsert({
      qhash: key, 
      query: q, 
      page, 
      payload
    });
  } catch (error) {
    // If table doesn't exist, ignore (will be created later)
    console.warn('Could not cache query:', error);
  }
}
