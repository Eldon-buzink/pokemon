#!/usr/bin/env tsx

/**
 * Fix English card images by trying multiple sources
 * 
 * This script attempts to get real card images from:
 * 1. Pokemon TCG API (official)
 * 2. Pokemon TCG images CDN
 * 3. Alternative image sources
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixEnglishCardImages() {
  console.log('🖼️  Fixing English card images...');
  
  // Get cards with Pokemon sprite images (not real card images)
  const { data: cards, error } = await supabase
    .from('card_assets')
    .select('card_id, image_url_small, image_url_large')
    .like('image_url_small', '%pokemon%')
    .like('image_url_small', '%sprites%')
    .limit(5);
    
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
    
    // Try multiple image sources
    const imageSources = [
      // Try Pokemon TCG API
      `https://api.pokemontcg.io/v2/cards/${card.card_id}`,
      // Try Pokemon TCG images CDN
      `https://images.pokemontcg.io/${card.card_id}.png`,
      `https://images.pokemontcg.io/${card.card_id}_hires.png`,
      // Try alternative format
      `https://images.pokemontcg.io/${card.card_id.replace('-', '/')}.png`,
    ];
    
    let foundImage = false;
    
    for (const source of imageSources) {
      try {
        console.log(`  🔍 Trying: ${source}`);
        
        if (source.includes('api.pokemontcg.io/v2')) {
          // API endpoint
          const response = await fetch(source);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.data && data.data.images) {
              const { small, large } = data.data.images;
              
              if (small && large) {
                console.log(`  ✅ Found real card images from API`);
                
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
                  foundImage = true;
                  break;
                }
              }
            }
          } else {
            console.log(`  ⚠️  API request failed: ${response.status}`);
          }
        } else {
          // Direct image URL
          const response = await fetch(source, { method: 'HEAD' });
          
          if (response.ok) {
            console.log(`  ✅ Found direct image URL`);
            
            // Update the card_assets table
            const { error: updateError } = await supabase
              .from('card_assets')
              .update({
                image_url_small: source,
                image_url_large: source.replace('.png', '_hires.png')
              })
              .eq('card_id', card.card_id);
              
            if (updateError) {
              console.log(`  ❌ Error updating ${card.card_id}:`, updateError.message);
            } else {
              console.log(`  ✅ Updated ${card.card_id} with direct image URL`);
              foundImage = true;
              break;
            }
          } else {
            console.log(`  ⚠️  Image not found: ${response.status}`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Error with ${source}:`, error);
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (!foundImage) {
      console.log(`  ⚠️  No real card images found for ${card.card_id}`);
    }
  }
  
  console.log('\n🎉 English card image fix complete!');
}

fixEnglishCardImages().catch(console.error);
