#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Identify potentially problematic images
 */
async function identifyBadImages() {
  console.log('🔍 Identifying potentially bad images...');
  
  // Get all cards with Pokemon TCG API images
  const { data: cards, error } = await supabase
    .from('v_cards_latest')
    .select('card_id, name, number, set_id, image_url_small, image_url_large')
    .like('image_url_small', '%pokemontcg.io%')
    .limit(100);
    
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`\n📊 Checking ${cards.length} cards with Pokemon TCG API images...`);
  
  const suspiciousCards = [];
  
  for (const card of cards) {
    // Check for potential issues
    const issues = [];
    
    // Check if image URL structure matches the card
    const imageUrl = card.image_url_small || card.image_url_large;
    if (imageUrl) {
      const expectedSetInUrl = card.set_id.toLowerCase();
      const actualSetInUrl = imageUrl.match(/\/([^\/]+)\/\d+/)?.[1];
      
      if (actualSetInUrl && actualSetInUrl !== expectedSetInUrl) {
        issues.push(`URL set mismatch: expected ${expectedSetInUrl}, got ${actualSetInUrl}`);
      }
      
      // Check for known problematic patterns
      if (imageUrl.includes('/sv10/215')) {
        issues.push('Known bad image - Charizard shows Garchomp');
      }
      
      // Check for generic Pokemon names that might indicate wrong images
      const genericNames = ['Pokemon', 'Card', 'Image', 'Placeholder'];
      if (genericNames.some(name => card.name.toLowerCase().includes(name.toLowerCase()))) {
        issues.push('Generic card name might indicate placeholder');
      }
    }
    
    if (issues.length > 0) {
      suspiciousCards.push({
        ...card,
        issues
      });
    }
  }
  
  if (suspiciousCards.length > 0) {
    console.log(`\n⚠️  Found ${suspiciousCards.length} potentially problematic cards:`);
    
    suspiciousCards.forEach(card => {
      console.log(`\n  ${card.card_id}: ${card.name} #${card.number}`);
      console.log(`    Set: ${card.set_id}`);
      console.log(`    Image: ${card.image_url_small || card.image_url_large}`);
      card.issues.forEach(issue => {
        console.log(`    ⚠️  ${issue}`);
      });
    });
    
    // Generate KNOWN_BAD_IMAGES entries
    console.log('\n📝 Add these to KNOWN_BAD_IMAGES in image-validation.ts:');
    suspiciousCards.forEach(card => {
      const imageUrl = card.image_url_small || card.image_url_large;
      if (imageUrl) {
        console.log(`  '${imageUrl}', // ${card.name} - ${card.issues.join(', ')}`);
      }
    });
  } else {
    console.log('\n✅ No obviously problematic images found');
  }
  
  // Check for missing images
  console.log('\n📊 Checking for missing images...');
  const { data: noImageCards, error: noImageError } = await supabase
    .from('v_cards_latest')
    .select('card_id, name, number, set_id')
    .is('image_url_small', null)
    .is('image_url_large', null)
    .limit(20);
    
  if (noImageError) {
    console.error('❌ Error:', noImageError.message);
  } else if (noImageCards && noImageCards.length > 0) {
    console.log(`\n❌ Found ${noImageCards.length} cards with no images:`);
    noImageCards.forEach(card => {
      console.log(`  ${card.card_id}: ${card.name} #${card.number} (${card.set_id})`);
    });
  } else {
    console.log('\n✅ All cards have images');
  }
}

identifyBadImages().catch(console.error);
