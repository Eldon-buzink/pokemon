#!/usr/bin/env node

/**
 * Generate realistic Celebrations mock data with all 50 cards and proper pricing
 */

const fs = require('fs');

console.log('🎉 Generating realistic Celebrations mock data...');
console.log('=' .repeat(50));

// All 50 Celebrations cards (25 main + 25 classic collection)
const celebrationsCards = [
  // Main Celebrations set (cel25) - 25 cards
  { name: 'Ho-Oh', number: '1', rarity: 'Rare' },
  { name: 'Reshiram', number: '2', rarity: 'Rare' },
  { name: 'Kyogre', number: '3', rarity: 'Rare' },
  { name: 'Palkia', number: '4', rarity: 'Rare' },
  { name: 'Pikachu', number: '5', rarity: 'Rare Holo' },
  { name: 'Flying Pikachu V', number: '6', rarity: 'Rare Holo V' },
  { name: 'Flying Pikachu VMAX', number: '7', rarity: 'Rare Holo VMAX' },
  { name: 'Surfing Pikachu V', number: '8', rarity: 'Rare Holo V' },
  { name: 'Surfing Pikachu VMAX', number: '9', rarity: 'Rare Holo VMAX' },
  { name: 'Zekrom', number: '10', rarity: 'Rare' },
  { name: 'Mew', number: '11', rarity: 'Rare Holo' },
  { name: 'Xerneas', number: '12', rarity: 'Rare' },
  { name: 'Cosmog', number: '13', rarity: 'Rare' },
  { name: 'Cosmoem', number: '14', rarity: 'Rare' },
  { name: 'Lunala', number: '15', rarity: 'Rare Holo' },
  { name: 'Zacian V', number: '16', rarity: 'Rare Holo V' },
  { name: 'Groudon', number: '17', rarity: 'Rare' },
  { name: 'Zamazenta V', number: '18', rarity: 'Rare Holo V' },
  { name: 'Yveltal', number: '19', rarity: 'Rare' },
  { name: 'Dialga', number: '20', rarity: 'Rare' },
  { name: 'Solgaleo', number: '21', rarity: 'Rare Holo' },
  { name: 'Lugia', number: '22', rarity: 'Rare' },
  { name: 'Professor\'s Research (Professor Oak)', number: '23', rarity: 'Rare Holo' },
  { name: 'Professor\'s Research (Professor Oak)', number: '24', rarity: 'Rare Ultra' },
  { name: 'Mew', number: '25', rarity: 'Rare Holo' },
  
  // Classic Collection (cel25c) - 25 cards
  { name: 'Venusaur', number: '1', rarity: 'Classic Collection' },
  { name: 'Blastoise', number: '2', rarity: 'Classic Collection' },
  { name: 'Charizard', number: '3', rarity: 'Classic Collection' },
  { name: 'Mewtwo', number: '4', rarity: 'Classic Collection' },
  { name: 'Mew', number: '5', rarity: 'Classic Collection' },
  { name: 'Lugia', number: '6', rarity: 'Classic Collection' },
  { name: 'Ho-Oh', number: '7', rarity: 'Classic Collection' },
  { name: 'Rayquaza', number: '8', rarity: 'Classic Collection' },
  { name: 'Garchomp', number: '9', rarity: 'Classic Collection' },
  { name: 'Gardevoir', number: '10', rarity: 'Classic Collection' },
  { name: 'Zacian', number: '11', rarity: 'Classic Collection' },
  { name: 'Zamazenta', number: '12', rarity: 'Classic Collection' },
  { name: 'Professor\'s Research', number: '13', rarity: 'Classic Collection' },
  { name: 'Team Rocket\'s Handiwork', number: '14', rarity: 'Classic Collection' },
  { name: 'Here Comes Team Rocket!', number: '15', rarity: 'Classic Collection' },
  { name: 'Rocket\'s Admin.', number: '16', rarity: 'Classic Collection' },
  { name: 'The Rocket\'s Trap', number: '17', rarity: 'Classic Collection' },
  { name: 'Darkness Energy', number: '18', rarity: 'Classic Collection' },
  { name: 'Metal Energy', number: '19', rarity: 'Classic Collection' },
  { name: 'Fighting Energy', number: '20', rarity: 'Classic Collection' },
  { name: 'Water Energy', number: '21', rarity: 'Classic Collection' },
  { name: 'Fire Energy', number: '22', rarity: 'Classic Collection' },
  { name: 'Grass Energy', number: '23', rarity: 'Classic Collection' },
  { name: 'Lightning Energy', number: '24', rarity: 'Classic Collection' },
  { name: 'Psychic Energy', number: '25', rarity: 'Classic Collection' }
];

function generateCardData(card, index) {
  // Create unique card ID by including set info
  const setId = card.rarity === 'Classic Collection' ? 'cel25c' : 'cel25';
  const cardId = `${setId}-${card.number}`;
  
  // Generate realistic pricing based on rarity and popularity
  let basePrice = 1;
  let psa10Multiplier = 3;
  
  if (card.rarity === 'Classic Collection') {
    // Classic Collection cards are more valuable
    basePrice = 15 + Math.random() * 85; // $15-100
    psa10Multiplier = 8 + Math.random() * 12; // 8-20x multiplier
  } else if (card.rarity === 'Rare Ultra') {
    basePrice = 8 + Math.random() * 25; // $8-33
    psa10Multiplier = 6 + Math.random() * 8; // 6-14x multiplier
  } else if (card.rarity === 'Rare Holo VMAX') {
    basePrice = 5 + Math.random() * 20; // $5-25
    psa10Multiplier = 5 + Math.random() * 8; // 5-13x multiplier
  } else if (card.rarity === 'Rare Holo V') {
    basePrice = 3 + Math.random() * 15; // $3-18
    psa10Multiplier = 4 + Math.random() * 8; // 4-12x multiplier
  } else if (card.rarity === 'Rare Holo') {
    basePrice = 2 + Math.random() * 12; // $2-14
    psa10Multiplier = 4 + Math.random() * 6; // 4-10x multiplier
  } else if (card.rarity === 'Rare') {
    basePrice = 1 + Math.random() * 8; // $1-9
    psa10Multiplier = 3 + Math.random() * 5; // 3-8x multiplier
  }
  
  // Special cases for popular cards (realistic Celebrations prices)
  if (card.name === 'Charizard' && card.rarity === 'Classic Collection') {
    basePrice = 45.99;
    psa10Multiplier = 15;
  }
  if (card.name === 'Mew' && card.rarity === 'Classic Collection') {
    basePrice = 25.99;
    psa10Multiplier = 12;
  }
  if (card.name === 'Pikachu' && card.rarity === 'Rare Holo') {
    basePrice = 8.99;
    psa10Multiplier = 8;
  }
  if (card.name === 'Flying Pikachu VMAX') {
    basePrice = 12.99;
    psa10Multiplier = 10;
  }
  
  const psa10Price = basePrice * psa10Multiplier;
  const gradingFee = 25; // PSA grading fee
  const spread = (psa10Price * 0.7) - basePrice - gradingFee; // 70% of PSA 10 price minus raw cost and fees
  const profitMargin = spread / basePrice;
  
  // Generate realistic metrics
  const volatility = 0.15 + Math.random() * 0.25; // 15-40% volatility
  const momentum = (Math.random() - 0.5) * 0.3; // -15% to +15% momentum
  
  let confidence = 'Noisy';
  if (volatility < 0.2 && Math.random() > 0.6) confidence = 'High';
  else if (volatility < 0.35) confidence = 'Speculative';
  
  const volumeScore = Math.random();
  const rawDelta5d = momentum * 100 + (Math.random() - 0.5) * 20; // -35% to +35%
  const rawDelta30d = rawDelta5d * 1.5 + (Math.random() - 0.5) * 30; // -60% to +60%
  const rawDelta90d = rawDelta5d * 2.5 + (Math.random() - 0.5) * 50; // -100% to +100%
  
  const psa10Delta5d = rawDelta5d * 0.6;
  const psa10Delta30d = rawDelta30d * 0.6;
  const psa10Delta90d = rawDelta90d * 0.6;
  
  // Generate PSA population data (more realistic)
  const totalPop = Math.floor(Math.random() * 2000) + 200; // 200-2200 total
  const psa10Count = Math.floor(totalPop * (0.05 + Math.random() * 0.15)); // 5-20% PSA 10 rate
  const psa9Count = Math.floor(totalPop * (0.15 + Math.random() * 0.25)); // 15-40% PSA 9 rate
  
  // Calculate realistic PSA 10 probability
  const psa10Probability = psa10Count / totalPop;
  
  // Generate grading recommendation
  let gradingRecommendation = 'Hold';
  if (profitMargin > 0.8 && psa10Probability > 0.1) gradingRecommendation = 'Strong Buy';
  else if (profitMargin > 0.3 && psa10Probability > 0.05) gradingRecommendation = 'Buy';
  else if (profitMargin < -0.3) gradingRecommendation = 'Avoid';
  
  // Generate badges
  const badges = [];
  if (profitMargin > 0.5) badges.push('HOT');
  if (psa10Probability > 0.15) badges.push('GRADE_EV');
  if (rawDelta5d > 15) badges.push('MOMENTUM');
  if (card.rarity === 'Classic Collection') badges.push('VINTAGE');
  
  // Generate sparkline data (30 days)
  const sparklineData = [];
  const baseSparklinePrice = basePrice;
  let currentPrice = baseSparklinePrice;
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Add some realistic price movement
    const dailyChange = (Math.random() - 0.5) * 0.1; // ±5% daily change
    currentPrice = currentPrice * (1 + dailyChange);
    
    sparklineData.push({
      date: date.toISOString().split('T')[0],
      price: Math.max(0.1, currentPrice) // Ensure price doesn't go negative
    });
  }
  
  // Ensure sparkline trend matches delta
  const firstPrice = sparklineData[0].price;
  const lastPrice = sparklineData[sparklineData.length - 1].price;
  const actualDelta = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  // Adjust sparkline to match the 5d delta
  if (Math.abs(actualDelta - rawDelta5d) > 5) {
    const adjustment = (rawDelta5d / 100) * firstPrice;
    sparklineData[sparklineData.length - 1].price = firstPrice + adjustment;
  }
  
  return {
    card_id: cardId,
    name: card.name,
    set_name: card.rarity === 'Classic Collection' ? 'Celebrations Classic Collection' : 'Celebrations',
    number: card.number,
    rarity: card.rarity,
    image_url_small: `https://images.pokemontcg.io/${setId}/${card.number}${card.rarity === 'Classic Collection' ? '_A' : ''}.png`,
    image_url_large: `https://images.pokemontcg.io/${setId}/${card.number}${card.rarity === 'Classic Collection' ? '_A' : ''}_hires.png`,
    raw_price: Math.round(basePrice * 100) / 100,
    psa10_price: Math.round(psa10Price * 100) / 100,
    spread_after_fees: Math.round(spread * 100) / 100,
    profit_loss: Math.round(spread * 100) / 100,
    confidence: confidence,
    volume_score: Math.round(volumeScore * 1000) / 1000,
    raw_delta_5d: Math.round(rawDelta5d * 10) / 10,
    raw_delta_30d: Math.round(rawDelta30d * 10) / 10,
    raw_delta_90d: Math.round(rawDelta90d * 10) / 10,
    psa10_delta_5d: Math.round(psa10Delta5d * 10) / 10,
    psa10_delta_30d: Math.round(psa10Delta30d * 10) / 10,
    psa10_delta_90d: Math.round(psa10Delta90d * 10) / 10,
    psa9_count: psa9Count,
    psa10_count: psa10Count,
    total_psa_count: totalPop,
    price_volatility: Math.round(volatility * 1000) / 1000,
    grading_recommendation: gradingRecommendation,
    psa10_probability: Math.round(psa10Probability * 1000) / 1000,
    ev_grade: Math.round(profitMargin * 100) / 100,
    upside_potential: Math.round((psa10Price / basePrice) * 100) / 100,
    badges: badges,
    headline_momentum: Math.round(rawDelta5d * 10) / 10,
    sparkline_data: sparklineData
  };
}

// Generate all card data
const allCards = celebrationsCards.map((card, index) => generateCardData(card, index));

// Create the final data structure
const mockData = {
  cards: allCards
};

// Write to file
fs.writeFileSync('celebrations-mock-data.json', JSON.stringify(mockData, null, 2));

console.log(`✅ Generated ${allCards.length} Celebrations cards`);
console.log(`📊 Price range: $${Math.min(...allCards.map(c => c.raw_price)).toFixed(2)} - $${Math.max(...allCards.map(c => c.raw_price)).toFixed(2)}`);
console.log(`📊 PSA 10% range: ${Math.min(...allCards.map(c => c.psa10_probability * 100)).toFixed(1)}% - ${Math.max(...allCards.map(c => c.psa10_probability * 100)).toFixed(1)}%`);
console.log(`📊 Profit range: $${Math.min(...allCards.map(c => c.profit_loss)).toFixed(2)} - $${Math.max(...allCards.map(c => c.profit_loss)).toFixed(2)}`);
console.log('🎉 Mock data generation complete!');
