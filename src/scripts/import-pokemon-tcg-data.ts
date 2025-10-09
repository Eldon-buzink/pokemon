#!/usr/bin/env tsx

/**
 * Import Pokemon Card Catalog from pokemon-tcg-data GitHub repository
 * 
 * This script:
 * 1. Fetches all English sets from the GitHub repository
 * 2. Imports them into the cards and card_assets tables
 * 3. Replaces the old Pokemon TCG API ingestion
 * 
 * Run: npx tsx src/scripts/import-pokemon-tcg-data.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en';

// Sets from Celebrations onward (2021-2025)
const MODERN_SETS = [
  // Celebrations
  'cel25',
  'cel25c',
  
  // Sword & Shield Era
  'swsh1', 'swsh2', 'swsh3', 'swsh4', 'swsh5', 'swsh6', 'swsh7', 'swsh8',
  'swsh9', 'swsh10', 'swsh11', 'swsh12',
  'swsh9tg', 'swsh10tg', 'swsh11tg', 'swsh12tg',
  'swsh35', 'swsh45', 'swsh12pt5',
  'swshp',
  
  // Pokemon GO
  'pgo',
  
  // Scarlet & Violet Era
  'sv1', 'sv2', 'sv3', 'sv4', 'sv5', 'sv6', 'sv7', 'sv8', 'sv9', 'sv10',
  'sv3pt5', 'sv4pt5', 'sv6pt5', 'sv8pt5',
  'svp',
  'sve',
];

interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  attacks?: any[];
  weaknesses?: any[];
  resistances?: any[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    legalities: any;
    ptcgoCode?: string;
    releaseDate: string;
    updatedAt: string;
    images: {
      symbol: string;
      logo: string;
    };
  };
  number: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities: any;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: any;
  cardmarket?: any;
}

async function fetchSetData(setId: string): Promise<PokemonCard[] | null> {
  try {
    const url = `${GITHUB_BASE_URL}/${setId}.json`;
    console.log(`  📥 Fetching ${url}...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  ⚠️  Set ${setId} not found (${response.status})`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(`  ❌ Error fetching set ${setId}:`, error);
    return null;
  }
}

async function importSet(setId: string) {
  console.log(`\n📦 Processing ${setId}...`);
  
  // Check if set already exists
  const { count: existingCount } = await supabase
    .from('cards')
    .select('card_id', { count: 'exact', head: true })
    .eq('set_id', setId);
  
  if (existingCount && existingCount > 0) {
    console.log(`  ✅ Set ${setId} already has ${existingCount} cards, skipping`);
    return { skipped: true, count: existingCount };
  }
  
  // Fetch set data from GitHub
  const cards = await fetchSetData(setId);
  if (!cards || cards.length === 0) {
    console.log(`  ⚠️  No cards found for set ${setId}`);
    return { skipped: false, count: 0, error: true };
  }
  
  console.log(`  📊 Found ${cards.length} cards`);
  
  // Process cards in batches
  const batchSize = 50;
  let insertedCount = 0;
  
  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    
    // Prepare card inserts
    const cardInserts = batch.map(card => ({
      card_id: card.id,
      set_id: card.set?.id || setId,
      number: card.number,
      name: card.name,
      rarity: card.rarity || null,
      lang: 'en',
      edition: 'Unlimited'
    }));
    
    // Insert cards
    const { error: cardsError } = await supabase
      .from('cards')
      .upsert(cardInserts, { onConflict: 'card_id' });
    
    if (cardsError) {
      console.log(`  ❌ Error inserting cards batch:`, cardsError);
      continue;
    }
    
    // Prepare card assets
    const assetInserts = batch.map(card => ({
      card_id: card.id,
      set_name: card.set?.name || setId,
      release_date: card.set?.releaseDate || null,
      rarity: card.rarity || null,
      image_url_small: card.images?.small || null,
      image_url_large: card.images?.large || null,
      last_catalog_sync: new Date().toISOString()
    }));
    
    // Insert card assets
    const { error: assetsError } = await supabase
      .from('card_assets')
      .upsert(assetInserts, { onConflict: 'card_id' });
    
    if (assetsError) {
      console.log(`  ⚠️  Warning: Could not insert card assets:`, assetsError.message);
    }
    
    insertedCount += batch.length;
    
    if (cards.length > 50) {
      console.log(`  📈 Progress: ${insertedCount}/${cards.length} cards`);
    }
  }
  
  console.log(`  ✅ Completed ${setId} with ${insertedCount} cards`);
  return { skipped: false, count: insertedCount };
}

async function importAllSets() {
  console.log('🚀 Importing Pokemon Card Catalog from GitHub');
  console.log('==============================================');
  console.log(`📋 Processing ${MODERN_SETS.length} sets from Celebrations through 2025`);
  
  let totalSets = 0;
  let totalCards = 0;
  let skippedSets = 0;
  let errorSets = 0;
  
  for (const setId of MODERN_SETS) {
    const result = await importSet(setId);
    
    if (result.error) {
      errorSets++;
    } else if (result.skipped) {
      skippedSets++;
    } else {
      totalSets++;
      totalCards += result.count;
    }
    
    // Small delay to be nice to GitHub
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n🎉 Import Complete!`);
  console.log(`====================================`);
  console.log(`✅ Successfully imported: ${totalSets} sets`);
  console.log(`⏭️  Skipped (already exist): ${skippedSets} sets`);
  console.log(`❌ Errors: ${errorSets} sets`);
  console.log(`🃏 Total cards imported: ${totalCards}`);
  
  console.log(`\n📊 Database Summary:`);
  const { count: totalCardsInDb } = await supabase
    .from('cards')
    .select('card_id', { count: 'exact', head: true });
  
  console.log(`📦 Total cards in database: ${totalCardsInDb}`);
  
  console.log(`\n🎯 Next Steps:`);
  console.log(`1. ✅ English sets imported from GitHub`);
  console.log(`2. 🔄 Next: Set up eBay RSS for pricing data`);
  console.log(`3. 🇯🇵 Next: Add Japanese sets support`);
}

// Run the import
importAllSets().catch(console.error);

