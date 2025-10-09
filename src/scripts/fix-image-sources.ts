#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GITHUB_IMAGES_BASE = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/images';

async function fetchImage(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function fixImageSources() {
  console.log('🔧 Fixing image sources - migrating to GitHub repository...');
  
  // Get all cards that are NOT using GitHub images
  // Skip the test set with invalid ID
  const { data: nonGitHubCards, error } = await supabase
    .from('v_cards_latest')
    .select('card_id, set_id, number, name, image_url_small')
    .not('image_url_small', 'like', '%raw.githubusercontent.com%')
    .not('image_url_small', 'is', null)
    .not('set_id', 'eq', '68af37225bce97006df9f260'); // Skip invalid test set
    
  if (error) {
    console.error('❌ Error fetching cards:', error.message);
    return;
  }
  
  if (!nonGitHubCards || nonGitHubCards.length === 0) {
    console.log('✅ All cards already using GitHub images!');
    return;
  }
  
  console.log(`Found ${nonGitHubCards.length} cards using non-GitHub image sources (excluding test sets)`);
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  for (const card of nonGitHubCards) {
    console.log(`\n🔍 Processing ${card.set_id} #${card.number}: ${card.name}`);
    
    // Determine language from set_id (if it ends with -jp, it's Japanese)
    const isJapanese = card.set_id.endsWith('-jp');
    const lang = isJapanese ? 'ja' : 'en';
    
    // Try to find the GitHub image
    const githubUrlSmall = `${GITHUB_IMAGES_BASE}/${lang}/${card.card_id}.png`;
    const githubUrlLarge = `${GITHUB_IMAGES_BASE}/${lang}/${card.card_id}_hires.png`;
    
    // Check if GitHub image exists
    const hasSmallImage = await fetchImage(githubUrlSmall);
    const hasLargeImage = await fetchImage(githubUrlLarge);
    
    if (hasSmallImage) {
      const { error: updateError } = await supabase
        .from('card_assets')
        .update({
          image_url_small: githubUrlSmall,
          image_url_large: hasLargeImage ? githubUrlLarge : githubUrlSmall,
          last_catalog_sync: new Date().toISOString()
        })
        .eq('card_id', card.card_id);
        
      if (updateError) {
        console.log(`  ❌ Error updating ${card.card_id}: ${updateError.message}`);
      } else {
        console.log(`  ✅ Updated to GitHub image: ${githubUrlSmall}`);
        fixedCount++;
      }
    } else {
      console.log(`  ⚠️  GitHub image not found: ${githubUrlSmall}`);
      skippedCount++;
    }
    
    // Add a small delay to avoid overwhelming the GitHub API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n🎉 Image source fix complete!`);
  console.log(`✅ Fixed: ${fixedCount} cards`);
  console.log(`⚠️  Skipped: ${skippedCount} cards`);
}

fixImageSources().catch(console.error);
