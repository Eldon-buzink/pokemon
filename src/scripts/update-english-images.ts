#!/usr/bin/env tsx

/**
 * Update English card images with real Pokemon TCG card artwork
 * 
 * This script:
 * 1. Finds English sets with Pokemon sprite images
 * 2. Updates them with real card images from Pokemon TCG API
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateEnglishImages() {
  console.log('🖼️  Updating English card images...');
  
  // Find cards with Pokemon sprite images (not real card images)
  const { data: cards, error } = await supabase
    .from('card_assets')
    .select('card_id, image_url_small, image_url_large')
    .like('image_url_small', '%pokemon%')
    .like('image_url_small', '%sprites%')
    .limit(10);
    
  if (error) {
    console.error('Error fetching cards:', error);
    return;
  }
  
  console.log(`Found ${cards?.length || 0} cards with sprite images`);
  
  if (!cards || cards.length === 0) {
    console.log('No cards with sprite images found');
    return;
  }
  
  for (const card of cards) {
    console.log(`\n📦 Processing ${card.card_id}...`);
    
    // Try to get real card image from Pokemon TCG API
    try {
      const response = await fetch(`https://api.pokemontcg.io/v2/cards/${card.card_id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.data && data.data.images) {
          const { small, large } = data.data.images;
          
          if (small && large) {
            console.log(`  ✅ Found real card images for ${card.card_id}`);
            
            // Update the card_assets table
            const { error: updateError } = await supabase
              .from('card_assets')
              .update({
                image_url_small: small,
                image_url_large: large
              })
              .eq('card_id', card.card_id);
              
            if (updateError) {
              console.log(`  ❌ Error updating ${card.card_id}:`, updateError.message);
            } else {
              console.log(`  ✅ Updated ${card.card_id} with real card images`);
            }
          } else {
            console.log(`  ⚠️  No images found in API response for ${card.card_id}`);
          }
        } else {
          console.log(`  ⚠️  No image data in API response for ${card.card_id}`);
        }
      } else {
        console.log(`  ⚠️  API request failed for ${card.card_id}: ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ Error fetching ${card.card_id}:`, error);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n🎉 English image update complete!');
}

updateEnglishImages().catch(console.error);
