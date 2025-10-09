#!/usr/bin/env tsx

/**
 * Update Japanese Card Images from TCGdex API
 * 
 * Strategy:
 * 1. Fetch Japanese card images from TCGdex API
 * 2. Update card_assets with Japanese-specific images
 * 3. Keep English images as fallback if Japanese not available
 * 
 * Run: npx tsx src/scripts/update-japanese-images.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2/ja';

// Map our set IDs to TCGdex set IDs
const SET_ID_MAPPING: Record<string, string> = {
  'sv01-jp': 'SV1V',  // Violet ex
  'sv02-jp': 'SV2D',  // Snow Hazard
  'sv03-jp': 'SV2P',  // Clay Burst
  'sv04-jp': 'SV3',   // Raging Surf
  'sv05-jp': 'SV4a',  // Shiny Treasure ex
  'sv06-jp': 'SV5K',  // Wild Force
  'sv07-jp': 'SV5M',  // Mask of Change
  'sv08-jp': 'SV7',   // Stellar Miracle
  'sv09-jp': 'SV8',   // Paradise Dragona
  'sv10-jp': 'SV6a',  // Night Wanderer
  'sv11-jp': 'SV9',   // Terastal Fest
  'sv12-jp': 'SV10',  // Space-Time Creation
  'sv35-jp': 'SV4',   // 151
  
  // Sword & Shield (these might need adjustment)
  'swsh11-jp': 'S10a', // Star Birth
  'swsh12-jp': 'S11',  // Lost Abyss
  'swsh13-jp': 'S10b', // Dark Phantasma
  'swsh14-jp': 'S11a', // Incandescent Arcana
};

interface TCGdexCard {
  id: string;
  localId: string;
  name: string;
  image: string;
}

interface TCGdexSet {
  id: string;
  name: string;
  cards: TCGdexCard[];
  cardCount: {
    total: number;
    official: number;
  };
}

async function fetchTCGdexSet(setId: string): Promise<TCGdexSet | null> {
  try {
    console.log(`  📥 Fetching set ${setId} from TCGdex...`);
    const response = await fetch(`${TCGDEX_BASE_URL}/sets/${setId}`);
    
    if (!response.ok) {
      console.log(`  ⚠️  Set ${setId} not found in TCGdex (${response.status})`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(`  ❌ Error fetching set ${setId}:`, error);
    return null;
  }
}

async function updateJapaneseSetImages(ourSetId: string) {
  console.log(`\n📦 Processing ${ourSetId}...`);
  
  // Get TCGdex set ID
  const tcgdexSetId = SET_ID_MAPPING[ourSetId];
  if (!tcgdexSetId) {
    console.log(`  ⚠️  No TCGdex mapping for ${ourSetId}`);
    return { updated: 0, failed: 0, skipped: 0 };
  }
  
  console.log(`  🔗 TCGdex set ID: ${tcgdexSetId}`);
  
  // Fetch set data from TCGdex
  const tcgdexSet = await fetchTCGdexSet(tcgdexSetId);
  if (!tcgdexSet || !tcgdexSet.cards) {
    console.log(`  ❌ Could not fetch set data from TCGdex`);
    return { updated: 0, failed: 0, skipped: 0 };
  }
  
  console.log(`  📊 Found ${tcgdexSet.cards.length} cards in TCGdex`);
  
  // Get our cards for this set
  const { data: ourCards, error: ourCardsError } = await supabase
    .from('cards')
    .select('card_id, number')
    .eq('set_id', ourSetId);
  
  if (ourCardsError || !ourCards || ourCards.length === 0) {
    console.log(`  ⚠️  No cards found in our database for ${ourSetId}`);
    return { updated: 0, failed: 0, skipped: 0 };
  }
  
  console.log(`  📊 Found ${ourCards.length} cards in our database`);
  
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  
  // Match cards by number and update images
  for (const ourCard of ourCards) {
    // Extract card number (handle formats like "001", "1", "001/078")
    const cardNumber = ourCard.number.split('/')[0].padStart(3, '0');
    
    // Find matching TCGdex card
    const tcgdexCard = tcgdexSet.cards.find(c => 
      c.localId === cardNumber || 
      c.localId === ourCard.number ||
      c.localId.padStart(3, '0') === cardNumber
    );
    
    if (!tcgdexCard) {
      skipped++;
      continue;
    }
    
    // Update card_assets with Japanese image
    const imageUrl = tcgdexCard.image;
    const { error: updateError } = await supabase
      .from('card_assets')
      .update({
        image_url_small: `${imageUrl}/low`,
        image_url_large: `${imageUrl}/high`,
        last_catalog_sync: new Date().toISOString()
      })
      .eq('card_id', ourCard.card_id);
    
    if (updateError) {
      console.log(`  ⚠️  Failed to update ${ourCard.card_id}:`, updateError.message);
      failed++;
    } else {
      updated++;
    }
  }
  
  console.log(`  ✅ Updated: ${updated}, ⏭️ Skipped: ${skipped}, ❌ Failed: ${failed}`);
  return { updated, failed, skipped };
}

async function updateAllJapaneseImages() {
  console.log('🖼️  Updating Japanese Card Images from TCGdex');
  console.log('============================================');
  
  const japaneseSets = Object.keys(SET_ID_MAPPING);
  console.log(`📋 Processing ${japaneseSets.length} Japanese sets`);
  
  let totalUpdated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  
  for (const setId of japaneseSets) {
    const result = await updateJapaneseSetImages(setId);
    totalUpdated += result.updated;
    totalFailed += result.failed;
    totalSkipped += result.skipped;
    
    // Small delay to be nice to TCGdex API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n🎉 Image Update Complete!`);
  console.log(`====================================`);
  console.log(`✅ Updated: ${totalUpdated} cards`);
  console.log(`⏭️  Skipped: ${totalSkipped} cards`);
  console.log(`❌ Failed: ${totalFailed} cards`);
  
  // Check final image status
  const { count: totalJapaneseCards } = await supabase
    .from('cards')
    .select('card_id', { count: 'exact', head: true })
    .eq('lang', 'ja');
  
  const { count: withImages } = await supabase
    .from('card_assets')
    .select('card_id', { count: 'exact', head: true })
    .like('card_id', '%-jp-%')
    .not('image_url_small', 'is', null);
  
  console.log(`\n📊 Japanese Card Image Status:`);
  console.log(`   Total Japanese cards: ${totalJapaneseCards}`);
  console.log(`   With images: ${withImages}`);
  console.log(`   Coverage: ${((withImages! / totalJapaneseCards!) * 100).toFixed(1)}%`);
  
  console.log(`\n🎯 Next Steps:`);
  console.log(`1. ✅ English sets with images (8,419 cards)`);
  console.log(`2. ✅ Japanese sets with images (${withImages} cards)`);
  console.log(`3. 🔄 Next: Set up eBay RSS for pricing data`);
}

// Run the update
updateAllJapaneseImages().catch(console.error);

