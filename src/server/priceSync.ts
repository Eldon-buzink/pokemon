import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { CardKey } from '../lib/sources/types';
import { getPtgioPrices } from '../lib/sources/pokemontcgio';
import { getPptPrice } from '../lib/sources/ppt';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));

export async function syncPricesForSet(setId: string) {
  console.log(`🎯 Starting price sync for set: ${setId}`);
  
  // Target specific Celebrations sets or the provided setId
  const targetSets = setId === 'celebrations' ? ['cel25', 'cel25c'] : [setId];
  
  const { data: cards, error } = await supabase
    .from('cards')
    .select('card_id,set_id,number,name')  // Use card_id instead of id
    .in('set_id', targetSets);
    
  if (error) {
    console.error(`❌ Error fetching cards for ${setId}:`, error);
    throw error;
  }
  
  if (!cards?.length) {
    console.log(`⚠️ No cards found for set(s): ${targetSets.join(', ')}`);
    return { priced: 0, cards: 0 };
  }
  
  console.log(`📊 Found ${cards.length} cards to sync prices for`);
  let priced = 0;
  
  for (const c of cards) {
    const key: CardKey = { setId: c.set_id, number: c.number, name: c.name };
    
    try {
      // PokémonTCG.io (TCGplayer + Cardmarket)
      const { tcg, cm } = await getPtgioPrices(key);
      
      for (const p of [tcg, cm].filter(Boolean)) {
        if (!p) continue;
        
        const { error: upsertError } = await supabase.from('prices').upsert({
          card_id: c.card_id,  // IMPORTANT: use card_id (not id)
          source: p.source,
          raw_cents: p.rawCents ?? null,
          psa10_cents: p.psa10Cents ?? null,
          currency: p.currency,
          ts: p.ts,
          notes: p.notes
        });
        
        if (upsertError) {
          console.error(`❌ Error upserting price for ${c.name}:`, upsertError);
        } else {
          priced++;
        }
      }
      
      // PPT enrichment (PSA10 / comps) - optional
      try {
        const ppt = await getPptPrice(key);
        if (ppt) {
          const { error: pptError } = await supabase.from('prices').upsert({
            card_id: c.card_id,
            source: ppt.source,
            raw_cents: ppt.rawCents ?? null,
            psa10_cents: ppt.psa10Cents ?? null,
            currency: ppt.currency,
            ts: ppt.ts,
            notes: ppt.notes
          });
          
          if (!pptError) {
            priced++;
          }
        }
      } catch (pptError) {
        // PPT is optional, don't fail the whole sync
        console.log(`⚠️ PPT price fetch failed for ${c.name} (optional)`);
      }
      
      // Progress logging
      if ((cards.indexOf(c) + 1) % 5 === 0) {
        console.log(`📝 Processed ${cards.indexOf(c) + 1}/${cards.length} cards...`);
      }
      
    } catch (cardError) {
      console.error(`❌ Error processing card ${c.name}:`, cardError);
    }
    
    await sleep(300); // keep it gentle
  }
  
  console.log(`✅ Price sync complete: ${priced} prices synced for ${cards.length} cards`);
  return { priced, cards: cards.length };
}
