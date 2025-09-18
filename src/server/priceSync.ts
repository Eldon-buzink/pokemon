import 'server-only';
import { getServiceClient } from '@/server/supabase';
import { getPtgioPricesById } from '@/lib/sources/pokemontcgio';
import { getPptPrice, supportsPPT } from '@/lib/sources/ppt';

const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));

export async function syncPricesForSet(setId: string) {
  const db = getServiceClient();
  if (!db) throw new Error('Supabase service env missing');
  console.log(`🎯 Starting price sync for set: ${setId}`);
  
  const { data: cards, error } = await db
    .from('cards')
    .select('card_id,set_id,number,name')  // Use card_id instead of id
    .eq('set_id', setId);
    
  if (error) {
    console.error(`❌ Error fetching cards for ${setId}:`, error);
    throw error;
  }
  
  if (!cards?.length) {
    console.log(`⚠️ No cards found for set: ${setId}`);
    return { priced: 0, cards: 0 };
  }
  
  console.log(`📊 Found ${cards.length} cards to sync prices for`);
  let priced = 0;
  
  // PPT integration will be handled per-card with the improved adapter
  
  for (const c of cards) {
    try {
      // PTCG.io -> TCGplayer + Cardmarket (by official card_id)
      const { tcg, cm } = await getPtgioPricesById(c.card_id);
      const rows = [tcg, cm].filter(Boolean) as any[];

      // ✅ PPT enrichment (using improved adapter with eBay data)
      if (supportsPPT(c.set_id)) {
        const ppt = await getPptPrice({ setId: c.set_id, number: c.number, name: c.name });
        if (ppt) {
          rows.push(ppt);
          console.log(`✅ PPT: ${c.name} #${c.number} - Raw: $${ppt.rawCents ? (ppt.rawCents/100).toFixed(2) : 'N/A'}, PSA10: $${ppt.psa10Cents ? (ppt.psa10Cents/100).toFixed(2) : 'N/A'}`);
        } else {
          console.log(`⚠️ PPT: No data for ${c.name} #${c.number}`);
        }
      } else {
        console.debug(`Skipping PPT for unsupported set: ${c.set_id}`);
      }
      
      for (const p of rows) {
        const { error: upErr } = await db.from('prices').upsert({
          card_id: c.card_id,     // <-- match cards.card_id
          source: p.source,
          raw_cents: p.rawCents ?? null,
          psa10_cents: p.psa10Cents ?? null,
          currency: p.currency,
          ts: p.ts,
          notes: p.notes
        });
        
        if (!upErr) priced++;
        else console.error('upsert error', c.card_id, p.source, upErr.message);
      }
      
      // Progress logging
      if ((cards.indexOf(c) + 1) % 5 === 0) {
        console.log(`📝 Processed ${cards.indexOf(c) + 1}/${cards.length} cards...`);
      }
      
    } catch (e: any) {
      console.error('fetch error', c.card_id, e?.message || e);
    }
    
    await sleep(250);
  }
  
  console.log(`✅ Price sync complete: ${priced} prices synced for ${cards.length} cards`);
  return { priced, setId };
}
