import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPptPrice, supportsPPT } from '@/lib/sources/ppt';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const SUPPORTED = new Set(['cel25', 'cel25c']); // PPT coverage allowlist

export async function GET(req: Request) {
  const u = new URL(req.url);
  const set = u.searchParams.get('set') || 'cel25c';
  
  if (!SUPPORTED.has(set)) {
    return NextResponse.json({ 
      ok: false, 
      error: `PPT not available for set ${set}. Try ?set=cel25c.`,
      supported: Array.from(SUPPORTED)
    }, { status: 400 });
  }

  const { data: cards, error } = await db
    .from('cards')
    .select('card_id,set_id,number,name')
    .eq('set_id', set);

  if (error) {
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }

  if (!cards?.length) {
    return NextResponse.json({ 
      ok: false, 
      error: `No cards found for set ${set}` 
    }, { status: 404 });
  }

  console.log(`🎯 Starting PPT-only sync for set: ${set} (${cards.length} cards)`);
  let wrote = 0;
  let skipped = 0;
  
  for (const c of cards) {
    try {
      const ppt = await getPptPrice({ setId: c.set_id, number: c.number, name: c.name });
      if (ppt) {
        const { error: upErr } = await db.from('prices').upsert({
          card_id: c.card_id, 
          source: 'ppt',
          raw_cents: ppt.rawCents ?? null,
          psa10_cents: ppt.psa10Cents ?? null,
          currency: ppt.currency, 
          ts: ppt.ts, 
          notes: ppt.notes
        });
        if (!upErr) {
          wrote++;
          console.log(`✅ PPT: Synced ${c.name} #${c.number}`);
        } else {
          console.error(`❌ PPT upsert error for ${c.name}:`, upErr.message);
        }
      } else {
        skipped++;
        console.log(`⚠️ PPT: No data found for ${c.name} #${c.number}`);
      }
      // Rate limiting
      await new Promise(r => setTimeout(r, 150));
    } catch (error) {
      console.error(`💥 PPT fetch error for ${c.name}:`, error);
      skipped++;
    }
  }
  
  console.log(`✅ PPT sync complete: ${wrote} prices synced, ${skipped} skipped`);
  return NextResponse.json({ 
    ok: true, 
    set, 
    total: cards.length,
    wrote, 
    skipped,
    message: `PPT sync complete for ${set}: ${wrote}/${cards.length} cards synced`
  });
}