// Simple test to debug PPT integration
require('dotenv').config({ path: '.env.local' });

const BASE = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
const KEY = process.env.PPT_API_KEY;

console.log('🔑 PPT API Key:', KEY ? `${KEY.slice(0, 10)}...` : 'NOT SET');
console.log('🌐 PPT Base URL:', BASE);

async function testPPTCall() {
  const testCard = {
    setId: 'celebrations', // PPT uses 'celebrations' not 'cel25'
    number: '1',
    name: 'Ho-Oh'
  };

  console.log('\n🧪 Testing PPT API call for:', testCard);

  // Test endpoint 1: set + number
  const url1 = `${BASE}/card?set=${encodeURIComponent(testCard.setId)}&number=${encodeURIComponent(testCard.number)}`;
  console.log('📡 Trying URL:', url1);

  try {
    const response = await fetch(url1, {
      headers: KEY ? { Authorization: `Bearer ${KEY}` } : {}
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Response Data:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('❌ Error Response:', text);
    }
  } catch (error) {
    console.error('💥 Fetch Error:', error.message);
  }
}

testPPTCall().catch(console.error);
