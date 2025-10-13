#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Use TCGplayer data as fallback pricing for sets without eBay sales
 */
async function useTCGFallbackPricing() {
  console.log('🔍 Using TCGplayer data as fallback pricing...');
  
  // Sets that have TCG data but no eBay sales
  const setsWithTCG = ['cel25', 'cel25c', 'pgo'];
  
  for (const setId of setsWithTCG) {
    console.log(`\n📦 Processing ${setId}...`);
    
    // Get cards with TCG data but no eBay sales
    const { data: cards, error: cardsError } = await supabase
      .from('v_cards_latest')
      .select('card_id, name, tcg_raw_cents, raw_median_30d_cents, raw_median_90d_cents')
      .eq('set_id', setId)
      .not('tcg_raw_cents', 'is', null)
      .is('raw_median_30d_cents', null)
      .limit(10);
      
    if (cardsError) {
      console.log(`  ❌ Error: ${cardsError.message}`);
      continue;
    }
    
    if (!cards || cards.length === 0) {
      console.log(`  ✅ All cards already have eBay pricing`);
      continue;
    }
    
    console.log(`  📊 Found ${cards.length} cards with TCG data but no eBay sales`);
    
    // Show examples
    cards.slice(0, 3).forEach(card => {
      const tcgPrice = (card.tcg_raw_cents / 100).toFixed(2);
      console.log(`    ${card.card_id}: ${card.name} - TCG: $${tcgPrice}`);
    });
    
    console.log(`  💡 These cards can use TCG prices as fallback`);
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. ✅ Red badges should be reduced with updated validation');
  console.log('2. 🔄 TCG data can be used as fallback for cel25, cel25c, pgo');
  console.log('3. ❌ cel25-jp, sv01-jp, sv02-jp need eBay sales data from Apify');
  console.log('4. 🔄 Consider running more Apify imports for missing sets');
  
  // Check current red badge situation
  console.log('\n🔍 Checking current image validation...');
  const { data: sampleCards, error: sampleError } = await supabase
    .from('v_cards_latest')
    .select('card_id, name, set_id, image_url_small')
    .not('image_url_small', 'is', null)
    .limit(20);
    
  if (sampleError) {
    console.log('❌ Error:', sampleError.message);
  } else if (sampleCards) {
    let validImages = 0;
    let invalidImages = 0;
    
    sampleCards.forEach(card => {
      const imageUrl = card.image_url_small;
      let isValid = true;
      
      // Check for known bad images
      const knownBadImages = new Set([
        'https://images.pokemontcg.io/sv10/215_hires.png',
        'https://images.pokemontcg.io/sv10/215.png',
      ]);
      
      if (knownBadImages.has(imageUrl)) {
        isValid = false;
      } else if (imageUrl.includes('pokeapi.co')) {
        isValid = false;
      }
      
      if (isValid) {
        validImages++;
      } else {
        invalidImages++;
      }
    });
    
    console.log(`📊 Image validation sample: ${validImages} valid, ${invalidImages} invalid`);
    console.log(`✅ Red badges should be reduced from ${invalidImages} to 0-2 (only known bad images)`);
  }
}

useTCGFallbackPricing().catch(console.error);
