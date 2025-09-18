import { NextResponse } from 'next/server';
import { getServiceClient } from '@/server/supabase';
import { pptFetchSales } from '@/lib/sources/ppt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPPORTED = new Set(['cel25c']);
const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));

export async function GET(req: Request) {
  const db = getServiceClient();
  if (!db) return NextResponse.json({ ok:false, error:'Supabase service env missing' }, { status: 500 });

  const u = new URL(req.url);
  const set = u.searchParams.get('set') || 'cel25c';
  const limit = Number(u.searchParams.get('limit') || 8);
  const offset = Number(u.searchParams.get('offset') || 0);
  const minUsd = Number(u.searchParams.get('minUsd') || 1000); // only cards worth >= $10 raw

  if (!SUPPORTED.has(set)) return NextResponse.json({ ok:false, error:`PPT sales not available for ${set}` }, { status: 400 });

  console.log(`[PPT Sync] Starting sync for ${set}, limit=${limit}, offset=${offset}, minUsd=${minUsd/100}`);

  // Join with latest to prioritize higher-value cards
  const { data: rows, error } = await db
    .from('v_cards_latest')
    .select('card_id,set_id,number,name,tcg_raw_cents,cm_raw_cents,ppt_raw_cents')
    .eq('set_id', set);

  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });

  // Estimate USD if needed
  const eurusd = Number(process.env.MANUAL_EURUSD || '1.08');
  const sorted = (rows||[])
    .map(r=>{
      const usd = r.ppt_raw_cents ?? r.tcg_raw_cents ?? (r.cm_raw_cents ? Math.round((r.cm_raw_cents/100)*eurusd*100) : null);
      return { ...r, est_usd: usd };
    })
    .filter(r=> (r.est_usd ?? 0) >= minUsd)
    .sort((a,b)=> (b.est_usd ?? 0) - (a.est_usd ?? 0));

  console.log(`[PPT Sync] Found ${sorted.length} cards above $${minUsd/100} threshold`);

  const slice = sorted.slice(offset, offset+limit);
  let wrote = 0, skipped = 0;

  console.log(`[PPT Sync] Processing ${slice.length} cards (${offset} to ${offset + slice.length - 1})`);

  for (const c of slice) {
    console.log(`[PPT Sync] Processing ${c.name} #${c.number} (~$${(c.est_usd || 0)/100})`);
    
    const sales = await pptFetchSales({ setId: c.set_id, number: c.number, name: c.name });
    
    if (sales.length === 0) {
      skipped++;
      console.log(`[PPT Sync] No sales data for ${c.name}`);
    }
    
    for (const s of sales) {
      const { error: insErr } = await db.from('graded_sales').insert({
        card_id: c.card_id,
        grade: s.grade ?? 0,
        sold_date: s.soldDate,
        price: s.priceCents / 100,
        source: s.source,
        listing_id: null
      });
      if (!insErr) {
        wrote++;
      } else {
        console.warn(`[PPT Sync] Insert error for ${c.name}:`, insErr.message);
      }
    }
    
    // Conservative pacing (2–4s) — very conservative for strict tiers
    await sleep(2000 + Math.floor(Math.random()*2000));
  }

  const nextOffset = offset + slice.length;
  const hasMore = sorted.length > nextOffset;
  
  console.log(`[PPT Sync] Complete: processed ${slice.length}, wrote ${wrote} sales, skipped ${skipped}`);

  return NextResponse.json({ 
    ok:true, 
    set, 
    wrote, 
    skipped,
    processed: slice.length,
    nextOffset: hasMore ? nextOffset : null, 
    totalCandidates: sorted.length,
    hasMore,
    message: `Processed ${slice.length} cards, wrote ${wrote} sales, skipped ${skipped}. ${hasMore ? `Next: offset=${nextOffset}` : 'Complete!'}`
  });
}