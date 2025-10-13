#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCurrentStatus() {
  console.log('📊 Checking Current Database Status...');
  console.log('=====================================');
  
  // Get total count
  const { count: totalCards, error: countError } = await supabase
    .from('v_cards_latest')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.log('❌ Error:', countError.message);
    return;
  }
  
  console.log(`📊 Total cards in database: ${totalCards}`);
  
  // Count cards with different price sources
  const { count: ebayCards, error: ebayError } = await supabase
    .from('v_cards_latest')
    .select('*', { count: 'exact', head: true })
    .or('raw_median_30d_cents.not.is.null,raw_median_90d_cents.not.is.null');
    
  const { count: tcgCards, error: tcgError } = await supabase
    .from('v_cards_latest')
    .select('*', { count: 'exact', head: true })
    .not('tcg_raw_cents', 'is', null);
    
  const { count: anyPriceCards, error: anyError } = await supabase
    .from('v_cards_latest')
    .select('*', { count: 'exact', head: true })
    .or('raw_median_30d_cents.not.is.null,raw_median_90d_cents.not.is.null,tcg_raw_cents.not.is.null,ppt_raw_cents.not.is.null,cm_raw_cents.not.is.null');
    
  if (ebayError || tcgError || anyError) {
    console.log('❌ Error getting counts:', ebayError?.message || tcgError?.message || anyError?.message);
    return;
  }
  
  const ebayCoverage = ((ebayCards / totalCards) * 100).toFixed(1);
  const tcgCoverage = ((tcgCards / totalCards) * 100).toFixed(1);
  const anyCoverage = ((anyPriceCards / totalCards) * 100).toFixed(1);
  
  console.log(`📊 Cards with eBay data: ${ebayCards} (${ebayCoverage}%)`);
  console.log(`📊 Cards with TCG data: ${tcgCards} (${tcgCoverage}%)`);
  console.log(`📊 Cards with ANY price data: ${anyPriceCards} (${anyCoverage}%)`);
  
  return {
    totalCards,
    ebayCards,
    tcgCards,
    anyPriceCards,
    ebayCoverage: parseFloat(ebayCoverage),
    tcgCoverage: parseFloat(tcgCoverage),
    anyCoverage: parseFloat(anyCoverage)
  };
}

async function runComprehensiveImport() {
  console.log('🚀 MASTER COMPREHENSIVE IMPORT');
  console.log('==============================');
  console.log('This will import eBay and TCGplayer data for ALL sets');
  console.log('Estimated cost: ~$6.57 for Apify eBay import');
  console.log('TCGplayer import: Free');
  console.log('');
  
  // Check current status
  const beforeStatus = await checkCurrentStatus();
  if (!beforeStatus) return;
  
  console.log('\n🎯 PHASE 1: eBay Import (Apify)');
  console.log('================================');
  console.log('This will import eBay sales data for all sets using improved search terms');
  console.log('Focus: Japanese sets, Celebrations, Pokemon GO, and all missing sets');
  console.log('');
  
  // Import eBay data
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    console.log('🔄 Running comprehensive eBay import...');
    await execAsync('npx tsx src/scripts/comprehensive-ebay-import.ts');
    
    console.log('✅ eBay import complete!');
  } catch (error) {
    console.log('❌ Error running eBay import:', error.message);
  }
  
  // Check status after eBay import
  console.log('\n📊 Status after eBay import:');
  const afterEbayStatus = await checkCurrentStatus();
  
  console.log('\n🎯 PHASE 2: TCGplayer Import');
  console.log('============================');
  console.log('This will import TCGplayer prices for all cards without price data');
  console.log('Focus: Cards missing any price data');
  console.log('');
  
  // Import TCGplayer data
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    console.log('🔄 Running comprehensive TCGplayer import...');
    await execAsync('npx tsx src/scripts/comprehensive-tcgplayer-import.ts');
    
    console.log('✅ TCGplayer import complete!');
  } catch (error) {
    console.log('❌ Error running TCGplayer import:', error.message);
  }
  
  // Final status check
  console.log('\n📊 FINAL STATUS:');
  const finalStatus = await checkCurrentStatus();
  
  if (beforeStatus && finalStatus) {
    console.log('\n📈 IMPROVEMENT SUMMARY:');
    console.log('======================');
    console.log(`eBay coverage: ${beforeStatus.ebayCoverage}% → ${finalStatus.ebayCoverage}% (+${(finalStatus.ebayCoverage - beforeStatus.ebayCoverage).toFixed(1)}%)`);
    console.log(`TCG coverage: ${beforeStatus.tcgCoverage}% → ${finalStatus.tcgCoverage}% (+${(finalStatus.tcgCoverage - beforeStatus.tcgCoverage).toFixed(1)}%)`);
    console.log(`Overall coverage: ${beforeStatus.anyCoverage}% → ${finalStatus.anyCoverage}% (+${(finalStatus.anyCoverage - beforeStatus.anyCoverage).toFixed(1)}%)`);
    
    const totalImprovement = finalStatus.anyPriceCards - beforeStatus.anyPriceCards;
    console.log(`Total cards with price data: +${totalImprovement}`);
    
    if (finalStatus.anyCoverage >= 80) {
      console.log('\n🎉 SUCCESS! Coverage is now excellent (80%+)');
    } else if (finalStatus.anyCoverage >= 60) {
      console.log('\n✅ GOOD! Coverage is now good (60%+)');
    } else if (finalStatus.anyCoverage >= 40) {
      console.log('\n🔄 MODERATE! Coverage is now moderate (40%+)');
    } else {
      console.log('\n⚠️  Coverage still needs improvement');
    }
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('==============');
  console.log('1. Check the frontend to see improved coverage');
  console.log('2. Run additional targeted imports for specific sets if needed');
  console.log('3. Consider running PPT imports for high-value cards');
  console.log('4. Monitor coverage and run periodic updates');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--status')) {
    await checkCurrentStatus();
  } else if (args.includes('--ebay-only')) {
    console.log('🔄 Running eBay import only...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    await execAsync('npx tsx src/scripts/comprehensive-ebay-import.ts');
  } else if (args.includes('--tcg-only')) {
    console.log('🔄 Running TCGplayer import only...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    await execAsync('npx tsx src/scripts/comprehensive-tcgplayer-import.ts');
  } else {
    await runComprehensiveImport();
  }
}

main().catch(console.error);
