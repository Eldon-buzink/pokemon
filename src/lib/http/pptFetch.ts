import { readCache, writeCache, canAttempt, noteAttempt } from '@/server/pptStore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const BASE = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
const KEY  = process.env.PPT_API_KEY;

// Debug logging
if (!KEY) {
  console.warn('⚠️ PPT_API_KEY not found in pptFetch.ts');
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('PPT')));
}

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

function getRetryAfterSeconds(h: Headers){
  const ra = h.get('retry-after'); if (ra && !isNaN(+ra)) return Math.max(1, Math.min(300, +ra));
  const reset = h.get('x-ratelimit-reset'); if (reset && !isNaN(+reset)) {
    const s = +reset - Math.floor(Date.now()/1000);
    if (s>0) return Math.min(300, s);
  }
  return null;
}

export async function pptFetchCached(opts:{
  setId:string, number:string, kind:'sales'|'summary', path:string,
  useCacheMin?: number, // default 1440 (24h)
  maxAttempts?: number, // default 3
  initialDelayMs?: number // default 0
}){
  const { setId, number, kind, path } = opts;
  const useCacheMin = opts.useCacheMin ?? 1440;
  const maxAttempts = opts.maxAttempts ?? 3;
  const initialDelayMs = opts.initialDelayMs ?? 0;

  if (!KEY) throw new Error('Missing PPT_API_KEY');

  // 1) Fast cache
  const cached = await readCache(setId, number, kind, useCacheMin);
  if (cached) {
    console.log(`[PPT Cache] Hit for ${setId}#${number} (${kind})`);
    return { ok:true, json: cached, cached: true };
  }

  // 2) Throttle gate
  const allowed = await canAttempt(setId, number);
  if (!allowed) {
    console.log(`[PPT Cache] Throttled for ${setId}#${number}, skipping`);
    return { ok:false, code:'cooldown', json: null };
  }

  if (initialDelayMs) await sleep(initialDelayMs);

  console.log(`[PPT Cache] Fetching ${setId}#${number} (${kind}) from API`);

  let attempt = 0, backoff = 1500;
  while (attempt < maxAttempts) {
    attempt++;
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${KEY}` },
      cache: 'no-store'
    });
    
    if (res.status === 429) {
      const wait = (getRetryAfterSeconds(res.headers) ?? backoff) * 1000 + Math.floor(Math.random()*300);
      console.warn(`[PPT Cache] 429 on ${path} (attempt ${attempt}/${maxAttempts}), waiting ${Math.round(wait)}ms`);
      await noteAttempt(setId, number, '429');
      await sleep(wait);
      backoff = Math.min(backoff * 2, 10000)/1000; // keep seconds
      continue;
    }
    
    if (!res.ok) {
      console.warn(`[PPT Cache] HTTP ${res.status} on ${path}`);
      await noteAttempt(setId, number, 'err');
      return { ok:false, code:`http_${res.status}`, json: await res.text().catch(()=>null) };
    }
    
    const json = await res.json().catch(()=>null);
    if (json) {
      console.log(`[PPT Cache] Success for ${setId}#${number}, caching for 24h`);
      await writeCache(setId, number, kind, json);
      await noteAttempt(setId, number, 'ok');
      return { ok:true, json, cached: false };
    }
    
    console.warn(`[PPT Cache] Parse error on ${path}`);
    await noteAttempt(setId, number, 'err');
    return { ok:false, code:'parse', json:null };
  }
  
  console.warn(`[PPT Cache] Exhausted retries for ${setId}#${number}`);
  await noteAttempt(setId, number, '429');
  return { ok:false, code:'exhausted', json:null };
}