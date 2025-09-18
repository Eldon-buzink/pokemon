import { getServiceClient } from '@/server/supabase';

export async function readCache(setId:string, number:string, kind:'sales'|'summary', maxAgeMin=1440){
  const db = getServiceClient(); if (!db) return null;
  const { data } = await db
    .from('ppt_cache')
    .select('payload, fetched_at')
    .eq('set_id', setId).eq('number', number).eq('kind', kind)
    .maybeSingle();
  if (!data) return null;
  const ageMin = (Date.now() - new Date(data.fetched_at).getTime())/60000;
  if (ageMin > maxAgeMin) return null;
  return data.payload;
}

export async function writeCache(setId:string, number:string, kind:'sales'|'summary', payload:any){
  const db = getServiceClient(); if (!db) return;
  await db.from('ppt_cache').upsert({ set_id:setId, number, kind, payload, fetched_at: new Date().toISOString() });
}

export async function canAttempt(setId:string, number:string){
  const db = getServiceClient(); if (!db) return false;
  const { data } = await db
    .from('ppt_throttle')
    .select('next_earliest')
    .eq('set_id', setId).eq('number', number)
    .maybeSingle();
  if (!data || !data.next_earliest) return true;
  return new Date(data.next_earliest).getTime() <= Date.now();
}

export async function noteAttempt(setId:string, number:string, status:'ok'|'429'|'err'){
  const db = getServiceClient(); if (!db) return;
  // backoff rules: ok => next in 24h; 429 => +60 min; err => +15 min
  const now = Date.now();
  const addMin = status==='ok' ? 24*60 : status==='429' ? 60 : 15;
  const next = new Date(now + addMin*60000).toISOString();
  await db.from('ppt_throttle').upsert({
    set_id: setId, number,
    last_attempt: new Date(now).toISOString(),
    next_earliest: next,
    last_status: status
  });
}
