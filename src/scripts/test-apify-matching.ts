#!/usr/bin/env tsx

/**
 * Test Apify matching logic with one set
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { ApifyClient } from 'apify-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN!,
});

async function testMatching() {
  console.log('🧪 Testing Apify Matching Logic');
  console.log('==============================\n');
  
  // Get a few cards from sv12 (newest set)
  const { data: cards } = await supabase
    .from('cards')
    .select('card_id, set_id, number, name, rarity, lang')
    .eq('set_id', 'sv12')
    .limit(5);
  
  if (!cards) {
    console.log('No cards found');
    return;
  }
  
  console.log(`Testing with ${cards.length} cards from sv12:\n`);
  cards.forEach(card => {
    console.log(`  - ${card.name} (#${card.number})`);
  });
  
  // Get set name
  const { data: assets } = await supabase
    .from('card_assets')
    .select('set_name')
    .eq('card_id', cards[0].card_id)
    .limit(1);
  
  const setName = assets?.[0]?.set_name || 'sv12';
  
  console.log(`\nSet: ${setName}\n`);
  
  // Generate search URLs
  const startUrls = cards.map(card => {
    const searchQuery = `Pokemon ${card.name} ${setName} ${card.number}`;
    return {
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&LH_Complete=1&LH_Sold=1`
    };
  });
  
  console.log('Search URLs:');
  startUrls.forEach((url, i) => {
    console.log(`  ${i + 1}. ${url.url.substring(0, 100)}...`);
  });
  
  console.log('\n🚀 Running Apify scraper...\n');
  
  // Run scraper
  const run = await apifyClient.actor('dtrungtin/ebay-items-scraper').call({
    startUrls,
    maxItems: 25,  // 5 results per card
    proxyConfig: {
      useApifyProxy: true,
    },
  });
  
  console.log(`Run ID: ${run.id}`);
  console.log(`Status: ${run.status}`);
  
  if (run.status === 'SUCCEEDED') {
    // Get results
    const client = apifyClient.run(run.id);
    const { items } = await client.dataset().listItems();
    
    console.log(`\n📊 Retrieved ${items.length} eBay listings:\n`);
    
    items.forEach((item: any, i: number) => {
      console.log(`${i + 1}. ${item.title}`);
      console.log(`   Price: ${item.priceWithCurrency || item.price}`);
      console.log(`   URL: ${item.url}`);
      console.log(``);
    });
    
    // Test matching
    console.log('🔍 Testing matching logic:\n');
    
    let matched = 0;
    let unmatched = 0;
    
    for (const item of items) {
      const titleLower = item.title.toLowerCase();
      
      const matchedCard = cards.find(card => {
        const nameLower = card.name.toLowerCase();
        const nameVariants = [
          nameLower,
          nameLower.replace(' ex', 'ex'),
          nameLower.replace(' v', 'v'),
          nameLower.replace(' vmax', 'vmax'),
          nameLower.replace(' gx', 'gx'),
        ];
        const hasName = nameVariants.some(variant => titleLower.includes(variant));
        
        const cardNum = card.number.toString();
        const paddedNum = cardNum.padStart(3, '0');
        
        const numberVariants = [
          `#${paddedNum}`,
          `#${cardNum}`,
          ` ${paddedNum}/`,
          ` ${cardNum}/`,
          `/${paddedNum}`,
          `/${cardNum}`,
          `-${paddedNum}`,
          `-${cardNum}`,
          ` ${paddedNum} `,
          ` ${cardNum} `,
        ];
        
        const hasNumber = numberVariants.some(variant => 
          titleLower.includes(variant.toLowerCase())
        );
        
        const setRef = card.set_id.replace(/-jp$/, '').toUpperCase();
        const hasSet = titleLower.includes(setRef.toLowerCase());
        
        return (hasName && hasNumber) || (hasName && hasSet && titleLower.includes(cardNum));
      });
      
      if (matchedCard) {
        console.log(`✅ MATCHED: "${item.title.substring(0, 60)}..."`);
        console.log(`   → ${matchedCard.name} (#${matchedCard.number})`);
        matched++;
      } else {
        console.log(`❌ UNMATCHED: "${item.title.substring(0, 60)}..."`);
        unmatched++;
      }
    }
    
    console.log(`\n📊 Matching Results:`);
    console.log(`   ✅ Matched: ${matched} / ${items.length} (${Math.round(matched / items.length * 100)}%)`);
    console.log(`   ❌ Unmatched: ${unmatched}`);
  }
}

testMatching().catch(console.error);

