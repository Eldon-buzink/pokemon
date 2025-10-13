#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { ApifyClient } from 'apify-client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const apify = new ApifyClient({
  token: process.env.APIFY_TOKEN!,
});

interface Card {
  card_id: string;
  name: string;
  number: string;
  set_id: string;
}

interface EbayListing {
  title: string;
  price: number;
  url: string;
  condition: string;
  soldDate?: string;
}

// Improved search term generation
function generateSearchTerms(card: Card, isJapanese: boolean = false): string[] {
  const { name, number, set_id } = card;
  
  // Clean card name for search
  const cleanName = name
    .replace(/\([^)]*\)/g, '') // Remove parentheses content
    .replace(/\s+/g, ' ')
    .trim();
  
  const terms: string[] = [];
  
  if (isJapanese) {
    // Japanese sets need different search strategies
    const japaneseSetNames: Record<string, string> = {
      'sv01-jp': 'Scarlet Violet Base',
      'sv02-jp': 'Snow Hazard',
      'sv03-jp': 'Ruler of the Black Flame',
      'sv04-jp': 'Ancient Roar',
      'sv05-jp': 'Shiny Treasure ex',
      'sv06-jp': 'Wild Force',
      'sv07-jp': 'Mask of Change',
      'sv08-jp': 'Shrouded Fable',
      'sv09-jp': 'Fates Collide',
      'sv10-jp': 'Prismatic Evolutions',
      'sv11-jp': 'Mega Evolutions',
      'sv12-jp': 'Mega Evolution',
      'sv35-jp': 'Pokemon Card 151',
      'swsh11-jp': 'Star Birth',
      'swsh12-jp': 'Dark Phantasma',
      'swsh13-jp': 'Lost Abyss',
      'swsh14-jp': 'Incandescent Arcana'
    };
    
    const setName = japaneseSetNames[set_id] || set_id;
    
    // Strategy 1: Japanese set name + card name
    terms.push(`Pokemon ${setName} ${cleanName} ${number}`);
    
    // Strategy 2: Japanese set name + card name (no number)
    terms.push(`Pokemon ${setName} ${cleanName}`);
    
    // Strategy 3: Card name + Japanese set code
    terms.push(`Pokemon ${cleanName} ${set_id.toUpperCase()}`);
    
    // Strategy 4: Card name + "Japanese"
    terms.push(`Pokemon ${cleanName} Japanese ${number}`);
    
  } else {
    // English sets
    const englishSetNames: Record<string, string> = {
      'sv01': 'Scarlet Violet Base',
      'sv1': 'Violet ex',
      'sv2': 'Paldea Evolved',
      'sv3': 'Obsidian Flames',
      'sv4': 'Paradox Rift',
      'sv5': 'Temporal Forces',
      'sv6': 'Twilight Masquerade',
      'sv7': 'Stellar Crown',
      'sv8': 'Stellar Crown',
      'sv9': 'Journey Together',
      'sv10': 'Prismatic Evolutions',
      'sv12': 'Mega Evolutions',
      'sv35': '151',
      'pgo': 'Pokemon GO',
      'cel25': 'Celebrations',
      'cel25c': 'Celebrations Classic',
      'swsh1': 'Sword Shield Base',
      'swsh2': 'Rebel Clash',
      'swsh3': 'Darkness Ablaze',
      'swsh4': 'Vivid Voltage',
      'swsh5': 'Battle Styles',
      'swsh6': 'Chilling Reign',
      'swsh7': 'Evolving Skies',
      'swsh8': 'Fusion Strike',
      'swsh9': 'Brilliant Stars',
      'swsh10': 'Astral Radiance',
      'swsh11': 'Brilliant Stars',
      'swsh12': 'Silver Tempest'
    };
    
    const setName = englishSetNames[set_id] || set_id;
    
    // Strategy 1: Set name + card name + number
    terms.push(`Pokemon ${setName} ${cleanName} ${number}`);
    
    // Strategy 2: Set name + card name (no number)
    terms.push(`Pokemon ${setName} ${cleanName}`);
    
    // Strategy 3: Card name + set code
    terms.push(`Pokemon ${cleanName} ${set_id.toUpperCase()}`);
    
    // Strategy 4: Card name + number (generic)
    terms.push(`Pokemon ${cleanName} ${number}`);
  }
  
  return terms;
}

// Improved matching logic
function matchCardToEbayListing(card: Card, listing: EbayListing): boolean {
  const { name, number, set_id } = card;
  const title = listing.title.toLowerCase();
  
  // Clean card name for matching
  const cleanName = name.toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Check if card name appears in title
  const nameWords = cleanName.split(' ');
  const nameInTitle = nameWords.every(word => 
    word.length > 2 && title.includes(word)
  );
  
  if (!nameInTitle) return false;
  
  // Check if card number appears in title
  const numberInTitle = title.includes(number);
  
  // Check if set appears in title (flexible matching)
  const setVariations = [
    set_id.toLowerCase(),
    set_id.toUpperCase(),
    set_id.replace('-', ''),
    set_id.replace('-', ' ')
  ];
  
  const setInTitle = setVariations.some(variation => 
    title.includes(variation)
  );
  
  // For Japanese sets, be more flexible with set matching
  const isJapanese = set_id.endsWith('-jp');
  if (isJapanese) {
    return nameInTitle && (numberInTitle || setInTitle);
  }
  
  return nameInTitle && (numberInTitle || setInTitle);
}

async function importSetEbayData(setId: string, cards: Card[]): Promise<number> {
  console.log(`\n📦 Processing set ${setId}...`);
  console.log(`  📊 Found ${cards.length} cards`);
  
  const isJapanese = setId.endsWith('-jp');
  const language = isJapanese ? 'ja' : 'en';
  
  // Generate search terms for a sample of cards (to avoid too many API calls)
  const sampleSize = Math.min(50, cards.length);
  const sampleCards = cards.slice(0, sampleSize);
  
  let totalSales = 0;
  
  for (const card of sampleCards) {
    const searchTerms = generateSearchTerms(card, isJapanese);
    
    for (const searchTerm of searchTerms) {
      try {
        console.log(`    🔍 Searching: "${searchTerm}"`);
        
        const input = {
          searchTerms: [searchTerm],
          maxItems: 50,
          country: 'US',
          language: language,
          condition: 'used',
          sortOrder: 'EndTimeSoonest'
        };
        
        const run = await apify.actor('dtrungtin/ebay-items-scraper').call(input);
        const { items } = await apify.dataset(run.defaultDatasetId).listItems();
        
        if (!items || items.length === 0) {
          console.log(`      ⚠️  No results for "${searchTerm}"`);
          continue;
        }
        
        console.log(`      📊 Found ${items.length} listings`);
        
        // Process listings
        const matchedListings = items.filter((listing: any) => 
          matchCardToEbayListing(card, listing)
        );
        
        if (matchedListings.length === 0) {
          console.log(`      ⚠️  No matches for "${searchTerm}"`);
          continue;
        }
        
        console.log(`      ✅ Matched ${matchedListings.length} listings`);
        
        // Store sales data
        for (const listing of matchedListings) {
          const { error } = await supabase
            .from('graded_sales')
            .upsert({
              card_id: card.card_id,
              grade: 'RAW', // Default grade
              price_cents: Math.round(listing.price * 100),
              sale_date: listing.soldDate || new Date().toISOString().split('T')[0],
              source: 'ebay_apify',
              url: listing.url,
              condition: listing.condition || 'used'
            });
          
          if (error) {
            console.log(`      ❌ Error storing sale: ${error.message}`);
          } else {
            totalSales++;
          }
        }
        
        // Break after first successful search term
        if (matchedListings.length > 0) break;
        
      } catch (error) {
        console.log(`      ❌ Error searching "${searchTerm}": ${error.message}`);
      }
    }
  }
  
  console.log(`  ✅ Set complete: ${totalSales} sales stored`);
  return totalSales;
}

async function comprehensiveEbayImport() {
  console.log('🚀 Comprehensive eBay Import for ALL Sets');
  console.log('==========================================');
  
  // Get all sets with their cards
  const pageSize = 1000;
  let from = 0;
  let to = pageSize - 1;
  const sets = new Set();
  
  // Get all unique sets
  for (;;) {
    const { data, error } = await supabase
      .from('v_cards_latest')
      .select('set_id')
      .not('set_id', 'is', null)
      .order('set_id')
      .range(from, to);
    
    if (error || !data || data.length === 0) break;
    
    data.forEach(r => sets.add(r.set_id));
    if (data.length < pageSize) break;
    
    from += pageSize;
    to += pageSize;
  }
  
  const uniqueSets = Array.from(sets).sort();
  console.log(`\n📋 Processing ${uniqueSets.length} sets...`);
  
  let totalSales = 0;
  let processedSets = 0;
  
  // Process sets in priority order
  const priority1 = ['sv01-jp', 'sv02-jp', 'sv03-jp', 'sv04-jp', 'sv05-jp', 'pgo', 'cel25', 'cel25c'];
  const priority2 = ['swsh1', 'swsh2', 'swsh3', 'swsh4', 'swsh5', 'swsh6', 'swsh7', 'swsh8', 'swsh9', 'swsh10', 'swsh11', 'swsh12'];
  const priority3 = uniqueSets.filter(setId => !priority1.includes(setId) && !priority2.includes(setId));
  
  const allPriorities = [...priority1, ...priority2, ...priority3];
  
  for (const setId of allPriorities) {
    if (!uniqueSets.includes(setId)) continue;
    
    // Get cards for this set
    const { data: cards, error } = await supabase
      .from('v_cards_latest')
      .select('card_id, name, number, set_id')
      .eq('set_id', setId)
      .limit(1000);
    
    if (error) {
      console.log(`❌ Error fetching cards for ${setId}: ${error.message}`);
      continue;
    }
    
    if (!cards || cards.length === 0) {
      console.log(`⚠️  No cards found for ${setId}`);
      continue;
    }
    
    const sales = await importSetEbayData(setId, cards);
    totalSales += sales;
    processedSets++;
    
    // Add delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 Comprehensive Import Complete!');
  console.log('====================================');
  console.log(`✅ Sets processed: ${processedSets}`);
  console.log(`✅ Total sales stored: ${totalSales}`);
  console.log(`📊 Database now has comprehensive eBay coverage`);
}

comprehensiveEbayImport().catch(console.error);
