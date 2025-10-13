#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Card {
  card_id: string;
  name: string;
  number: string;
  set_id: string;
  tcg_raw_cents?: number;
}

// TCGplayer set name mapping
const TCGPLAYER_SET_NAMES: Record<string, string> = {
  'sv01': 'Scarlet & Violet Base Set',
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
  'cel25c': 'Celebrations Classic Collection',
  'swsh1': 'Sword & Shield Base Set',
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
  'swsh12': 'Silver Tempest',
  'swsh35': 'Pokemon GO',
  'swsh45': 'Pokemon GO',
  'swshp': 'Pokemon GO',
  'svp': 'Pokemon GO',
  'sve': 'Pokemon GO',
  'sv4pt5': 'Pokemon GO',
  'sv6pt5': 'Pokemon GO',
  'sv8pt5': 'Pokemon GO',
  'sv3pt5': 'Pokemon GO',
  'swsh12pt5': 'Pokemon GO',
  'swsh10tg': 'Trainer Gallery',
  'swsh11tg': 'Trainer Gallery',
  'swsh9tg': 'Trainer Gallery',
  'swsh12tg': 'Trainer Gallery'
};

async function fetchTcgplayerPrices(setId: string, cards: Card[]): Promise<number> {
  console.log(`\n📦 Fetching TCGplayer prices for ${setId}...`);
  console.log(`  📊 Found ${cards.length} cards`);
  
  const setName = TCGPLAYER_SET_NAMES[setId];
  if (!setName) {
    console.log(`  ⚠️  No TCGplayer set name mapping for ${setId}`);
    return 0;
  }
  
  console.log(`  🔍 Searching TCGplayer for: "${setName}"`);
  
  try {
    // Use the Pokemon TCG API to get TCGplayer prices
    const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.name:"${encodeURIComponent(setName)}"&pageSize=250`);
    
    if (!response.ok) {
      console.log(`  ❌ Error fetching from Pokemon TCG API: ${response.status}`);
      return 0;
    }
    
    const data = await response.json();
    const apiCards = data.data || [];
    
    console.log(`  📊 Found ${apiCards.length} cards in Pokemon TCG API`);
    
    let updatedCards = 0;
    
    for (const apiCard of apiCards) {
      // Find matching card in our database
      const matchingCard = cards.find(card => 
        card.name === apiCard.name && 
        card.number === apiCard.number
      );
      
      if (!matchingCard) continue;
      
      // Extract TCGplayer price
      const tcgplayerPrice = apiCard.tcgplayer?.prices?.normal?.market || 
                           apiCard.tcgplayer?.prices?.holofoil?.market ||
                           apiCard.tcgplayer?.prices?.reverseHolofoil?.market;
      
      if (!tcgplayerPrice) continue;
      
      const priceCents = Math.round(tcgplayerPrice * 100);
      
      // Update the card with TCGplayer price
      const { error } = await supabase
        .from('v_cards_latest')
        .update({ tcg_raw_cents: priceCents })
        .eq('card_id', matchingCard.card_id);
      
      if (error) {
        console.log(`    ❌ Error updating ${matchingCard.card_id}: ${error.message}`);
      } else {
        updatedCards++;
        console.log(`    ✅ Updated ${matchingCard.card_id}: $${(priceCents/100).toFixed(2)}`);
      }
    }
    
    console.log(`  ✅ Updated ${updatedCards} cards with TCGplayer prices`);
    return updatedCards;
    
  } catch (error) {
    console.log(`  ❌ Error fetching TCGplayer prices: ${error.message}`);
    return 0;
  }
}

async function comprehensiveTcgplayerImport() {
  console.log('🚀 Comprehensive TCGplayer Import for ALL Sets');
  console.log('==============================================');
  
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
  
  let totalUpdated = 0;
  let processedSets = 0;
  
  // Process sets in priority order (focus on sets without TCG data)
  for (const setId of uniqueSets) {
    // Get cards for this set that don't have TCG data
    const { data: cards, error } = await supabase
      .from('v_cards_latest')
      .select('card_id, name, number, set_id, tcg_raw_cents')
      .eq('set_id', setId)
      .is('tcg_raw_cents', null)
      .limit(1000);
    
    if (error) {
      console.log(`❌ Error fetching cards for ${setId}: ${error.message}`);
      continue;
    }
    
    if (!cards || cards.length === 0) {
      console.log(`⚠️  No cards without TCG data found for ${setId}`);
      continue;
    }
    
    const updated = await fetchTcgplayerPrices(setId, cards);
    totalUpdated += updated;
    processedSets++;
    
    // Add delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Comprehensive TCGplayer Import Complete!');
  console.log('===========================================');
  console.log(`✅ Sets processed: ${processedSets}`);
  console.log(`✅ Total cards updated: ${totalUpdated}`);
  console.log(`📊 Database now has comprehensive TCGplayer coverage`);
}

comprehensiveTcgplayerImport().catch(console.error);
