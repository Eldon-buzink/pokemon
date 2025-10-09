#!/usr/bin/env tsx

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { withinDays, aggregateWindow } from '../lib/stats';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mock eBay data for testing
function generateMockEbayData(cardName: string, cardNumber: string) {
  const basePrice = Math.random() * 100 + 10; // $10-$110
  const psa10Multiplier = 3 + Math.random() * 2; // 3x-5x multiplier
  const psa9Multiplier = 1.5 + Math.random() * 1; // 1.5x-2.5x multiplier
  
  const rawItems = Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, i) => ({
    title: `${cardName} #${cardNumber} Pokemon Card`,
    price: basePrice + (Math.random() - 0.5) * 20,
    currency: 'USD',
    endTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    url: `https://ebay.com/item${i}`
  }));
  
  const psa10Items = Array.from({ length: Math.floor(Math.random() * 10) + 2 }, (_, i) => ({
    title: `${cardName} #${cardNumber} PSA 10 Pokemon Card`,
    price: basePrice * psa10Multiplier + (Math.random() - 0.5) * 50,
    currency: 'USD',
    endTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    url: `https://ebay.com/psa10-${i}`
  }));
  
  const psa9Items = Array.from({ length: Math.floor(Math.random() * 15) + 3 }, (_, i) => ({
    title: `${cardName} #${cardNumber} PSA 9 Pokemon Card`,
    price: basePrice * psa9Multiplier + (Math.random() - 0.5) * 30,
    currency: 'USD',
    endTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    url: `https://ebay.com/psa9-${i}`
  }));
  
  return { rawItems, psa10Items, psa9Items };
}

async function processCardMock(card: { set_id: string; number: string; name: string; set_name?: string }) {
  console.log(`🔍 Processing ${card.set_id} #${card.number} ${card.name}`);
  
  try {
    const { rawItems, psa10Items, psa9Items } = generateMockEbayData(card.name, card.number);
    
    const today = new Date().toISOString().slice(0, 10);
    
    const rawAgg = aggregateWindow(rawItems.map(i => i.price), 30);
    const p10Agg = aggregateWindow(psa10Items.map(i => i.price), 30);
    const p9Agg = aggregateWindow(psa9Items.map(i => i.price), 30);
    
    console.log(`  📊 RAW: ${rawAgg.count} items, median: $${rawAgg.median?.toFixed(2) || 'N/A'}`);
    console.log(`  📊 PSA10: ${p10Agg.count} items, median: $${p10Agg.median?.toFixed(2) || 'N/A'}`);
    console.log(`  📊 PSA9: ${p9Agg.count} items, median: $${p9Agg.median?.toFixed(2) || 'N/A'}`);
    
    await supabase.from("price_history").upsert({
      set_id: card.set_id,
      number: card.number,
      date: today,
      raw_usd: rawAgg.median,
      psa10_usd: p10Agg.median
      // Note: psa9_usd and count columns will be added later
    });
    
    console.log(`  ✅ Updated price history for ${today}`);
    
  } catch (error) {
    console.error(`  ❌ Failed to process ${card.name}:`, (error as Error).message);
  }
}

async function main() {
  console.log('🧪 Testing eBay integration with mock data...');
  
  const { data: cards } = await supabase
    .from("v_cards_latest")
    .select("set_id, number, name, set_name")
    .eq("set_id", "cel25c")
    .limit(5);
  
  if (!cards) {
    console.log('❌ No cards found');
    return;
  }
  
  console.log(`📦 Found ${cards.length} cards to process`);
  
  for (const card of cards) {
    await processCardMock(card);
    console.log(''); // Empty line for readability
  }
  
  console.log('🎉 Mock eBay price refresh completed!');
}

main().catch(e => { 
  console.error('💥 Script failed:', e); 
  process.exit(1); 
});
