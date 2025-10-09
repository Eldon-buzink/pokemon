#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GITHUB_JSON_BASE = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards';

// Mapping from our set IDs to GitHub repository set IDs (from adapter files)
const SET_ID_MAPPING: Record<string, string> = {
  'cel25-jp': 'cel25',
  'cel25': 'cel25',
  'cel25c-jp': 'cel25c',
  'cel25c': 'cel25c',
  'pgo': 'pgo',
  'sv01-jp': 'sv1',
  'sv01': 'sv1',
  'sv02-jp': 'sv2',
  'sv02': 'sv2',
  'sv03-jp': 'sv3',
  'sv03': 'sv3',
  'sv04-jp': 'sv4',
  'sv04': 'sv4',
  'sv045': 'sv4pt5',
  'sv05-jp': 'sv5',
  'sv05': 'sv5',
  'sv06-jp': 'sv6',
  'sv06': 'sv6',
  'sv065': 'sv6pt5',
  'sv07-jp': 'sv7',
  'sv07': 'sv7',
  'sv08-jp': 'sv8',
  'sv08': 'sv8',
  'sv09-jp': 'sv9',
  'sv09': 'sv9',
  'sv10-jp': 'sv10',
  'sv10': 'sv10',
  'sv11-jp': 'zsv10pt5',
  'sv11': 'zsv10pt5',
  'sv115': 'rsv10pt5',
  'sv12-jp': 'sv8pt5',
  'sv12': 'sv8pt5',
  'sv35-jp': 'sv3pt5',
  'sv35': 'sv3pt5',
  'swsh11-jp': 'swsh12pt5',
  'swsh11': 'swsh12pt5',
  'swsh12-jp': 'swsh12pt5',
  'swsh12': 'swsh12pt5',
  'swsh13-jp': 'swsh13-jp',
  'swsh13': 'swsh13',
  'swsh14-jp': 'swsh14-jp',
  'swsh14': 'swsh14',
};

interface Card {
  id: string;
  name: string;
  number: string;
  images?: {
    small?: string;
    large?: string;
  };
}

async function fetchSetCards(setId: string, lang: 'en' | 'ja'): Promise<Card[]> {
  try {
    const url = `${GITHUB_JSON_BASE}/${lang}/${setId}.json`;
    console.log(`  📥 Fetching from: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  ⚠️  Set file not found: ${setId}.json`);
      return [];
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.log(`  ❌ Error fetching ${setId}: ${(error as Error).message}`);
    return [];
  }
}

async function refreshImages() {
  console.log('🔧 Refreshing card images from Pokemon TCG Data repository...');
  
  // Get all unique sets (excluding test sets)
  const { data: sets, error: setsError } = await supabase
    .from('v_cards_latest')
    .select('set_id')
    .not('set_id', 'eq', '68af37225bce97006df9f260');
    
  if (setsError) {
    console.error('❌ Error fetching sets:', setsError.message);
    return;
  }
  
  const uniqueSets = [...new Set(sets.map(s => s.set_id))].sort();
  console.log(`\nFound ${uniqueSets.length} sets to process`);
  
  let totalFixed = 0;
  let totalSkipped = 0;
  
  for (const setId of uniqueSets) {
    console.log(`\n📦 Processing set: ${setId}`);
    
    // Determine language and base set ID for GitHub
    const isJapanese = setId.endsWith('-jp');
    const lang = isJapanese ? 'ja' : 'en';
    
    // For GitHub, remove -jp suffix and apply mapping
    const baseSetId = setId.replace(/-jp$/, '');
    const githubSetId = SET_ID_MAPPING[baseSetId] || baseSetId;
    
    console.log(`  🔄 Mapping ${setId} → ${githubSetId} (${lang})`);
    
    // Fetch cards from GitHub
    const githubCards = await fetchSetCards(githubSetId, lang);
    
    if (githubCards.length === 0) {
      console.log(`  ⚠️  No cards found in GitHub for ${setId}, skipping`);
      totalSkipped++;
      continue;
    }
    
    console.log(`  📊 Found ${githubCards.length} cards in GitHub`);
    
    // Update images for each card
    let setFixed = 0;
    for (const githubCard of githubCards) {
      if (!githubCard.images?.small || !githubCard.images?.large) {
        continue;
      }
      
      // Map the GitHub card ID to our database card ID
      // GitHub uses setId from their repo, but our DB uses our setId
      // e.g., GitHub has "sv1-1" but we have "sv01-1"
      let dbCardId = githubCard.id;
      
      // Replace the GitHub set ID with our set ID in the card_id
      if (githubSetId !== setId) {
        dbCardId = githubCard.id.replace(githubSetId + '-', setId.replace(/-jp$/, '') + '-');
      }
      
      const { error: updateError } = await supabase
        .from('card_assets')
        .update({
          image_url_small: githubCard.images.small,
          image_url_large: githubCard.images.large,
          last_catalog_sync: new Date().toISOString()
        })
        .eq('card_id', dbCardId);
        
      if (updateError) {
        console.log(`    ❌ Error updating ${dbCardId}: ${updateError.message}`);
      } else {
        setFixed++;
      }
    }
    
    console.log(`  ✅ Updated ${setFixed} cards for ${setId}`);
    totalFixed += setFixed;
  }
  
  console.log(`\n🎉 Image refresh complete!`);
  console.log(`✅ Total cards updated: ${totalFixed}`);
  console.log(`⚠️  Sets skipped: ${totalSkipped}`);
}

refreshImages().catch(console.error);

