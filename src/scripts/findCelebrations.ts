import { config } from 'dotenv';

config({ path: '.env.local' });

const BASE = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
const KEY = process.env.PPT_API_KEY;

async function findCelebrationsInPPT() {
  console.log('🔍 Searching for Celebrations sets in PPT...');
  
  try {
    const res = await fetch(`${BASE}/sets`, {
      headers: KEY ? { Authorization: `Bearer ${KEY}` } : {}
    });
    
    if (!res.ok) {
      console.error('❌ Failed to fetch sets:', res.status, res.statusText);
      return;
    }
    
    const data = await res.json();
    const sets = data.data || data;
    
    console.log(`📊 Found ${sets.length} total sets`);
    
    // Search for anything related to Celebrations or 25th
    const celebrationSets = sets.filter((set: any) => {
      const name = set.name?.toLowerCase() || '';
      const tcgId = set.tcgPlayerId?.toLowerCase() || '';
      
      return name.includes('celebration') || 
             name.includes('25th') || 
             tcgId.includes('celebration') ||
             tcgId.includes('25th') ||
             name.includes('anniversary');
    });
    
    console.log(`\n🎉 Found ${celebrationSets.length} Celebrations-related sets:`);
    
    celebrationSets.forEach((set: any) => {
      console.log(`\n📦 Set: ${set.name}`);
      console.log(`   🆔 ID: ${set.id}`);
      console.log(`   🏷️  TCG Player ID: ${set.tcgPlayerId}`);
      console.log(`   📅 Release Date: ${set.releaseDate}`);
      console.log(`   🃏 Card Count: ${set.cardCount}`);
    });
    
    // Also search for recent sets (2021) that might be Celebrations
    const recent2021Sets = sets.filter((set: any) => {
      const releaseDate = set.releaseDate || '';
      return releaseDate.includes('2021');
    });
    
    console.log(`\n📅 Sets from 2021 (Celebrations year):`);
    recent2021Sets.slice(0, 10).forEach((set: any) => {
      console.log(`   ${set.name} (${set.tcgPlayerId}) - ${set.cardCount} cards`);
    });
    
  } catch (error) {
    console.error('💥 Error searching for Celebrations:', error);
  }
}

findCelebrationsInPPT();
