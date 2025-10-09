#!/usr/bin/env tsx

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Modern Pokemon sets to add (using Pokemon TCG API set IDs)
const MODERN_SETS = [
  // Sword & Shield Era
  { id: 'swsh1', name: 'Sword & Shield Base Set', year: 2020 },
  { id: 'swsh2', name: 'Rebel Clash', year: 2020 },
  { id: 'swsh3', name: 'Darkness Ablaze', year: 2020 },
  { id: 'swsh4', name: 'Vivid Voltage', year: 2020 },
  { id: 'swsh5', name: 'Battle Styles', year: 2021 },
  { id: 'swsh6', name: 'Chilling Reign', year: 2021 },
  { id: 'swsh7', name: 'Evolving Skies', year: 2021 },
  { id: 'swsh8', name: 'Fusion Strike', year: 2021 },
  { id: 'swsh9', name: 'Brilliant Stars', year: 2022 },
  { id: 'swsh10', name: 'Astral Radiance', year: 2022 },
  { id: 'swsh11', name: 'Lost Origin', year: 2022 },
  { id: 'swsh12', name: 'Silver Tempest', year: 2022 },
  
  // Scarlet & Violet Era
  { id: 'sv1', name: 'Scarlet & Violet Base Set', year: 2023 },
  { id: 'sv2', name: 'Paldea Evolved', year: 2023 },
  { id: 'sv3', name: 'Obsidian Flames', year: 2023 },
  { id: 'sv4', name: 'Paradox Rift', year: 2023 },
  { id: 'sv5', name: 'Paldean Fates', year: 2024 },
  { id: 'sv6', name: 'Temporal Forces', year: 2024 },
  { id: 'sv7', name: 'Twilight Masquerade', year: 2024 },
  { id: 'sv8', name: 'Shrouded Fable', year: 2024 },
  { id: 'sv9', name: 'Stellar Crown', year: 2024 },
  
  // Special Sets
  { id: 'cel25', name: 'Celebrations', year: 2021 },
  { id: 'cel25c', name: 'Celebrations Classic', year: 2021 },
  { id: 'pgo', name: 'Pokemon GO', year: 2022 },
  { id: 'crown', name: 'Crown Zenith', year: 2023 },
];

async function fetchSetData(setId: string) {
  try {
    const response = await fetch(`https://api.pokemontcg.io/v2/sets/${setId}`);
    if (!response.ok) {
      console.log(`  ⚠️  Set ${setId} not found in Pokemon TCG API`);
      return null;
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.log(`  ❌ Error fetching set ${setId}:`, error);
    return null;
  }
}

async function fetchCardsForSet(setId: string) {
  try {
    const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250`);
    if (!response.ok) {
      console.log(`  ⚠️  Cards for set ${setId} not found`);
      return [];
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.log(`  ❌ Error fetching cards for set ${setId}:`, error);
    return [];
  }
}

async function addSetsFixed() {
  console.log('🚀 Adding Pokemon Sets (Fixed Schema)');
  console.log('=====================================');
  
  let totalSets = 0;
  let totalCards = 0;
  
  for (const setInfo of MODERN_SETS) {
    console.log(`\n📦 Processing ${setInfo.name} (${setInfo.id})`);
    
    // Check if set already exists by looking for any cards with this set_id
    const { data: existingCards } = await supabase
      .from('cards')
      .select('card_id')
      .eq('set_id', setInfo.id)
      .limit(1);
    
    if (existingCards && existingCards.length > 0) {
      console.log(`  ✅ Set ${setInfo.id} already has cards, skipping`);
      continue;
    }
    
    // Fetch set data from Pokemon TCG API
    const setData = await fetchSetData(setInfo.id);
    if (!setData) {
      console.log(`  ⚠️  Skipping ${setInfo.id} - not found in API`);
      continue;
    }
    
    console.log(`  ✅ Found set: ${setData.name}`);
    
    // Fetch and insert cards
    const cards = await fetchCardsForSet(setInfo.id);
    if (cards.length === 0) {
      console.log(`  ⚠️  No cards found for set ${setInfo.id}`);
      continue;
    }
    
    console.log(`  📊 Found ${cards.length} cards`);
    
    // Process cards in batches
    const batchSize = 20;
    let cardsInserted = 0;
    
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      
      // Only use columns that actually exist in the schema
      const cardInserts = batch.map(card => ({
        card_id: `${setInfo.id}_${card.number}`,
        set_id: setInfo.id,
        number: card.number,
        name: card.name,
        rarity: card.rarity || 'Common',
        lang: card.lang || 'EN',
        edition: card.edition || 'Unlimited'
      }));
      
      const { error: cardsError } = await supabase
        .from('cards')
        .insert(cardInserts);
      
      if (cardsError) {
        console.log(`  ❌ Error inserting cards batch:`, cardsError);
        continue;
      }
      
      cardsInserted += batch.length;
      totalCards += batch.length;
    }
    
    console.log(`  ✅ Inserted ${cardsInserted} cards for ${setInfo.id}`);
    totalSets++;
  }
  
  console.log(`\n🎉 Set Addition Complete!`);
  console.log(`📦 Sets added: ${totalSets}`);
  console.log(`🃏 Cards added: ${totalCards}`);
  
  if (totalCards > 0) {
    console.log(`\n📋 Next Steps:`);
    console.log(`1. Run: npx tsx src/scripts/complete-tcg-data.ts`);
    console.log(`2. This will generate historical pricing for all new cards`);
    console.log(`3. Check the analysis page to see new sets`);
  }
}

addSetsFixed().catch(console.error);
