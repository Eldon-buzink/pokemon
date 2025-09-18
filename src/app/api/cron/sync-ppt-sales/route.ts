import { NextResponse } from 'next/server';
import { getServiceClient } from '@/server/supabase';
import { pptFetchSales } from '@/lib/sources/ppt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPPORTED = new Set(['cel25c']); // PPT coverage allowlist

export async function GET(req: Request) {
  // Lazy init here (NOT at module scope)
  const db = getServiceClient();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: 'Supabase service env vars missing (SUPABASE_SERVICE_ROLE[_KEY], NEXT_PUBLIC_SUPABASE_URL)' },
      { status: 500 }
    );
  }

  const u = new URL(req.url);
  const set = u.searchParams.get('set') || 'cel25c';
  if (!SUPPORTED.has(set)) {
    return NextResponse.json({ ok:false, error:`PPT sales not available for set ${set}` }, { status: 400 });
  }

  const { data: cards, error } = await db
    .from('cards')
    .select('card_id,set_id,number,name')
    .eq('set_id', set);

  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });

  console.log(`🎯 Starting PPT sales sync for ${set}: ${cards?.length || 0} cards`);

  let wrote = 0;
  for (const c of cards || []) {
    const sales = await pptFetchSales({ setId: c.set_id, number: c.number, name: c.name });
    for (const s of sales) {
      const { error: insErr } = await db.from('graded_sales').insert({
        card_id: c.card_id,
        grade: s.grade ?? 0,            // RAW=0, PSA10=10
        sold_date: s.soldDate,
        price: s.priceCents / 100,
        source: s.source,
        listing_id: null
      });
      if (!insErr) wrote++;
    }
    await new Promise(r=>setTimeout(r,120));
  }

  return NextResponse.json({ ok:true, set, wrote });
}
