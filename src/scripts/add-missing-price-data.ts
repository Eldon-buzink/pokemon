#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Add missing price data for sets that don't have eBay sales
 */
async function addMissingPriceData() {
  console.log('🔍 Adding missing price data...');
  
  // Sets that need price data
  const missingSets = [
    'cel25',     // Celebrations
    'cel25c',    // Celebrations Classic  
    'cel25-jp',  // Celebrations Japanese
    'pgo',       // Pokemon GO
    'sv01-jp',   // Scarlet & Violet Japanese
    'sv02-jp',   // Snow Hazard Japanese
  ];
  
  console.log(`\n📊 Processing ${missingSets.length} sets without eBay sales data...`);
  
  for (const setId of missingSets) {
    console.log(`\n📦 Processing ${setId}...`);
    
    // Get cards for this set
    const { data: cards, error: cardsError } = await supabase
      .from('v_cards_latest')
      .select('card_id, name, number, set_id, tcg_raw_cents, cm_raw_cents, ppt_raw_cents')
      .eq('set_id', setId)
      .limit(10);
      
    if (cardsError) {
      console.log(`  ❌ Error fetching cards: ${cardsError.message}`);
      continue;
    }
    
    if (!cards || cards.length === 0) {
      console.log(`  ⚠️  No cards found for ${setId}`);
      continue;
    }
    
    console.log(`  📊 Found ${cards.length} cards`);
    
    // Check what price sources are available
    let hasTCG = 0;
    let hasCM = 0;
    let hasPPT = 0;
    
    cards.forEach(card => {
      if (card.tcg_raw_cents) hasTCG++;
      if (card.cm_raw_cents) hasCM++;
      if (card.ppt_raw_cents) hasPPT++;
    });
    
    console.log(`  💰 Price sources: TCG ${hasTCG}, CM ${hasCM}, PPT ${hasPPT}`);
    
    // For sets with TCG data, we can use that as a fallback
    if (hasTCG > 0) {
      console.log(`  ✅ ${setId} has TCG data - can use as fallback pricing`);
    } else {
      console.log(`  ❌ ${setId} has no price data at all`);
    }
  }
  
  // Check if we can run more Apify imports for missing sets
  console.log('\n🎯 Recommendations:');
  console.log('1. Run Apify eBay import for missing sets: cel25, cel25c, cel25-jp, pgo, sv01-jp, sv02-jp');
  console.log('2. Use TCGplayer data as fallback for sets that have it');
  console.log('3. Consider using Pokemon TCG API pricing for missing sets');
  
  // Show current Apify usage
  console.log('\n📊 Current Apify usage:');
  const { data: sales, error: salesError } = await supabase
    .from('graded_sales')
    .select('card_id')
    .limit(1000);
    
  if (salesError) {
    console.log('❌ Error:', salesError.message);
  } else {
    console.log(`Total sales records: ${sales.length}`);
    
    // Group by set
    const setCounts = new Map();
    sales.forEach(sale => {
      const setId = sale.card_id.split('-')[0];
      setCounts.set(setId, (setCounts.get(setId) || 0) + 1);
    });
    
    console.log('\nSales by set:');
    for (const [setId, count] of setCounts) {
      console.log(`  ${setId}: ${count} sales`);
    }
  }
}

addMissingPriceData().catch(console.error);
