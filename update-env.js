/**
 * Simple script to help update environment variables
 */

const fs = require('fs')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function updateEnv() {
  console.log('🔧 Let\'s update your .env.local file with the correct Supabase keys')
  console.log('')
  console.log('Go to your Supabase dashboard → Settings → API → API Keys')
  console.log('')
  
  // Get the anon key
  const anonKey = await new Promise((resolve) => {
    rl.question('📋 Paste your complete ANON/PUBLIC key (starts with eyJ...): ', resolve)
  })
  
  // Get the service role key
  const serviceKey = await new Promise((resolve) => {
    rl.question('🔐 Paste your complete SERVICE ROLE key (starts with eyJ...): ', resolve)
  })
  
  // Create the .env.local content
  const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://eoppmqsugkezzospmfns.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceKey}
SUPABASE_IMAGE_BUCKET=card-images

# Pokemon TCG Catalog API (static data, images)
POKEMON_TCG_API_URL=https://api.pokemontcg.io/v2
POKEMON_TCG_API_KEY=your_pokemon_tcg_api_key

# Pokemon Price Tracker API (daily market data)
PPT_API_KEY=your_ppt_api_key
PPT_BASE_URL=https://api.pokemonpricetracker.com
PPT_DAILY_QUOTA=20000

# Future data sources (optional)
CARDMARKET_API_KEY=your_cardmarket_api_key
EBAY_API_KEY=your_ebay_api_key
PSA_API_KEY=your_psa_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
`
  
  // Write the file
  fs.writeFileSync('.env.local', envContent)
  
  console.log('')
  console.log('✅ .env.local file updated successfully!')
  console.log('🧪 Now let\'s test the connection...')
  
  rl.close()
}

updateEnv().catch(console.error)
