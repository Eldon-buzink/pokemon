/**
 * Sync Cards from Pokemon Price Tracker API to Database
 * This script fetches cards from PPT API and adds them to our database
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createPPTClient } from '@/lib/sources/ppt';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Override the base URL to use the correct domain
process.env.PPT_BASE_URL = 'https://www.pokemonpricetracker.com';

const pptClient = createPPTClient();

// interface PPTCard {
//   id: string;
//   tcgPlayerId: string;
//   setId: string;
//   setName: string;
//   name: string;
//   cardNumber: string;
//   totalSetNumber: string;
//   rarity: string;
//   cardType: string;
//   imageUrl: string;
//   prices: {
//     market: number;
//     lastUpdated: string;
//   };
// }

async function syncPPTCards() {
  console.log('🔄 Starting PPT Card Sync...\n');
  
  try {
    // Get available sets from PPT API
    console.log('📦 Fetching available sets...');
    const sets = await pptClient.getSets();
    console.log(`Found ${sets.length} sets`);
    
    // For now, let's sync cards from a few popular recent sets
    const popularSets = ['Scarlet & Violet Base Set', 'Crown Zenith', 'Paldea Evolved', 'Paradox Rift', 'Temporal Forces'];
    const setsToSync = sets.filter(set => popularSets.includes(set.name));
    
    console.log(`\n🎯 Syncing cards from ${setsToSync.length} popular sets...`);
    
    let totalCardsAdded = 0;
    let totalPriceDataAdded = 0;
    
    for (const set of setsToSync) {
      console.log(`\n📋 Processing set: ${set.name}`);
      
      try {
        // Get cards from this set
        const cards = await pptClient.getCardsBySet(set.name, 50); // Limit to 50 cards per set
        console.log(`  Found ${cards.length} cards`);
        
        for (const card of cards) {
          try {
            // Check if card already exists
            const { data: existingCard } = await supabase
              .from('cards')
              .select('card_id')
              .eq('card_id', card.tcgPlayerId)
              .single();
            
            if (existingCard) {
              console.log(`    ⏭️  Card ${card.name} already exists, skipping`);
              continue;
            }
            
            // Add card to database
            const { error: cardError } = await supabase
              .from('cards')
              .insert({
                card_id: card.tcgPlayerId,
                set_id: card.setId,
                number: card.cardNumber,
                name: card.name,
                rarity: card.rarity,
                lang: 'EN',
                edition: 'Unlimited'
              });
            
            if (cardError) {
              console.log(`    ❌ Error adding card ${card.name}:`, cardError.message);
              continue;
            }
            
            // Add card assets
            const { error: assetError } = await supabase
              .from('card_assets')
              .insert({
                card_id: card.tcgPlayerId,
                tcgio_id: card.id,
                set_name: card.setName,
                rarity: card.rarity,
                image_url_small: card.imageUrl,
                image_url_large: card.imageUrl,
                last_catalog_sync: new Date().toISOString()
              });
            
            if (assetError) {
              console.log(`    ⚠️  Warning: Could not add assets for ${card.name}:`, assetError.message);
            }
            
            // Add current price data
            const { error: priceError } = await supabase
              .from('raw_prices')
              .insert({
                card_id: card.tcgPlayerId,
                source: 'ppt',
                snapshot_date: new Date().toISOString().split('T')[0],
                median_price: card.prices.market,
                n_sales: 1 // PPT API doesn't provide current sales count
              });
            
            if (priceError) {
              console.log(`    ⚠️  Warning: Could not add price data for ${card.name}:`, priceError.message);
            } else {
              totalPriceDataAdded++;
            }
            
            totalCardsAdded++;
            console.log(`    ✅ Added card: ${card.name} (${card.rarity}) - $${card.prices.market}`);
            
            // Add a small delay to respect API rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.log(`    ❌ Error processing card ${card.name}:`, error);
          }
        }
        
      } catch (error) {
        console.log(`  ❌ Error processing set ${set.name}:`, error);
      }
    }
    
    console.log(`\n🎉 Sync Complete!`);
    console.log(`📊 Summary:`);
    console.log(`  - Cards added: ${totalCardsAdded}`);
    console.log(`  - Price data points added: ${totalPriceDataAdded}`);
    
    // Update facts_daily for new cards
    console.log(`\n📈 Updating daily facts...`);
    await updateDailyFacts();
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

async function updateDailyFacts() {
  try {
    // Get all cards that don't have facts_daily entries
    const { data: cardsWithoutFacts } = await supabase
      .from('cards')
      .select('card_id')
      .not('card_id', 'in', 
        supabase
          .from('facts_daily')
          .select('card_id')
      );
    
    if (!cardsWithoutFacts || cardsWithoutFacts.length === 0) {
      console.log('  ✅ All cards already have daily facts');
      return;
    }
    
    console.log(`  📊 Computing facts for ${cardsWithoutFacts.length} cards...`);
    
    for (const card of cardsWithoutFacts) {
      // Get latest price data for this card
      const { data: latestPrice } = await supabase
        .from('raw_prices')
        .select('median_price, n_sales')
        .eq('card_id', card.card_id)
        .eq('source', 'ppt')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();
      
      if (latestPrice) {
        // Insert facts_daily entry
        await supabase
          .from('facts_daily')
          .insert({
            card_id: card.card_id,
            date: new Date().toISOString().split('T')[0],
            raw_median: latestPrice.median_price,
            psa10_median: 0, // No PSA data from PPT API yet
            raw_n: latestPrice.n_sales,
            psa10_n: 0
          });
      }
    }
    
    console.log('  ✅ Daily facts updated');
    
  } catch (error) {
    console.log('  ❌ Error updating daily facts:', error);
  }
}

// Run the sync
syncPPTCards().catch(console.error);
