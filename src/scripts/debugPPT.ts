import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const BASE = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
const KEY = process.env.PPT_API_KEY;

console.log('🔍 PPT API Debug Tool');
console.log('📡 Base URL:', BASE);
console.log('🔑 API Key configured:', !!KEY);
console.log('🔑 API Key (first 20 chars):', KEY?.substring(0, 20) + '...');

async function testEndpoint(path: string, description: string) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📍 URL: ${BASE}${path}`);
  
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: KEY ? { Authorization: `Bearer ${KEY}` } : {}
    });
    
    console.log(`📊 Status: ${res.status} ${res.statusText}`);
    
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Response:`, JSON.stringify(data, null, 2));
      return data;
    } else {
      const errorText = await res.text();
      console.log(`❌ Error response:`, errorText);
      return null;
    }
  } catch (error) {
    console.log(`💥 Fetch error:`, error);
    return null;
  }
}

async function main() {
  // Test different endpoint patterns
  await testEndpoint('/health', 'Health check');
  await testEndpoint('/sets', 'Available sets');
  await testEndpoint('/card?set=cel25&number=1', 'Celebrations card #1');
  await testEndpoint('/card?set=Celebrations&number=1', 'Celebrations with full name');
  await testEndpoint('/cards?query=Pikachu', 'Search for Pikachu');
  await testEndpoint('/card?name=Pikachu&number=5', 'Pikachu by name and number');
  
  // Test with actual Celebrations card ID
  await testEndpoint('/card/cel25-1', 'Direct card ID lookup');
  
  console.log('\n🏁 PPT API debug complete');
}

main().catch(console.error);
