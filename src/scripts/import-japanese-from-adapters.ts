#!/usr/bin/env tsx

/**
 * Import Japanese Pokemon Cards using Adapter Files
 * 
 * Strategy:
 * 1. Read all *-jp.json adapter files
 * 2. For each Japanese set, find the equivalent English set
 * 3. Copy the English cards and create Japanese equivalents
 * 4. Mark them as Japanese language
 * 
 * This gives us a complete Japanese catalog that mirrors English sets
 * eBay RSS pricing will work for both based on card names
 * 
 * Run: npx tsx src/scripts/import-japanese-from-adapters.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADAPTERS_DIR = path.join(process.cwd(), 'adapters', 'sets');

interface AdapterConfig {
  id: string;
  name: string;
  lang: string;
  releaseDate?: string;
  sources: {
    meta?: string[];
    images?: string[];
    prices?: string[];
    pops?: string[];
  };
  imagesOverrides?: Record<string, any>;
}

function getJapaneseAdapters(): string[] {
  const files = fs.readdirSync(ADAPTERS_DIR);
  return files.filter(f => f.endsWith('-jp.json'));
}

function readAdapter(filename: string): AdapterConfig {
  const filepath = path.join(ADAPTERS_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

function getEnglishEquivalent(japaneseSetId: string): string {
  // Map Japanese set IDs to their English equivalents
  const mapping: Record<string, string> = {
    // Celebrations
    'cel25-jp': 'cel25',
    'cel25c-jp': 'cel25c',
    
    // Scarlet & Violet (Japanese sets often combine into English sets)
    'sv01-jp': 'sv1',       // Scarlet & Violet Base
    'sv02-jp': 'sv2',       // Snow Hazard → Paldea Evolved
    'sv03-jp': 'sv2',       // Clay Burst → Paldea Evolved
    'sv04-jp': 'sv3',       // Ancient Roar / Future Flash → Obsidian Flames
    'sv05-jp': 'sv3pt5',    // Shiny Treasure ex → 151
    'sv06-jp': 'sv4',       // Wild Force → Paradox Rift
    'sv07-jp': 'sv6',       // Mask of Change → Twilight Masquerade
    'sv08-jp': 'sv8pt5',    // Shrouded Fable
    'sv09-jp': 'sv9',       // Stellar Crown
    'sv10-jp': 'sv6pt5',    // Prismatic Evolutions
    'sv11-jp': 'sv10',      // Mega Evolutions
    'sv12-jp': 'sv10',      // Mega Evolutions (same English set)
    'sv35-jp': 'sv3pt5',    // 151
    
    // Sword & Shield
    'swsh11-jp': 'swsh11',  // Star Birth → Lost Origin
    'swsh12-jp': 'swsh12',  // Dark Phantasma → Silver Tempest  
    'swsh13-jp': 'swsh11',  // Lost Abyss → Lost Origin
    'swsh14-jp': 'swsh12',  // Incandescent Arcana → Silver Tempest
  };
  
  return mapping[japaneseSetId] || japaneseSetId.replace(/-jp$/, '');
}

async function importJapaneseSet(adapterFile: string) {
  const adapter = readAdapter(adapterFile);
  const japaneseSetId = path.basename(adapterFile, '.json');
  const englishSetId = getEnglishEquivalent(japaneseSetId);
  
  console.log(`\n📦 Processing ${adapter.name} (${japaneseSetId})...`);
  console.log(`  🔗 English equivalent: ${englishSetId}`);
  
  // Check if Japanese set already exists
  const { count: existingCount } = await supabase
    .from('cards')
    .select('card_id', { count: 'exact', head: true })
    .eq('set_id', japaneseSetId);
  
  if (existingCount && existingCount > 0) {
    console.log(`  ✅ Set ${japaneseSetId} already has ${existingCount} cards, skipping`);
    return { skipped: true, count: existingCount };
  }
  
  // Fetch English cards
  const { data: englishCards, error: englishError } = await supabase
    .from('cards')
    .select('*')
    .eq('set_id', englishSetId);
  
  if (englishError || !englishCards || englishCards.length === 0) {
    console.log(`  ⚠️  English equivalent ${englishSetId} not found or has no cards`);
    return { skipped: false, count: 0, error: true };
  }
  
  console.log(`  📊 Found ${englishCards.length} English cards to mirror`);
  
  // Create Japanese equivalents
  const batchSize = 50;
  let insertedCount = 0;
  
  for (let i = 0; i < englishCards.length; i += batchSize) {
    const batch = englishCards.slice(i, i + batchSize);
    
    // Prepare Japanese card inserts
    const cardInserts = batch.map(card => ({
      card_id: `${japaneseSetId}-${card.number}`,
      set_id: japaneseSetId,
      number: card.number,
      name: card.name, // Keep English name for now (eBay searches work with English names)
      rarity: card.rarity,
      lang: 'ja', // Mark as Japanese
      edition: card.edition
    }));
    
    // Insert Japanese cards
    const { error: cardsError } = await supabase
      .from('cards')
      .upsert(cardInserts, { onConflict: 'card_id' });
    
    if (cardsError) {
      console.log(`  ❌ Error inserting cards batch:`, cardsError);
      continue;
    }
    
    // Fetch English card assets
    const { data: englishAssets } = await supabase
      .from('card_assets')
      .select('*')
      .in('card_id', batch.map(c => c.card_id));
    
    if (englishAssets && englishAssets.length > 0) {
      // Create Japanese asset equivalents
      const assetInserts = englishAssets.map(asset => {
        const cardNumber = asset.card_id.split('-').pop();
        return {
          card_id: `${japaneseSetId}-${cardNumber}`,
          set_name: `${adapter.name}`,
          release_date: adapter.releaseDate || asset.release_date,
          rarity: asset.rarity,
          image_url_small: asset.image_url_small, // Use English images for now
          image_url_large: asset.image_url_large,
          last_catalog_sync: new Date().toISOString()
        };
      });
      
      // Insert Japanese card assets
      const { error: assetsError } = await supabase
        .from('card_assets')
        .upsert(assetInserts, { onConflict: 'card_id' });
      
      if (assetsError) {
        console.log(`  ⚠️  Warning: Could not insert card assets:`, assetsError.message);
      }
    }
    
    insertedCount += batch.length;
    
    if (englishCards.length > 50) {
      console.log(`  📈 Progress: ${insertedCount}/${englishCards.length} cards`);
    }
  }
  
  console.log(`  ✅ Completed ${japaneseSetId} with ${insertedCount} cards`);
  return { skipped: false, count: insertedCount };
}

async function importAllJapaneseSets() {
  console.log('🇯🇵 Importing Japanese Pokemon Card Catalog from Adapters');
  console.log('=======================================================');
  
  const japaneseAdapters = getJapaneseAdapters();
  console.log(`📋 Found ${japaneseAdapters.length} Japanese adapter files`);
  
  let totalSets = 0;
  let totalCards = 0;
  let skippedSets = 0;
  let errorSets = 0;
  
  for (const adapterFile of japaneseAdapters) {
    const result = await importJapaneseSet(adapterFile);
    
    if (result.error) {
      errorSets++;
    } else if (result.skipped) {
      skippedSets++;
    } else {
      totalSets++;
      totalCards += result.count;
    }
  }
  
  console.log(`\n🎉 Japanese Import Complete!`);
  console.log(`====================================`);
  console.log(`✅ Successfully imported: ${totalSets} sets`);
  console.log(`⏭️  Skipped (already exist): ${skippedSets} sets`);
  console.log(`❌ Errors: ${errorSets} sets`);
  console.log(`🃏 Total cards imported: ${totalCards}`);
  
  console.log(`\n📊 Database Summary:`);
  const { count: totalCardsInDb } = await supabase
    .from('cards')
    .select('card_id', { count: 'exact', head: true });
  
  const { count: japaneseCardsInDb } = await supabase
    .from('cards')
    .select('card_id', { count: 'exact', head: true })
    .eq('lang', 'ja');
  
  console.log(`📦 Total cards in database: ${totalCardsInDb}`);
  console.log(`🇯🇵 Japanese cards in database: ${japaneseCardsInDb}`);
  
  console.log(`\n🎯 Next Steps:`);
  console.log(`1. ✅ English sets imported from GitHub (8,419 cards)`);
  console.log(`2. ✅ Japanese sets imported from adapters (${japaneseCardsInDb} cards)`);
  console.log(`3. 🔄 Next: Set up eBay RSS for pricing data (works for both EN/JP)`);
}

// Run the import
importAllJapaneseSets().catch(console.error);

