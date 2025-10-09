#!/usr/bin/env tsx

/**
 * Apify eBay Bulk Import Script
 * 
 * Uses Apify's eBay scraper to get initial pricing data for all cards
 * 
 * Strategy:
 * 1. Fetch all cards from database
 * 2. Generate eBay search URLs for batches of cards
 * 3. Run Apify eBay scraper
 * 4. Import results into graded_sales and prices tables
 * 
 * Cost: ~$7 for 11k cards (one-time)
 * 
 * Run: npx tsx src/scripts/apify-ebay-bulk-import.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { ApifyClient } from 'apify-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN!,
});

const ACTOR_ID = 'dtrungtin/ebay-items-scraper';

interface Card {
  card_id: string;
  set_id: string;
  number: string;
  name: string;
  rarity: string | null;
  lang: string;
  set_name: string | null;
}

interface ApifyEbayItem {
  title: string;
  price: number;
  priceWithCurrency: string;
  sold?: number;
  url: string;
  itemNumber: string;
  image?: string;
  condition?: string;
}

/**
 * Generate eBay search URL for a card
 */
function generateEbaySearchUrl(card: Card, language: 'en' | 'ja' = 'en'): string {
  const domain = language === 'ja' ? 'ebay.co.jp' : 'ebay.com';
  const setName = card.set_name || card.set_id;
  const searchQuery = `Pokemon ${card.name} ${setName} ${card.number}`;
  
  const params = new URLSearchParams({
    _nkw: searchQuery,
    LH_Complete: '1',  // Completed listings
    LH_Sold: '1',      // Sold items only
    _sop: '13',        // Sort by time: newly listed
  });
  
  return `https://www.${domain}/sch/i.html?${params.toString()}`;
}

/**
 * Extract PSA grade from title
 */
function extractGrade(title: string): number | null {
  if (title.match(/PSA[-\s]?10/i) || title.match(/CGC[-\s]?10/i) || title.match(/BGS[-\s]?10/i)) return 10;
  if (title.match(/PSA[-\s]?9/i)) return 9;
  if (title.match(/PSA[-\s]?8/i)) return 8;
  return null;  // Raw/ungraded
}

/**
 * Run Apify scraper for a batch of cards
 */
async function runApifyScraper(cards: Card[], language: 'en' | 'ja' = 'en') {
  console.log(`  🚀 Running Apify scraper for ${cards.length} cards (${language})...`);
  
  // Generate search URLs
  const startUrls = cards.map(card => ({
    url: generateEbaySearchUrl(card, language)
  }));
  
  // Run the Apify actor
  const run = await apifyClient.actor(ACTOR_ID).call({
    startUrls,
    maxItems: cards.length * 5,  // Get up to 5 results per card
    proxyConfig: {
      useApifyProxy: true,
      apifyProxyCountry: language === 'ja' ? 'JP' : 'US'
    },
  });
  
  console.log(`  ✅ Scraper run: ${run.id}`);
  console.log(`  ⏳ Status: ${run.status}`);
  
  // Wait for completion
  const client = apifyClient.run(run.id);
  
  // Poll for completion (max 5 minutes for smaller batches)
  let attempts = 0;
  const maxAttempts = 30;  // 5 minutes (10 seconds each)
  
  while (attempts < maxAttempts) {
    const runInfo = await client.get();
    
    if (runInfo?.status === 'SUCCEEDED') {
      console.log(`  ✅ Scraper completed successfully`);
      break;
    } else if (runInfo?.status === 'FAILED') {
      console.log(`  ❌ Scraper failed`);
      return null;
    } else if (runInfo?.status === 'RUNNING') {
      // Don't log every attempt
      if (attempts % 3 === 0) {
        console.log(`  ⏳ Still running... (${Math.round(attempts * 10 / 60)} min)`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000));  // Wait 10 seconds
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    console.log(`  ⚠️  Scraper timed out after ${maxAttempts * 10 / 60} minutes`);
    return null;
  }
  
  // Get results
  const { items } = await client.dataset().listItems();
  console.log(`  📊 Retrieved ${items.length} eBay listings`);
  
  return items as ApifyEbayItem[];
}

/**
 * Process Apify results and store in database
 */
async function processApifyResults(cards: Card[], results: ApifyEbayItem[]) {
  console.log(`  💾 Processing ${results.length} eBay listings...`);
  
  let stored = 0;
  let skipped = 0;
  
  for (const item of results) {
    // Match item to card by searching title (comprehensive matching)
    const matchedCard = cards.find(card => {
      const titleLower = item.title.toLowerCase();
      const nameLower = card.name.toLowerCase();
      
      // Check if card name is in title (handle variations)
      const nameVariants = [
        nameLower,
        nameLower.replace(' ex', 'ex'),  // "Charizard ex" vs "Charizardex"
        nameLower.replace(' v', 'v'),    // "Pikachu V" vs "PikachuV"
        nameLower.replace(' vmax', 'vmax'),
        nameLower.replace(' gx', 'gx'),
      ];
      const hasName = nameVariants.some(variant => titleLower.includes(variant));
      
      // Check if card number is in title (handle ALL common formats)
      const cardNum = card.number.toString();
      const paddedNum = cardNum.padStart(3, '0');  // e.g., "6" → "006"
      
      const numberVariants = [
        `#${paddedNum}`,           // #006
        `#${cardNum}`,             // #6
        ` ${paddedNum}/`,          // " 006/"
        ` ${cardNum}/`,            // " 6/"
        `/${paddedNum}`,           // "/006"
        `/${cardNum}`,             // "/6"
        `-${paddedNum}`,           // "-006"
        `-${cardNum}`,             // "-6"
        ` ${paddedNum} `,          // " 006 "
        ` ${cardNum} `,            // " 6 "
      ];
      
      const hasNumber = numberVariants.some(variant => 
        titleLower.includes(variant.toLowerCase())
      );
      
      // Also check for set reference in title (e.g., "SV12", "sv12")
      const setRef = card.set_id.replace(/-jp$/, '').toUpperCase();
      const hasSet = titleLower.includes(setRef.toLowerCase());
      
      // Match if: (name AND number) OR (name AND set reference)
      return (hasName && hasNumber) || (hasName && hasSet && titleLower.includes(cardNum));
    });
    
    if (!matchedCard) {
      skipped++;
      // Log first few unmatched for debugging
      if (skipped <= 3) {
        console.log(`    ⚠️  Unmatched: "${item.title.substring(0, 80)}..."`);
      }
      continue;
    }
    
    const grade = extractGrade(item.title);
    
    // Store in graded_sales
    const { error } = await supabase
      .from('graded_sales')
      .insert({
        card_id: matchedCard.card_id,
        grade: grade || 0,
        sold_date: new Date().toISOString().split('T')[0],
        price: item.price,
        source: 'apify-ebay',
        listing_id: item.itemNumber,
      });
    
    if (!error || error.code === '23505') {  // Ignore duplicates
      stored++;
      
      // Also store in prices table
      await supabase
        .from('prices')
        .upsert({
          card_id: matchedCard.card_id,
          source: 'ebay',
          raw_cents: grade === null ? Math.round(item.price * 100) : null,
          psa10_cents: grade === 10 ? Math.round(item.price * 100) : null,
          currency: 'USD',
          ts: new Date().toISOString(),
          notes: `Apify eBay scraper - ${item.itemNumber}`,
        }, { 
          onConflict: 'card_id,source,ts',
          ignoreDuplicates: true 
        });
    }
  }
  
  console.log(`  ✅ Stored ${stored} sales, skipped ${skipped} unmatched`);
  return { stored, skipped };
}

/**
 * Run bulk import for all cards (newest to oldest)
 */
async function runBulkImport() {
  console.log('🚀 Apify eBay Bulk Import (Newest → Oldest)');
  console.log('==========================================\n');
  
  console.log('⚠️  Note: This will use Apify credits');
  console.log('Free tier: $5/month = ~7,936 items');
  console.log('Strategy: Scrape newest sets first (most volatile prices)\n');
  
  // Sets ordered from newest to oldest (Celebrations through 2025)
  const SETS_NEWEST_TO_OLDEST = [
    // 2025 - Most recent (including Inferno X if we had it)
    'sv12', 'sv12-jp',  // Mega Evolutions
    'sv11-jp',
    'sv10', 'sv10-jp',  // Prismatic Evolutions / Destined Rivals
    
    // 2024 - Scarlet & Violet recent
    'sv9', 'sv09-jp',   // Stellar Crown / Journey Together
    'sv8', 'sv08-jp',   // Surging Sparks / Shrouded Fable
    'sv8pt5',
    'sv7', 'sv07-jp',   // Twilight Masquerade / Stellar Crown
    'sv6', 'sv06-jp',   // Temporal Forces / Twilight Masquerade
    'sv6pt5',
    'sv5', 'sv05-jp',   // Paldean Fates / Shiny Treasure ex
    'sv4pt5',
    
    // 2023 - Scarlet & Violet early
    'sv4', 'sv04-jp',   // Paradox Rift / Raging Surf
    'sv3', 'sv03-jp',   // Obsidian Flames / Clay Burst
    'sv3pt5', 'sv35', 'sv35-jp',  // 151
    'sv2', 'sv02-jp',   // Paldea Evolved / Snow Hazard
    'sv1', 'sv01', 'sv01-jp',  // Scarlet & Violet Base
    'sve', 'svp',
    
    // 2022 - Sword & Shield late
    'swsh12', 'swsh12-jp', 'swsh14-jp',  // Silver Tempest / Incandescent Arcana
    'swsh12tg', 'swsh12pt5',
    'swsh11', 'swsh11-jp', 'swsh13-jp',  // Lost Origin / Lost Abyss
    'swsh11tg',
    'swsh10', 'swsh10tg',  // Astral Radiance
    'swsh9', 'swsh9tg',    // Brilliant Stars
    'pgo',  // Pokemon GO
    
    // 2021-2022 - Sword & Shield mid
    'swsh8', 'swsh7', 'swsh6', 'swsh5',
    'swsh45', 'swsh4', 'swsh35', 'swsh3', 'swsh2', 'swsh1',
    'swshp',
    
    // 2021 - Celebrations
    'cel25', 'cel25-jp', 'cel25c',
  ];
  
  console.log(`📋 Processing ${SETS_NEWEST_TO_OLDEST.length} sets (newest → oldest)\n`);
  
  // Process sets in order (newest to oldest)
  let totalCards = 0;
  let totalStored = 0;
  let totalSkipped = 0;
  let creditsUsed = 0;
  const MAX_CREDITS = 5;  // Free tier limit
  
  for (const setId of SETS_NEWEST_TO_OLDEST) {
    // Check if we've hit the free tier limit
    if (creditsUsed >= MAX_CREDITS) {
      console.log(`\n⚠️  Reached free tier limit ($${MAX_CREDITS})`);
      console.log(`Processed ${totalCards} cards before hitting limit`);
      break;
    }
    
    console.log(`\n📦 Processing set ${setId}...`);
    
    // Fetch all cards from this set
    const { data: cards, error } = await supabase
      .from('cards')
      .select('card_id, set_id, number, name, rarity, lang')
      .eq('set_id', setId);
    
    if (error || !cards || cards.length === 0) {
      console.log(`  ⚠️  No cards found for ${setId}`);
      continue;
    }
    
    // Get set names
    const { data: assets } = await supabase
      .from('card_assets')
      .select('card_id, set_name')
      .in('card_id', cards.map(c => c.card_id));
    
    const cardsWithSetNames = cards.map(card => ({
      ...card,
      set_name: assets?.find(a => a.card_id === card.card_id)?.set_name || card.set_id
    }));
    
    console.log(`  📊 Found ${cardsWithSetNames.length} cards`);
    
    // Determine language
    const language = setId.includes('-jp') ? 'ja' : 'en';
    
    // Estimate cost
    const estimatedCost = (cardsWithSetNames.length / 1000) * 0.63;
    console.log(`  💰 Estimated cost: $${estimatedCost.toFixed(2)}`);
    
    if (creditsUsed + estimatedCost > MAX_CREDITS) {
      console.log(`  ⚠️  Would exceed free tier limit, skipping remaining cards`);
      break;
    }
    
    // Run Apify scraper for this set
    const results = await runApifyScraper(cardsWithSetNames, language);
    
    if (!results) {
      console.log(`  ❌ Scraper failed for ${setId}`);
      continue;
    }
    
    // Process results
    const stats = await processApifyResults(cardsWithSetNames, results);
    
    totalCards += cardsWithSetNames.length;
    totalStored += stats.stored;
    totalSkipped += stats.skipped;
    creditsUsed += estimatedCost;
    
    console.log(`  ✅ Set complete: ${stats.stored} sales stored`);
    console.log(`  💰 Credits used: $${creditsUsed.toFixed(2)} / $${MAX_CREDITS}`);
  }
  
  console.log(`\n🎉 Bulk Import Complete!`);
  console.log(`====================================`);
  console.log(`✅ Cards processed: ${totalCards}`);
  console.log(`✅ Sales stored: ${totalStored}`);
  console.log(`⏭️  Skipped: ${totalSkipped}`);
  console.log(`💰 Total credits used: $${creditsUsed.toFixed(2)}`);
  
  console.log(`\n📊 Database Status:`);
  const { count: totalSales } = await supabase
    .from('graded_sales')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'apify-ebay');
  
  console.log(`   Total Apify sales: ${totalSales}`);
  
  console.log(`\n🎯 Next Steps:`);
  console.log(`1. ✅ Newest sets scraped with Apify`);
  console.log(`2. 🔄 Tomorrow: Use eBay API for remaining cards (free)`);
  console.log(`3. 🔄 Set up daily updates for high-priority cards`);
}

// Run the import
runBulkImport().catch(console.error);

