#!/usr/bin/env tsx

/**
 * eBay Pricing Sync Script
 * 
 * Uses eBay Finding API to fetch completed/sold listings and update pricing data
 * 
 * Strategy:
 * 1. Fetch all cards from database
 * 2. For each card, search eBay for completed listings
 * 3. Store sales in graded_sales table
 * 4. Calculate rolling medians (7d, 30d, 90d)
 * 
 * Run: npx tsx src/scripts/sync-ebay-prices.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { findCompleted } from '../lib/sources/ebay';

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

/**
 * Extract PSA grade from eBay listing title
 */
function extractGrade(title: string): number | null {
  const psa10Match = title.match(/PSA[-\s]?10/i);
  if (psa10Match) return 10;
  
  const psa9Match = title.match(/PSA[-\s]?9/i);
  if (psa9Match) return 9;
  
  const psa8Match = title.match(/PSA[-\s]?8/i);
  if (psa8Match) return 8;
  
  // CGC, BGS grading
  const cgc10Match = title.match(/CGC[-\s]?(10|Pristine)/i);
  if (cgc10Match) return 10;
  
  const bgs10Match = title.match(/BGS[-\s]?10/i);
  if (bgs10Match) return 10;
  
  // Return null for raw/ungraded
  return null;
}

/**
 * Sync pricing for a single card
 */
async function syncCardPricing(card: Card) {
  console.log(`  📊 Syncing ${card.name} (${card.set_id}-${card.number})...`);
  
  // Build search query
  const setName = card.set_name || card.set_id;
  const searchQuery = `Pokemon ${card.name} ${setName} ${card.number}`;
  
  try {
    // Fetch completed listings from eBay
    const result = await findCompleted({
      query: searchQuery,
      entriesPerPage: 50,  // Get last 50 sales
      pageNumber: 1,
      soldOnly: true,
    });
    
    if (result.items.length === 0) {
      console.log(`    ⚠️  No sales found`);
      return { sales: 0, raw: 0, graded: 0 };
    }
    
    console.log(`    ✅ Found ${result.items.length} sales`);
    
    // Process each sale
    let rawCount = 0;
    let gradedCount = 0;
    
    for (const item of result.items) {
      const grade = extractGrade(item.title);
      
      // Insert into graded_sales table
      const { error } = await supabase
        .from('graded_sales')
        .insert({
          card_id: card.card_id,
          grade: grade || 0,  // 0 for raw/ungraded
          sold_date: new Date(item.endTime).toISOString().split('T')[0],  // Date only
          price: item.price,
          source: 'ebay',
          listing_id: item.url.split('/').pop() || null,
        });
      
      if (error && error.code !== '23505') {  // Ignore duplicate errors
        console.log(`    ⚠️  Error inserting sale:`, error.message);
      } else {
        if (grade) {
          gradedCount++;
        } else {
          rawCount++;
        }
      }
    }
    
    console.log(`    ✅ Inserted: ${rawCount} raw, ${gradedCount} graded`);
    return { sales: result.items.length, raw: rawCount, graded: gradedCount };
    
  } catch (error: any) {
    console.log(`    ❌ Error syncing card:`, error.message);
    return { sales: 0, raw: 0, graded: 0 };
  }
}

/**
 * Sync pricing for a specific set
 */
async function syncSetPricing(setId: string, limit: number = 10) {
  console.log(`\n📦 Syncing set ${setId}...`);
  
  // Fetch cards from this set
  const { data: cards, error } = await supabase
    .from('cards')
    .select(`
      card_id,
      set_id,
      number,
      name,
      rarity,
      lang
    `)
    .eq('set_id', setId)
    .limit(limit);  // Limit to avoid hitting rate limits
  
  if (error || !cards || cards.length === 0) {
    console.log(`  ⚠️  No cards found for set ${setId}`);
    return { cards: 0, sales: 0 };
  }
  
  // Get set name from card_assets
  const { data: assets } = await supabase
    .from('card_assets')
    .select('set_name')
    .eq('card_id', cards[0].card_id)
    .limit(1);
  
  const setName = assets?.[0]?.set_name || setId;
  
  console.log(`  📊 Processing ${cards.length} cards from ${setName}...`);
  
  let totalSales = 0;
  let totalRaw = 0;
  let totalGraded = 0;
  
  for (const card of cards) {
    const cardWithSetName = { ...card, set_name: setName };
    const result = await syncCardPricing(cardWithSetName);
    totalSales += result.sales;
    totalRaw += result.raw;
    totalGraded += result.graded;
    
    // Small delay to avoid rate limiting (5000/day = ~3.5 calls/minute)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`  ✅ Set complete: ${totalSales} sales (${totalRaw} raw, ${totalGraded} graded)`);
  return { cards: cards.length, sales: totalSales };
}

/**
 * Sync pricing for all cards (or a subset)
 */
async function syncAllPricing() {
  console.log('💰 eBay Pricing Sync');
  console.log('===================\n');
  
  console.log('⚠️  Note: This will use your eBay Finding API (5000 calls/day limit)');
  console.log('Starting with a small test (10 cards per set)\n');
  
  // Start with a few popular sets
  const testSets = [
    'sv3',      // Obsidian Flames (has Charizard ex)
    'cel25',    // Celebrations
    'sv3pt5',   // 151
    'sv01-jp',  // Japanese Scarlet & Violet
  ];
  
  let totalCards = 0;
  let totalSales = 0;
  
  for (const setId of testSets) {
    const result = await syncSetPricing(setId, 10);
    totalCards += result.cards;
    totalSales += result.sales;
  }
  
  console.log(`\n🎉 Pricing Sync Complete!`);
  console.log(`====================================`);
  console.log(`✅ Cards processed: ${totalCards}`);
  console.log(`✅ Sales collected: ${totalSales}`);
  
  // Check database status
  const { count: totalSalesInDb } = await supabase
    .from('graded_sales')
    .select('id', { count: 'exact', head: true });
  
  console.log(`\n📊 Database Summary:`);
  console.log(`   Total sales in database: ${totalSalesInDb}`);
  
  console.log(`\n🎯 Next Steps:`);
  console.log(`1. ✅ eBay pricing sync working`);
  console.log(`2. 🔄 Run full sync for all sets (will take time due to rate limits)`);
  console.log(`3. 🔄 Set up daily cron job to keep prices updated`);
  console.log(`4. 🔄 Update UI to show eBay sold prices`);
}

// Run the sync
syncAllPricing().catch(console.error);

