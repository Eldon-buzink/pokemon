import { getServerSupabase } from '@/lib/supabase/server';

// Sample cards from cel25c set to seed with history
const sampleCards = [
  { setId: 'cel25c', number: '1', name: 'Venusaur' },
  { setId: 'cel25c', number: '2', name: 'Blastoise' },
  { setId: 'cel25c', number: '3', name: 'Charizard' },
  { setId: 'cel25c', number: '4', name: 'Pikachu' },
  { setId: 'cel25c', number: '5', name: 'Mewtwo' },
  { setId: 'cel25', number: '25', name: 'Flying Pikachu VMAX' },
  { setId: 'cel25', number: '6', name: 'Surfing Pikachu V' },
  { setId: 'cel25', number: '4', name: 'Pikachu V-UNION' }
];

function generatePriceHistory(cardName: string, basePriceRaw: number, basePricePsa10: number) {
  const history = [];
  const popHistory = [];
  
  // Generate 90 days of history
  for (let i = 90; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Add some realistic price variation (±20%)
    const variation = 0.8 + Math.random() * 0.4;
    const rawPrice = basePriceRaw * variation;
    const psa10Price = basePricePsa10 * variation;
    
    history.push({
      date: date.toISOString().split('T')[0],
      rawPrice,
      psa10Price
    });
    
    // Generate population data (growing over time)
    const basePopulation = cardName.includes('Charizard') ? 5000 : 
                          cardName.includes('Pikachu') ? 3000 : 1500;
    const growthFactor = 1 + (90 - i) / 90 * 0.3; // 30% growth over time
    const totalPop = Math.floor(basePopulation * growthFactor);
    const psa10 = Math.floor(totalPop * 0.15); // 15% PSA 10 rate
    const psa9 = Math.floor(totalPop * 0.25); // 25% PSA 9 rate
    
    popHistory.push({
      date: date.toISOString().split('T')[0],
      psa10,
      psa9,
      total: totalPop
    });
  }
  
  return { history, popHistory };
}

async function seedHistoryData() {
  const supabase = getServerSupabase();
  
  console.log('🌱 Seeding price and population history...');
  
  for (const card of sampleCards) {
    console.log(`Seeding ${card.name} (${card.setId}/${card.number})`);
    
    // Base prices for different cards
    const basePrices = {
      'Charizard': { raw: 150, psa10: 800 },
      'Pikachu': { raw: 25, psa10: 120 },
      'Mewtwo': { raw: 35, psa10: 180 },
      'Venusaur': { raw: 45, psa10: 220 },
      'Blastoise': { raw: 40, psa10: 200 },
      'Flying Pikachu VMAX': { raw: 15, psa10: 75 },
      'Surfing Pikachu V': { raw: 12, psa10: 60 },
      'Pikachu V-UNION': { raw: 8, psa10: 45 }
    };
    
    const cardBasePrices = Object.entries(basePrices).find(([name]) => 
      card.name.includes(name)
    )?.[1] || { raw: 20, psa10: 100 };
    
    const { history, popHistory } = generatePriceHistory(
      card.name, 
      cardBasePrices.raw, 
      cardBasePrices.psa10
    );
    
    // Insert price history
    const priceHistoryData = history.map(point => ({
      set_id: card.setId,
      number: card.number,
      date: point.date,
      raw_usd: point.rawPrice,
      psa10_usd: point.psa10Price
    }));
    
    const { error: priceError } = await supabase
      .from('price_history')
      .upsert(priceHistoryData, { onConflict: 'set_id,number,date' });
    
    if (priceError) {
      console.error(`Error seeding price history for ${card.name}:`, priceError);
    }
    
    // Insert population history
    const popHistoryData = popHistory.map(point => ({
      set_id: card.setId,
      number: card.number,
      date: point.date,
      psa10: point.psa10,
      psa9: point.psa9,
      total: point.total
    }));
    
    const { error: popError } = await supabase
      .from('pop_history')
      .upsert(popHistoryData, { onConflict: 'set_id,number,date' });
    
    if (popError) {
      console.error(`Error seeding population history for ${card.name}:`, popError);
    }
    
    console.log(`✅ Seeded ${history.length} price points and ${popHistory.length} population points`);
  }
  
  console.log('🎉 History seeding completed!');
}

// Run if called directly
if (require.main === module) {
  seedHistoryData().catch(console.error);
}

export { seedHistoryData };
