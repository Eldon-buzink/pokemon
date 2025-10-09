#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { ingestSets } from '../lib/ingest/core';
import { DEFAULT_RANGE_AFTER_CELEBRATIONS, getAvailableSetIds } from '../lib/adapters';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🚀 Starting gradual set expansion...');
  
  const expansionWindow = parseInt(process.env.EXPANSION_WINDOW || '2');
  console.log(`📊 Expansion window: ${expansionWindow} sets per run`);
  
  // Get available sets
  const availableSets = getAvailableSetIds();
  const setsToProcess = DEFAULT_RANGE_AFTER_CELEBRATIONS.filter(setId => 
    availableSets.includes(setId)
  );
  
  console.log(`📦 Total sets available: ${setsToProcess.length}`);
  
  // Get last processed set from database
  let lastProcessedIndex = 0;
  try {
    const { data } = await supabase
      .from('ingest_state')
      .select('last_set_id')
      .eq('id', 1)
      .single();
    
    if (data?.last_set_id) {
      const lastIndex = setsToProcess.indexOf(data.last_set_id);
      if (lastIndex !== -1) {
        lastProcessedIndex = lastIndex + 1; // Start from next set
      }
    }
  } catch (error) {
    console.log('📝 No previous state found, starting from beginning');
  }
  
  console.log(`🔄 Starting from index ${lastProcessedIndex} (${setsToProcess[lastProcessedIndex] || 'end'})`);
  
  // Process sets in windows
  let processedCount = 0;
  let currentIndex = lastProcessedIndex;
  
  while (currentIndex < setsToProcess.length) {
    const window = setsToProcess.slice(currentIndex, currentIndex + expansionWindow);
    console.log(`\n📦 Processing window: ${window.join(', ')}`);
    
    try {
      const results = await ingestSets(window, {
        dryRun: false,
        batchSize: 25,
        maxRetries: 3
      });
      
      let windowSuccess = true;
      for (const result of results) {
        if (result.success) {
          console.log(`✅ ${result.setId}: ${result.cardsProcessed} cards processed`);
          processedCount++;
        } else {
          console.error(`❌ ${result.setId}: Failed with ${result.errors.length} errors`);
          windowSuccess = false;
        }
      }
      
      // Update progress in database
      const lastSetInWindow = window[window.length - 1];
      await supabase
        .from('ingest_state')
        .upsert({
          id: 1,
          last_set_id: lastSetInWindow,
          updated_at: new Date().toISOString()
        });
      
      console.log(`📈 Progress: ${processedCount} sets completed, ${setsToProcess.length - currentIndex - window.length} remaining`);
      
      // Move to next window
      currentIndex += window.length;
      
      // Wait between windows (except if we're done)
      if (currentIndex < setsToProcess.length) {
        console.log('⏳ Waiting 3 minutes before next window...');
        await new Promise(resolve => setTimeout(resolve, 3 * 60 * 1000));
      }
      
    } catch (error) {
      console.error(`💥 Window failed:`, error);
      console.log('🔄 Retrying in 5 minutes...');
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
    }
  }
  
  console.log(`\n🎉 Gradual expansion completed! Processed ${processedCount} sets total.`);
}

main().catch(console.error);