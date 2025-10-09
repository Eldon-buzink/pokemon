#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function healthCheck() {
  console.log('🏥 Production Health Check');
  console.log('==========================');
  
  try {
    // Check database connectivity
    const { data, error } = await supabase
      .from('cards')
      .select('card_id')
      .limit(1);
    
    if (error) {
      console.log('❌ Database: Connection failed');
      console.log('Error:', error.message);
      return false;
    }
    
    console.log('✅ Database: Connected');
    
    // Check price data availability
    const { data: priceData, error: priceError } = await supabase
      .from('price_history')
      .select('set_id')
      .limit(1);
    
    if (priceError) {
      console.log('❌ Price Data: Not available');
      return false;
    }
    
    console.log('✅ Price Data: Available');
    
    // Check recent data freshness
    const { data: recentData, error: recentError } = await supabase
      .from('price_history')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);
    
    if (recentError) {
      console.log('⚠️  Recent Data: Unable to check');
    } else if (recentData && recentData.length > 0) {
      const lastUpdate = new Date(recentData[0].date);
      const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`✅ Recent Data: Last update ${daysSinceUpdate} days ago`);
      
      if (daysSinceUpdate > 7) {
        console.log('⚠️  Warning: Data is more than 7 days old');
      }
    }
    
    console.log('\n🎉 All systems operational!');
    return true;
    
  } catch (error) {
    console.log('❌ Health check failed:', error);
    return false;
  }
}

healthCheck().catch(console.error);
