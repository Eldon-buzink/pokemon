import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getTcgplayerMarketPrice } from '../lib/sources/tcgplayer';
import { getPriceChartingSold } from '../lib/sources/pricecharting';
import type { CardKey, MarketPrice } from '../lib/sources/types';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE!);

async function resolveSourceSetNames(canonicalSetId:string) {
  const { data } = await supabase.from('source_set_map').select('*').eq('canonical_set_id', canonicalSetId);
  const map: Record<string, { name:string; range?:[number,number] }[]> = {};
  for (const row of data || []) {
    const rng = row.number_range ? row.number_range.split('-').map((n:string)=>parseInt(n,10)) as [number,number] : undefined;
    map[row.source] ??= [];
    map[row.source].push({ name: row.source_set_name, range: rng });
  }
  return map;
}

function inRange(numStr:string, range?:[number,number]) {
  if (!range) return true;
  const n = parseInt(numStr,10);
  return n>=range[0] && n<=range[1];
}

export async function syncPricesForSet(setId: string) {
  const { data: cards } = await supabase.from('cards').select('id, set_id, number, name').eq('set_id', setId);
  if (!cards?.length) return { priced:0 };

  const setMap = await resolveSourceSetNames(setId);

  let priced = 0;
  for (const c of cards) {
    const key: CardKey = { setId, number: c.number, name: c.name };

    // TCGplayer
    for (const entry of (setMap['tcgplayer'] || [{ name: c.set_id }])) {
      if (!inRange(c.number, entry.range)) continue;
      const p = await getTcgplayerMarketPrice(key, entry.name);
      if (p) {
        await supabase.from('prices').upsert({ card_id: c.id, source: p.source, raw_cents: p.rawCents ?? null, psa10_cents: p.psa10Cents ?? null, currency: p.currency, ts: p.ts, notes: p.notes });
        priced++;
        break;
      }
    }

    // PriceCharting
    for (const entry of (setMap['pricecharting'] || [{ name: c.set_id }])) {
      if (!inRange(c.number, entry.range)) continue;
      const p = await getPriceChartingSold(key, entry.name);
      if (p) {
        await supabase.from('prices').upsert({ card_id: c.id, source: p.source, raw_cents: p.rawCents ?? null, psa10_cents: p.psa10Cents ?? null, currency: p.currency, ts: p.ts, notes: p.notes });
        priced++;
        break;
      }
    }
    await new Promise(r=>setTimeout(r, 1000)); // be nice to APIs
  }
  return { priced };
}
