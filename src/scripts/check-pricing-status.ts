#!/usr/bin/env tsx

/**
 * Check current pricing data status
 * 
 * Run: npx tsx src/scripts/check-pricing-status.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStatus() {
  console.log('📊 Pokemon Card Movers - Pricing Status');
  console.log('=====================================\n');
  
  // Total cards in database
  const { count: totalCards } = await supabase
    .from('cards')
    .select('card_id', { count: 'exact', head: true });
  
  console.log(`📦 Total cards in database: ${totalCards}`);
  
  // Cards with pricing from Apify
  const { count: apifySales } = await supabase
    .from('graded_sales')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'apify-ebay');
  
  const apifyCoverage = ((apifySales! / totalCards!) * 100).toFixed(1);
  console.log(`✅ Apify sales: ${apifySales} (${apifyCoverage}% coverage)`);
  
  // Unique cards with pricing
  const { data: uniqueCards } = await supabase
    .from('graded_sales')
    .select('card_id')
    .eq('source', 'apify-ebay');
  
  const uniqueCardIds = new Set(uniqueCards?.map(s => s.card_id) || []);
  const uniqueCoverage = ((uniqueCardIds.size / totalCards!) * 100).toFixed(1);
  console.log(`🎯 Unique cards with pricing: ${uniqueCardIds.size} (${uniqueCoverage}%)`);
  
  // By set
  const { data: bySet } = await supabase
    .from('graded_sales')
    .select('card_id')
    .eq('source', 'apify-ebay');
  
  if (bySet && bySet.length > 0) {
    const sets = bySet.reduce((acc, sale) => {
      const setId = sale.card_id.split('-').slice(0, -1).join('-');
      acc[setId] = (acc[setId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n📦 Sales by set (${Object.keys(sets).length} sets):`);
    Object.entries(sets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([setId, count]) => {
        console.log(`  ${setId.padEnd(15)}: ${count} sales`);
      });
    
    if (Object.keys(sets).length > 10) {
      console.log(`  ... and ${Object.keys(sets).length - 10} more sets`);
    }
  }
  
  // By grade
  const { data: byGrade } = await supabase
    .from('graded_sales')
    .select('grade')
    .eq('source', 'apify-ebay');
  
  if (byGrade && byGrade.length > 0) {
    const grades = byGrade.reduce((acc, sale) => {
      const grade = sale.grade || 0;
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    console.log(`\n🏆 Sales by grade:`);
    Object.entries(grades)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .forEach(([grade, count]) => {
        const gradeLabel = grade === '0' ? 'Raw/Ungraded' : `PSA ${grade}`;
        console.log(`  ${gradeLabel.padEnd(15)}: ${count} sales`);
      });
  }
  
  // Recent sales
  const { data: recentSales } = await supabase
    .from('graded_sales')
    .select('card_id, price, grade, sold_date')
    .eq('source', 'apify-ebay')
    .order('sold_date', { ascending: false })
    .limit(5);
  
  if (recentSales && recentSales.length > 0) {
    console.log(`\n💰 Recent sales (top 5):`);
    recentSales.forEach(sale => {
      const gradeLabel = sale.grade === 0 ? 'Raw' : `PSA ${sale.grade}`;
      console.log(`  ${sale.card_id.padEnd(20)}: $${sale.price.toFixed(2).padStart(8)} (${gradeLabel})`);
    });
  }
  
  console.log(`\n📈 Progress:`);
  console.log(`  Pricing coverage: ${uniqueCoverage}% (${uniqueCardIds.size}/${totalCards} cards)`);
  console.log(`  Apify free tier: ~$${((apifySales! / 1000) * 0.63).toFixed(2)} used (~$5 limit)`);
  
  console.log(`\n🎯 What's Next:`);
  if (Number(uniqueCoverage) < 50) {
    console.log(`  ⏳ Apify import still running (check back in 10-30 min)`);
  } else if (Number(uniqueCoverage) < 90) {
    console.log(`  ⏳ Apify import progressing well`);
    console.log(`  🔄 Tomorrow: Use eBay API for remaining cards`);
  } else {
    console.log(`  ✅ Pricing data nearly complete!`);
    console.log(`  🔄 Update UI to show real prices`);
  }
}

checkStatus().catch(console.error);

