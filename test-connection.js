/**
 * Test Supabase Connection
 * Run this to verify your database setup is working
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔍 Testing Supabase connection...')
  
  try {
    // Test 1: Basic connection
    console.log('📡 Testing basic connection...')
    const { data, error } = await supabase.from('cards').select('count').limit(1)
    
    if (error) {
      throw new Error(`Connection failed: ${error.message}`)
    }
    
    console.log('✅ Basic connection successful')
    
    // Test 2: Check if tables exist
    console.log('📋 Checking database tables...')
    const tables = [
      'cards', 'card_assets', 'raw_prices', 'graded_sales', 
      'psa_pop', 'facts_daily', 'facts_5d', 'facts_historical',
      'email_subscriptions', 'market_update_logs'
    ]
    
    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('count').limit(1)
      if (tableError) {
        console.log(`❌ Table ${table} not found or not accessible`)
      } else {
        console.log(`✅ Table ${table} is ready`)
      }
    }
    
    // Test 3: Test the setup function
    console.log('🧪 Testing setup function...')
    const { data: testData, error: testError } = await supabase.rpc('test_setup')
    
    if (testError) {
      console.log(`⚠️  Setup function test failed: ${testError.message}`)
    } else {
      console.log(`✅ ${testData}`)
    }
    
    console.log('🎉 Supabase setup is working correctly!')
    console.log('🚀 You can now proceed with API setup')
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message)
    console.error('Please check your .env.local file and try again')
    process.exit(1)
  }
}

testConnection()
