import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPptSales, getPptSummary } from '@/lib/sources/ppt';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const SUPPORTED = new Set(['cel25', 'cel25c']); // allowlist PPT sets (expand later)

export async function GET(req: Request) {
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

  let wroteSales = 0, wroteSummary = 0;
  for (const c of cards ?? []) {
    try {
      console.log(`📊 Processing ${c.name} #${c.number}`);
      
      // Get sales data (graded and raw)
      const sales = await getPptSales({ setId: c.set_id, number: c.number, name: c.name });
      console.log(`  Found ${sales.length} sales`);

      for (const s of sales) {
        // PSA graded → graded_sales; raw (no grade) we'll put in graded_sales with grade=0
        const gradeValue = s.grade && s.grade > 0 ? s.grade : 0;
        
        try {
          const { error: insertError } = await db.from('graded_sales').insert({
            card_id: c.card_id,
            grade: gradeValue,
            sold_date: s.soldDate?.slice(0,10) || new Date().toISOString().slice(0,10),
            price: s.priceCents / 100,
            source: s.source || 'ppt-ebay',
            listing_id: null
          });
          
          if (!insertError) {
            wroteSales++;
            console.log(`  ✅ Sale: Grade ${gradeValue}, $${(s.priceCents/100).toFixed(2)}`);
          } else {
            console.log(`  ⚠️ Sale insert error:`, insertError.message);
          }
        } catch (err) {
          console.log(`  ❌ Sale insert failed:`, err);
        }
      }

      // Also capture PPT summary (fast path) once per card (raw + psa10)
      const summary = await getPptSummary({ setId: c.set_id, number: c.number, name: c.name });
      if (summary) {
        try {
          const { error: upsertError } = await db.from('prices').upsert({
            card_id: c.card_id,
            source: 'ppt',
            raw_cents: summary.rawCents ?? null,
            psa10_cents: summary.psa10Cents ?? null,
            currency: summary.currency,
            ts: summary.ts,
            notes: summary.notes
          });
          
          if (!upsertError) {
            wroteSummary++;
            console.log(`  ✅ Summary: Raw $${summary.rawCents ? (summary.rawCents/100).toFixed(2) : 'N/A'}, PSA10 $${summary.psa10Cents ? (summary.psa10Cents/100).toFixed(2) : 'N/A'}`);
          } else {
            console.log(`  ⚠️ Summary upsert error:`, upsertError.message);
          }
        } catch (err) {
          console.log(`  ❌ Summary upsert failed:`, err);
        }
      }

      await new Promise(r=>setTimeout(r,150)); // be gentle to the API
    } catch (error) {
      console.error(`💥 Error processing ${c.name}:`, error);
    }
  }

  console.log(`✅ PPT sales sync complete: ${wroteSales} sales, ${wroteSummary} summaries`);
  return NextResponse.json({ 
    ok:true, 
    set, 
    total: cards?.length || 0,
    wroteSales, 
    wroteSummary,
    message: `PPT sales sync complete for ${set}: ${wroteSales} sales, ${wroteSummary} summaries`
  });
}
