#!/usr/bin/env tsx

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { findCompleted } from '../lib/sources/ebay';
import { qRaw, qPSA, CATEGORY_POKEMON_TCG } from '../lib/queries';
import { withinDays, aggregateWindow } from '../lib/stats';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DAYS = 30;

async function searchAllPages(query: string) {
  let page = 1, all: any[] = [];
  while (page <= 3) { // cap pages to be nice
    const { items, totalPages } = await findCompleted({ 
      query, 
      categoryId: CATEGORY_POKEMON_TCG, 
      pageNumber: page, 
      entriesPerPage: 100 
    });
    all = all.concat(items);
    if (page >= totalPages) break;
    page++;
  }
  return all.filter(i => withinDays(i.endTime, DAYS) && i.currency === "USD");
}

async function processCard(card: { set_id: string; number: string; name: string; set_name?: string }) {
  console.log(`🔍 Processing ${card.set_id} #${card.number} ${card.name}`);
  
  try {
    const rawItems = await searchAllPages(qRaw({ name: card.name, number: card.number, setName: card.set_name }));
    const psa10Items = await searchAllPages(qPSA({ name: card.name, number: card.number, setName: card.set_name, grade: 10 }));
    const psa9Items = await searchAllPages(qPSA({ name: card.name, number: card.number, setName: card.set_name, grade: 9 }));

    const today = new Date().toISOString().slice(0, 10);

    const rawAgg = aggregateWindow(rawItems.map(i => i.price), DAYS);
    const p10Agg = aggregateWindow(psa10Items.map(i => i.price), DAYS);
    const p9Agg = aggregateWindow(psa9Items.map(i => i.price), DAYS);

    console.log(`  📊 RAW: ${rawAgg.count} items, median: $${rawAgg.median?.toFixed(2) || 'N/A'}`);
    console.log(`  📊 PSA10: ${p10Agg.count} items, median: $${p10Agg.median?.toFixed(2) || 'N/A'}`);
    console.log(`  📊 PSA9: ${p9Agg.count} items, median: $${p9Agg.median?.toFixed(2) || 'N/A'}`);

    await supabase.from("price_history").upsert({
      set_id: card.set_id,
      number: card.number,
      date: today,
      raw_usd: rawAgg.median,
      psa10_usd: p10Agg.median,
      psa9_usd: p9Agg.median,
      raw_count: rawAgg.count,
      psa10_count: p10Agg.count,
      psa9_count: p9Agg.count
    });

    console.log(`  ✅ Updated price history for ${today}`);
    
  } catch (error) {
    console.error(`  ❌ Failed to process ${card.name}:`, (error as Error).message);
  }
}

async function main() {
  const setId = process.argv.includes("--set") ? process.argv[process.argv.indexOf("--set") + 1] : null;
  let cards: any[] = [];
  
  if (setId) {
    console.log(`🎯 Processing set: ${setId}`);
    const { data } = await supabase.from("v_cards_latest").select("set_id, number, name, set_name").eq("set_id", setId);
    cards = data ?? [];
  } else {
    console.log(`🎯 Processing all cards`);
    const { data } = await supabase.from("v_cards_latest").select("set_id, number, name, set_name").limit(100);
    cards = data ?? [];
  }

  console.log(`📦 Found ${cards.length} cards to process`);

  for (const card of cards) {
    await processCard(card);
    console.log(''); // Empty line for readability
  }
  
  console.log('🎉 eBay price refresh completed!');
}

main().catch(e => { 
  console.error('💥 Script failed:', e); 
  process.exit(1); 
});
