#!/usr/bin/env tsx

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate realistic historical pricing data
function generateHistoricalPricing(cardName: string, cardNumber: string, setName?: string) {
  // Base price with some variation based on card characteristics
  const isRare = cardName.toLowerCase().includes('charizard') || 
                 cardName.toLowerCase().includes('pikachu') ||
                 cardName.toLowerCase().includes('mew') ||
                 cardName.toLowerCase().includes('umbreon');
  
  const basePrice = isRare ? 
    (Math.random() * 500 + 50) : // $50-$550 for rare cards
    (Math.random() * 100 + 5);   // $5-$105 for regular cards
  
  // Generate 90 days of historical data
  const historicalData = [];
  const today = new Date();
  
  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().slice(0, 10);
    
    // Add some realistic price movement
    const trend = Math.sin(daysAgo / 30) * 0.2; // Monthly cycle
    const volatility = (Math.random() - 0.5) * 0.3; // Random volatility
    const priceMultiplier = 1 + trend + volatility;
    
    const rawPrice = Math.max(1, basePrice * priceMultiplier);
    const psa10Price = rawPrice * (3.5 + Math.random() * 2); // 3.5x-5.5x multiplier
    const psa9Price = rawPrice * (1.5 + Math.random() * 1); // 1.5x-2.5x multiplier
    
    historicalData.push({
      date: dateStr,
      raw_usd: rawPrice,
      psa10_usd: psa10Price,
      psa9_usd: psa9Price,
      raw_count: Math.floor(Math.random() * 20) + 5,
      psa10_count: Math.floor(Math.random() * 8) + 1,
      psa9_count: Math.floor(Math.random() * 12) + 2
    });
  }
  
  return historicalData;
}

async function processAllCards() {
  console.log('🚀 Complete TCG Data Generation');
  console.log('===============================');
  
  try {
    // Get all cards
    const { data: cards, error } = await supabase
      .from('v_cards_latest')
      .select('set_id, number, name, set_name')
      .order('set_name');
    
    if (error) throw error;
    
    console.log(`📦 Found ${cards?.length || 0} cards to process`);
    
    let processed = 0;
    const batchSize = 10;
    
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      
      console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cards.length/batchSize)}`);
      
      for (const card of batch) {
        console.log(`  📊 ${card.set_id} #${card.number} ${card.name}`);
        
        const historicalData = generateHistoricalPricing(card.name, card.number, card.set_name);
        
        // Insert all historical data for this card
        for (const dataPoint of historicalData) {
          await supabase.from('price_history').upsert({
            set_id: card.set_id,
            number: card.number,
            date: dataPoint.date,
            raw_usd: dataPoint.raw_usd,
            psa10_usd: dataPoint.psa10_usd,
            psa9_usd: dataPoint.psa9_usd,
            raw_count: dataPoint.raw_count,
            psa10_count: dataPoint.psa10_count,
            psa9_count: dataPoint.psa9_count
          });
        }
        
        processed++;
      }
      
      console.log(`  ✅ Processed ${Math.min(i + batchSize, cards.length)}/${cards.length} cards`);
    }
    
    console.log(`\n🎉 Complete! Generated historical data for ${processed} cards`);
    console.log('📈 Each card now has 90 days of historical pricing data');
    console.log('🎯 Analysis page will show 5, 30, and 90-day trends');
    console.log('📊 Card detail pages will show full historical charts');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

processAllCards().catch(console.error);
