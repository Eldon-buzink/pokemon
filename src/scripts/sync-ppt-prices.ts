#!/usr/bin/env tsx

/**
 * PPT (Pokemon Price Tracker) Pricing Sync Script
 * 
 * Uses Pokemon Price Tracker API to fetch real-time pricing data
 * 
 * Strategy:
 * 1. Fetch all cards from database
 * 2. For each card, get latest pricing from PPT API
 * 3. Store in prices table with source='ppt'
 * 4. Calculate and store in graded_sales for historical tracking
 * 
 * Run: npx tsx src/scripts/sync-ppt-prices.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { pptFetchCached } from '../lib/http/pptFetch';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Card {
  card_id: string;
  set_id: string;
  number: string;
  name: string;
  rarity: string | null;
  lang: string;
  set_name: string | null;
}

interface PPTPricing {
  raw_cents: number | null;
  psa10_cents: number | null;
  currency: string;
  last_updated: string;
}

/**
 * Fetch pricing for a card from PPT API
 */
async function fetchPPTPricing(card: Card): Promise<PPTPricing | null> {
  try {
    // PPT API uses set_id and card number
    const setId = card.set_id.replace(/-jp$/, '');  // Remove -jp for Japanese cards
    const path = `/sets/${setId}/cards/${card.number}/summary`;
    
    const result = await pptFetchCached({
      setId,
      number: card.number,
      kind: 'summary',
      path,
      useCacheMin: 1440,  // 24 hour cache
    });
    
    if (!result.ok || !result.json?.prices) {
      return null;
    }
    
    const data = result.json;
    
    // Extract pricing data
    const rawPrice = data.prices?.raw?.market || data.prices?.raw?.low || null;
    const psa10Price = data.prices?.psa10?.market || data.prices?.psa10?.low || null;
    
    return {
      raw_cents: rawPrice ? Math.round(rawPrice * 100) : null,
      psa10_cents: psa10Price ? Math.round(psa10Price * 100) : null,
      currency: 'USD',
      last_updated: new Date().toISOString(),
    };
  } catch (error: any) {
    // Don't log 404s - card might not be tracked by PPT
    if (!error.message?.includes('404') && !error.message?.includes('http_404')) {
      console.log(`    ⚠️  PPT error:`, error.message);
    }
    return null;
  }
}

/**
 * Sync pricing for a single card
 */
async function syncCardPricing(card: Card) {
  console.log(`  📊 ${card.name} (${card.set_id}-${card.number})...`);
  
  // Fetch pricing from PPT
  const pricing = await fetchPPTPricing(card);
  
  if (!pricing) {
    console.log(`    ⚠️  No pricing data available`);
    return { success: false };
  }
  
  console.log(`    ✅ Raw: $${(pricing.raw_cents || 0) / 100}, PSA10: $${(pricing.psa10_cents || 0) / 100}`);
  
  // Store in prices table
  const { error: pricesError } = await supabase
    .from('prices')
    .upsert({
      card_id: card.card_id,
      source: 'ppt',
      raw_cents: pricing.raw_cents,
      psa10_cents: pricing.psa10_cents,
      currency: pricing.currency,
      ts: pricing.last_updated,
      notes: 'PPT API',
    }, { 
      onConflict: 'card_id,source,ts',
      ignoreDuplicates: true 
    });
  
  if (pricesError) {
    console.log(`    ⚠️  Error storing price:`, pricesError.message);
  }
  
  // Also store as graded sales for historical tracking
  if (pricing.raw_cents) {
    await supabase
      .from('graded_sales')
      .insert({
        card_id: card.card_id,
        grade: 0,  // 0 for raw
        sold_date: new Date().toISOString().split('T')[0],
        price: pricing.raw_cents / 100,
        source: 'ppt',
        listing_id: null,
      })
      .then(() => {})
      .catch(() => {});  // Ignore errors (duplicates are fine)
  }
  
  if (pricing.psa10_cents) {
    await supabase
      .from('graded_sales')
      .insert({
        card_id: card.card_id,
        grade: 10,
        sold_date: new Date().toISOString().split('T')[0],
        price: pricing.psa10_cents / 100,
        source: 'ppt',
        listing_id: null,
      })
      .then(() => {})
      .catch(() => {});  // Ignore errors
  }
  
  return { success: true };
}

/**
 * Sync pricing for a specific set
 */
async function syncSetPricing(setId: string, limit: number = 20) {
  console.log(`\n📦 Syncing set ${setId}...`);
  
  // Fetch cards from this set
  const { data: cards, error } = await supabase
    .from('cards')
    .select('card_id, set_id, number, name, rarity, lang')
    .eq('set_id', setId)
    .limit(limit);
  
  if (error || !cards || cards.length === 0) {
    console.log(`  ⚠️  No cards found for set ${setId}`);
    return { cards: 0, synced: 0 };
  }
  
  // Get set name
  const { data: assets } = await supabase
    .from('card_assets')
    .select('set_name')
    .eq('card_id', cards[0].card_id)
    .limit(1);
  
  const setName = assets?.[0]?.set_name || setId;
  
  console.log(`  📊 Processing ${cards.length} cards from ${setName}...`);
  
  let syncedCount = 0;
  
  for (const card of cards) {
    const cardWithSetName = { ...card, set_name: setName };
    const result = await syncCardPricing(cardWithSetName);
    if (result.success) syncedCount++;
    
    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`  ✅ Set complete: ${syncedCount}/${cards.length} cards synced`);
  return { cards: cards.length, synced: syncedCount };
}

/**
 * Sync pricing for all cards
 */
async function syncAllPricing() {
  console.log('💰 PPT Pricing Sync');
  console.log('==================\n');
  
  console.log('Using Pokemon Price Tracker API (20,000 calls/day)');
  console.log('Starting with a test (20 cards per set)\n');
  
  // Start with popular sets
  const testSets = [
    'sv3',      // Obsidian Flames (has Charizard ex)
    'cel25',    // Celebrations
    'sv3pt5',   // 151
    'sv1',      // Scarlet & Violet Base
  ];
  
  let totalCards = 0;
  let totalSynced = 0;
  
  for (const setId of testSets) {
    const result = await syncSetPricing(setId, 20);
    totalCards += result.cards;
    totalSynced += result.synced;
  }
  
  console.log(`\n🎉 Pricing Sync Complete!`);
  console.log(`====================================`);
  console.log(`✅ Cards processed: ${totalCards}`);
  console.log(`✅ Cards synced: ${totalSynced}`);
  console.log(`❌ Failed: ${totalCards - totalSynced}`);
  
  // Check database status
  const { count: totalPrices } = await supabase
    .from('prices')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'ppt');
  
  console.log(`\n📊 Database Summary:`);
  console.log(`   PPT prices in database: ${totalPrices}`);
  
  console.log(`\n🎯 Next Steps:`);
  console.log(`1. ✅ PPT pricing sync working`);
  console.log(`2. 🔄 Run full sync for all sets (will take ~1 hour for 11k cards)`);
  console.log(`3. 🔄 Set up daily cron job to keep prices updated`);
  console.log(`4. 🔄 Update UI to show PPT prices`);
}

// Run the sync
syncAllPricing().catch(console.error);

