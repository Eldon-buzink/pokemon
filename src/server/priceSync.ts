import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { CardKey } from '../lib/sources/types';
import { getPtgioPrices } from '../lib/sources/pokemontcgio';
import { getPptPrice } from '../lib/sources/ppt';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);
const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));

export async function syncPricesForSet(setId: string) {
  const { data: cards, error } = await supabase.from('cards').select('id,set_id,number,name').eq('set_id', setId);
  if (error) throw error;
  if (!cards?.length) return { priced:0 };
  let priced = 0;
  for (const c of cards) {
    const key: CardKey = { setId, number: c.number, name: c.name };
    // PokémonTCG.io (TCGplayer + Cardmarket)
    const { tcg, cm } = await getPtgioPrices(key);
    for (const p of [tcg, cm]) {
      if (!p) continue;
      await supabase.from('prices').upsert({
        card_id: c.id, source: p.source, raw_cents: p.rawCents ?? null, psa10_cents: p.psa10Cents ?? null,
        currency: p.currency, ts: p.ts, notes: p.notes
      });
      priced++;
    }
    // PPT enrichment (PSA10 / comps)
    try {
      const ppt = await getPptPrice(key);
      if (ppt) {
        await supabase.from('prices').upsert({
          card_id: c.id, source: ppt.source, raw_cents: ppt.rawCents ?? null, psa10_cents: ppt.psa10Cents ?? null,
          currency: ppt.currency, ts: ppt.ts, notes: ppt.notes
        });
        priced++;
      }
    } catch {}
    await sleep(350); // keep it gentle
  }
  return { priced };
}
