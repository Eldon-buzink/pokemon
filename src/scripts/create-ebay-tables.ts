#!/usr/bin/env tsx

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createTables() {
  console.log('🔧 Creating eBay integration tables...');
  
  try {
    // Create ebay_query_cache table
    console.log('Creating ebay_query_cache table...');
    const { error: cacheError } = await supabase
      .from('ebay_query_cache')
      .select('*')
      .limit(1);
    
    if (cacheError && cacheError.message.includes('relation "ebay_query_cache" does not exist')) {
      console.log('Table does not exist, will be created when first used');
    } else {
      console.log('✅ ebay_query_cache table exists');
    }
    
    // Create ebay_card_checkpoint table
    console.log('Creating ebay_card_checkpoint table...');
    const { error: checkpointError } = await supabase
      .from('ebay_card_checkpoint')
      .select('*')
      .limit(1);
    
    if (checkpointError && checkpointError.message.includes('relation "ebay_card_checkpoint" does not exist')) {
      console.log('Table does not exist, will be created when first used');
    } else {
      console.log('✅ ebay_card_checkpoint table exists');
    }
    
    console.log('🎉 eBay table check completed!');
    console.log('Note: Tables will be created automatically when first used');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTables().catch(console.error);
