#!/usr/bin/env tsx

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { findCompleted } from '../lib/sources/ebay';
import { qRaw, qPSA, CATEGORY_POKEMON_TCG } from '../lib/queries';
import { withinDays, aggregateWindow } from '../lib/stats';
import { getCached, setCached } from '../lib/queryCache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Adaptive pager - stop when we have enough data
function shouldStop(prices: number[], page: number, kind: 'raw' | 'graded') {
  if (kind === 'raw' && prices.length >= 60) return true;
  if (kind !== 'raw' && prices.length >= 30) return true;
  if (page >= 3) return true;
  
  if (prices.length >= 20) {
    const sorted = prices.slice().sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = (q3 - q1) / ((q3 + q1) / 2 || 1);
    if (iqr < 0.10) return true;
  }
  return false;
}

async function searchAllPages(query: string, windowDays: number, budgetFn: () => Promise<any>) {
  let page = 1, all: any[] = [];
  
  while (page <= 3) {
    // Check cache first
    const key = `${query}::${CATEGORY_POKEMON_TCG}::page=${page}`;
    const cached = await getCached(key, page);
    
    let result;
    if (cached) {
      console.log(`  📦 Using cached data for page ${page}`);
      result = cached;
    } else {
      console.log(`  🔍 Fetching page ${page} from eBay...`);
      result = await budgetFn();
    }
    
    const { items, totalPages } = result;
    all = all.concat(items);
    
    // Cache the result
    if (!cached) {
      await setCached(key, page, { items, totalPages });
    }
    
    // Check if we should stop
    const prices = items.map(i => i.price);
    if (shouldStop(prices, page, 'raw')) {
      console.log(`  ⏹️ Stopping early - sufficient data (${all.length} items)`);
      break;
    }
    
    if (page >= totalPages) break;
    page++;
  }
  
  return all.filter(i => withinDays(i.endTime, windowDays) && i.currency === "USD");
}

async function getCheckpoint(setId: string, number: string) {
  try {
    const { data } = await supabase
      .from("ebay_card_checkpoint")
      .select("last_end_time")
      .eq("set_id", setId)
      .eq("number", number)
      .maybeSingle();
    
    return data?.last_end_time;
  } catch (error) {
    return null;
  }
}

async function updateCheckpoint(setId: string, number: string, lastEndTime: string) {
  try {
    await supabase.from("ebay_card_checkpoint").upsert({
      set_id: setId,
      number: number,
      last_end_time: lastEndTime
    });
  } catch (error) {
    console.warn('Could not update checkpoint:', error);
  }
}

async function processCard(card: { set_id: string; number: string; name: string; set_name?: string }, windowDays: number, budgetFn: () => Promise<any>) {
  console.log(`🔍 Processing ${card.set_id} #${card.number} ${card.name}`);
  
  try {
    // Get checkpoint for delta fetch
    const checkpoint = await getCheckpoint(card.set_id, card.number);
    const endTimeFrom = checkpoint || new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`  📅 Fetching data from ${endTimeFrom}`);
    
    // Search for RAW items
    const rawItems = await searchAllPages(
      qRaw({ name: card.name, number: card.number, setName: card.set_name }),
      windowDays,
      () => budgetFn()
    );
    
    // Search for PSA10 items
    const psa10Items = await searchAllPages(
      qPSA({ name: card.name, number: card.number, setName: card.set_name, grade: 10 }),
      windowDays,
      () => budgetFn()
    );
    
    // Search for PSA9 items
    const psa9Items = await searchAllPages(
      qPSA({ name: card.name, number: card.number, setName: card.set_name, grade: 9 }),
      windowDays,
      () => budgetFn()
    );

    const today = new Date().toISOString().slice(0, 10);

    const rawAgg = aggregateWindow(rawItems.map(i => i.price), windowDays);
    const p10Agg = aggregateWindow(psa10Items.map(i => i.price), windowDays);
    const p9Agg = aggregateWindow(psa9Items.map(i => i.price), windowDays);

    console.log(`  📊 RAW: ${rawAgg.count} items, median: $${rawAgg.median?.toFixed(2) || 'N/A'}`);
    console.log(`  📊 PSA10: ${p10Agg.count} items, median: $${p10Agg.median?.toFixed(2) || 'N/A'}`);
    console.log(`  📊 PSA9: ${p9Agg.count} items, median: $${p9Agg.median?.toFixed(2) || 'N/A'}`);

    // Update price history
    await supabase.from("price_history").upsert({
      set_id: card.set_id,
      number: card.number,
      date: today,
      raw_usd: rawAgg.median,
      psa10_usd: p10Agg.median
    });

    // Update checkpoint with latest end time
    const allItems = [...rawItems, ...psa10Items, ...psa9Items];
    if (allItems.length > 0) {
      const latestEndTime = allItems.reduce((latest, item) => 
        new Date(item.endTime) > new Date(latest) ? item.endTime : latest, 
        allItems[0].endTime
      );
      await updateCheckpoint(card.set_id, card.number, latestEndTime);
    }

    console.log(`  ✅ Updated price history and checkpoint`);
    
  } catch (error) {
    console.error(`  ❌ Failed to process ${card.name}:`, (error as Error).message);
  }
}

async function main() {
  const args = process.argv;
  
  // Parse CLI arguments
  const setId = args.includes("--set") ? args[args.indexOf("--set") + 1] : null;
  const windowDays = args.includes("--window") ? parseInt(args[args.indexOf("--window") + 1]) : 7;
  const budget = args.includes("--budget") ? parseInt(args[args.indexOf("--budget") + 1]) : 0;
  const resume = args.includes("--resume");
  
  console.log(`🎯 eBay Price Refresh (Robust)`);
  console.log(`Set: ${setId || 'all'}`);
  console.log(`Window: ${windowDays} days`);
  console.log(`Budget: ${budget || 'unlimited'} calls`);
  console.log(`Resume: ${resume ? 'yes' : 'no'}`);
  
  let cards: any[] = [];
  
  if (setId) {
    const { data } = await supabase.from("v_cards_latest").select("set_id, number, name, set_name").eq("set_id", setId);
    cards = data ?? [];
  } else {
    const { data } = await supabase.from("v_cards_latest").select("set_id, number, name, set_name").limit(100);
    cards = data ?? [];
  }

  console.log(`📦 Found ${cards.length} cards to process`);

  let callsUsed = 0;
  const budgetFn = async () => {
    if (budget && callsUsed >= budget) {
      throw new Error(`Budget reached (${callsUsed}/${budget} calls)`);
    }
    callsUsed++;
    return findCompleted({ 
      query: "pokemon", 
      categoryId: CATEGORY_POKEMON_TCG, 
      pageNumber: 1, 
      entriesPerPage: 100 
    });
  };

  for (const card of cards) {
    try {
      await processCard(card, windowDays, budgetFn);
      console.log(`  📊 Calls used: ${callsUsed}/${budget || '∞'}`);
      console.log(''); // Empty line for readability
    } catch (error) {
      if (error.message.includes('Budget reached')) {
        console.log(`💰 Budget reached! Stopping at ${callsUsed} calls`);
        break;
      }
      console.error(`❌ Error processing ${card.name}:`, error.message);
    }
  }
  
  console.log('🎉 eBay price refresh completed!');
  console.log(`📊 Total calls used: ${callsUsed}`);
}

main().catch(e => { 
  console.error('💥 Script failed:', e); 
  process.exit(1); 
});
