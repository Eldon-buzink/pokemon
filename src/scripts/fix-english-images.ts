#!/usr/bin/env tsx

/**
 * Fix English card images by creating missing card_assets entries
 * 
 * This script:
 * 1. Finds English sets that have cards but no assets
 * 2. Creates placeholder asset entries
 * 3. These will be populated with real images by the image sync
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixEnglishImages() {
  console.log('🔧 Fixing English card images...');
  
  // Get all English sets that have cards but no assets
  const { data: sets, error } = await supabase
    .from('cards')
    .select('set_id')
    .eq('lang', 'en')
    .not('set_id', 'like', '%-jp')
    .order('set_id');
    
  if (error) {
    console.error('Error fetching sets:', error);
    return;
  }
  
  const uniqueSets = [...new Set(sets.map(s => s.set_id))];
  console.log(`Found ${uniqueSets.length} English sets`);
  
  for (const setId of uniqueSets) {
    console.log(`\n📦 Processing ${setId}...`);
    
    // Get cards for this set
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('card_id, name, number')
      .eq('set_id', setId);
      
    if (cardsError || !cards) {
      console.log(`  ❌ Error fetching cards for ${setId}`);
      continue;
    }
    
    // Check if assets exist for any cards in this set
    const { count: assetCount } = await supabase
      .from('card_assets')
      .select('card_id', { count: 'exact', head: true })
      .in('card_id', cards.map(c => c.card_id));
      
    if (assetCount && assetCount > 0) {
      console.log(`  ✅ ${setId} already has ${assetCount} assets, skipping`);
      continue;
    }
    
    console.log(`  📊 Found ${cards.length} cards, creating placeholder assets...`);
    
    // Create placeholder assets (will be updated by image sync later)
    const assetInserts = cards.map(card => ({
      card_id: card.card_id,
      set_name: setId.toUpperCase(),
      image_url_small: null,
      image_url_large: null
    }));
    
    const { error: insertError } = await supabase
      .from('card_assets')
      .upsert(assetInserts);
      
    if (insertError) {
      console.log(`  ❌ Error inserting assets for ${setId}:`, insertError.message);
    } else {
      console.log(`  ✅ Created ${assetInserts.length} asset placeholders`);
    }
  }
  
  console.log('\n🎉 English image fix complete!');
}

fixEnglishImages().catch(console.error);
