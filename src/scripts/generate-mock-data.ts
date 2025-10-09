#!/usr/bin/env tsx

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mock data generator
function generateMockPricing(cardName: string, cardNumber: string, setName?: string) {
  const basePrice = Math.random() * 200 + 10; // $10-$210
  const psa10Multiplier = 2.5 + Math.random() * 3; // 2.5x-5.5x
  const psa9Multiplier = 1.2 + Math.random() * 1.5; // 1.2x-2.7x
  
  return {
    raw: basePrice + (Math.random() - 0.5) * 40,
    psa10: basePrice * psa10Multiplier + (Math.random() - 0.5) * 100,
    psa9: basePrice * psa9Multiplier + (Math.random() - 0.5) * 50,
    rawCount: Math.floor(Math.random() * 30) + 10,
    psa10Count: Math.floor(Math.random() * 15) + 2,
    psa9Count: Math.floor(Math.random() * 20) + 3
  };
}

async function generateAllMockData() {
  console.log('🎲 Generating mock data for all cards...');
  
  try {
    // Get all cards
    const { data: cards, error } = await supabase
      .from('v_cards_latest')
      .select('set_id, number, name, set_name')
      .limit(100); // Start with 100 cards
    
    if (error) throw error;
    
    console.log(`📦 Found ${cards?.length || 0} cards to process`);
    
    const today = new Date().toISOString().slice(0, 10);
    let processed = 0;
    
    for (const card of cards) {
      const pricing = generateMockPricing(card.name, card.number, card.set_name);
      
      await supabase.from('price_history').upsert({
        set_id: card.set_id,
        number: card.number,
        date: today,
        raw_usd: pricing.raw,
        psa10_usd: pricing.psa10
      });
      
      processed++;
      if (processed % 20 === 0) {
        console.log(`✅ Processed ${processed}/${cards.length} cards`);
      }
    }
    
    console.log(`🎉 Generated mock data for ${processed} cards!`);
    console.log('📊 You can now use the analysis page with realistic pricing data');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

generateAllMockData().catch(console.error);
