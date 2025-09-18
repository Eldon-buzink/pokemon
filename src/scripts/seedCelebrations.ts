import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

const BASE = process.env.POKEMONTCG_API_BASE || 'https://api.pokemontcg.io/v2';
const H: Record<string, string> = process.env.POKEMONTCG_API_KEY ? { 'X-Api-Key': process.env.POKEMONTCG_API_KEY! } : {};

async function fetchSet(setId: string) {
  console.log(`🎯 Fetching set ${setId} from PTCG.io...`);
  const url = `${BASE}/cards?q=set.id:${setId}&pageSize=250`;
  const res = await fetch(url, { headers: H });
  
  if (!res.ok) {
    throw new Error(`PTCG set fetch ${setId} -> ${res.status}: ${res.statusText}`);
  }
  
  const json = await res.json();
  console.log(`✅ Found ${json.data?.length || 0} cards in ${setId}`);
  return json.data as any[];
}

async function upsertCards(setId: string) {
  try {
    const cards = await fetchSet(setId);
    let upsertedCount = 0;
    
    for (const c of cards) {
      // Upsert card data
      const cardData = {
        card_id: c.id,             // use official PTCG card id
        set_id: c.set.id,          // 'cel25' or 'cel25c'
        number: String(c.number),
        name: c.name,
        rarity: c.rarity ?? null,
        lang: 'EN',
        edition: 'Unlimited'
      };
      
      const { error: cardError } = await db.from('cards').upsert(cardData, {
        onConflict: 'card_id'
      });
      
      if (cardError) {
        console.error(`❌ Error upserting card ${c.name} (${c.id}):`, cardError);
        continue;
      }
      
      // Upsert card assets (images)
      const assetData = {
        card_id: c.id,
        tcgio_id: c.id,
        set_name: c.set.name,
        release_date: c.set.releaseDate ? new Date(c.set.releaseDate).toISOString().split('T')[0] : null,
        rarity: c.rarity ?? null,
        image_url_small: c.images?.small || null,
        image_url_large: c.images?.large || null,
        last_catalog_sync: new Date().toISOString()
      };
      
      const { error: assetError } = await db.from('card_assets').upsert(assetData, {
        onConflict: 'card_id'
      });
      
      if (assetError) {
        console.error(`❌ Error upserting assets for ${c.name}:`, assetError);
      } else {
        upsertedCount++;
        if (upsertedCount % 10 === 0) {
          console.log(`📝 Upserted ${upsertedCount}/${cards.length} cards + assets from ${setId}...`);
        }
      }
      
      // Small delay to avoid overwhelming the database
      await new Promise(r => setTimeout(r, 50));
    }
    
    console.log(`✅ Successfully upserted ${upsertedCount} cards from ${setId}`);
    return upsertedCount;
  } catch (error) {
    console.error(`❌ Error processing set ${setId}:`, error);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting Celebrations card seeding...');
  console.log('📡 Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('🔑 Service role key configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('🎮 PTCG API key configured:', !!process.env.POKEMONTCG_API_KEY);
  
  try {
    // Test database connection
    const { data: testQuery, error: testError } = await db
      .from('cards')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    
    console.log(`📊 Current cards in database: ${testQuery?.[0]?.count || 'unknown'}`);
    
    // Seed both Celebrations sets
    const n1 = await upsertCards('cel25');   // Celebrations (main 1–25)
    const n2 = await upsertCards('cel25c');  // Classic Collection (101–125)
    
    console.log('\n🎉 Seeding complete!');
    console.log(`📊 Results: { cel25: ${n1}, cel25c: ${n2} }`);
    
    // Verify the seeding worked
    const { data: finalCount, error: countError } = await db
      .from('cards')
      .select('set_id', { count: 'exact' })
      .in('set_id', ['cel25', 'cel25c']);
      
    if (!countError && finalCount) {
      console.log(`✅ Verification: ${finalCount.length} total Celebrations cards in database`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
main().then(() => {
  console.log('🏁 Seeding script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Seeding script failed:', error);
  process.exit(1);
});
