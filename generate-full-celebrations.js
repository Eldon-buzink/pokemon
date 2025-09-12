#!/usr/bin/env node

/**
 * Generate full Celebrations mock data with all ~118 cards
 */

const fs = require('fs');

console.log('🎉 Generating full Celebrations mock data...');
console.log('=' .repeat(50));

// Use the actual Celebrations cards from the API (only main set for now)
const celebrationsCards = [
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
];

function generateCardData(card, index) {
  // Create unique card ID by including set info
  const setId = card.rarity === 'Classic Collection' ? 'cel25c' : 'cel25'
  const cardId = `${setId}-${card.number}`;
  
  // Generate realistic pricing based on rarity and popularity
  let basePrice = 1;
  if (card.rarity === 'Classic Collection') {
    basePrice = 15 + Math.random() * 50; // $15-65
  } else if (card.rarity === 'Rare Ultra') {
    basePrice = 5 + Math.random() * 20; // $5-25
  } else if (card.rarity === 'Rare Holo') {
    basePrice = 2 + Math.random() * 15; // $2-17
  }
  
  // Special cases for popular cards
  if (card.name === 'Charizard' && card.number === '4') basePrice = 45.99;
  if (card.name === 'Charizard' && card.number === '26') basePrice = 89.99;
  if (card.name === 'Pikachu V-Union') basePrice = 8.99;
  if (card.name === 'Mew ex') basePrice = 12.99;
  
  const psa10Multiplier = card.rarity === 'Classic Collection' ? 8 + Math.random() * 12 : 5 + Math.random() * 8;
  const psa10Price = basePrice * psa10Multiplier;
  const spread = (psa10Price * 0.3) - basePrice;
  const profitMargin = spread / basePrice;
  
  // Generate realistic metrics
  const volatility = 0.1 + Math.random() * 0.3;
  const momentum = (Math.random() - 0.5) * 0.4;
  
  let confidence = 'Noisy';
  if (volatility < 0.2 && Math.random() > 0.5) confidence = 'High';
  else if (volatility < 0.4) confidence = 'Speculative';
  
  const volumeScore = Math.random();
  const rawDelta5d = momentum * 10 + (Math.random() - 0.5) * 5;
  const rawDelta30d = rawDelta5d * 2 + (Math.random() - 0.5) * 10;
  const rawDelta90d = rawDelta5d * 4 + (Math.random() - 0.5) * 20;
  
  const psa10Delta5d = rawDelta5d * 0.5;
  const psa10Delta30d = rawDelta30d * 0.5;
  const psa10Delta90d = rawDelta90d * 0.5;
  
  // Generate PSA population data
  const totalPop = Math.floor(Math.random() * 1000) + 100;
  const psa10Count = Math.floor(totalPop * Math.pow(0.7, 9));
  const psa9Count = Math.floor(totalPop * Math.pow(0.7, 8));
  
  // Generate grading recommendation
  let gradingRecommendation = 'Hold';
  if (profitMargin > 0.5 && psa10Count > 50) gradingRecommendation = 'Strong Buy';
  else if (profitMargin > 0.2 && psa10Count > 20) gradingRecommendation = 'Buy';
  else if (profitMargin < -0.2) gradingRecommendation = 'Avoid';
  
  // Generate badges
  const badges = [];
  if (profitMargin > 0.3) badges.push('HOT');
  if (psa10Count > 100) badges.push('GRADE_EV');
  if (rawDelta5d > 20) badges.push('MOMENTUM');
  
  // Generate sparkline data
  const sparklineData = generateSparklineData(basePrice, volatility, cardId);
  
  return {
    card_id: cardId,
    name: card.name,
    set_name: 'Celebrations',
    number: card.number,
    rarity: card.rarity,
    image_url_small: `https://images.pokemontcg.io/${setId}/${card.number}${card.rarity === 'Classic Collection' ? '_A' : ''}.png`,
    image_url_large: `https://images.pokemontcg.io/${setId}/${card.number}${card.rarity === 'Classic Collection' ? '_A' : ''}_hires.png`,
    raw_price: Math.round(basePrice * 100) / 100,
    psa10_price: Math.round(psa10Price * 100) / 100,
    spread_after_fees: Math.round(spread * 100) / 100,
    profit_loss: Math.round(spread * 100) / 100,
    confidence,
    volume_score: Math.round(volumeScore * 1000) / 1000,
    raw_delta_5d: Math.round(rawDelta5d * 100) / 100,
    raw_delta_30d: Math.round(rawDelta30d * 100) / 100,
    raw_delta_90d: Math.round(rawDelta90d * 100) / 100,
    psa10_delta_5d: Math.round(psa10Delta5d * 100) / 100,
    psa10_delta_30d: Math.round(psa10Delta30d * 100) / 100,
    psa10_delta_90d: Math.round(psa10Delta90d * 100) / 100,
    psa9_count: psa9Count,
    psa10_count: psa10Count,
    total_psa_count: totalPop,
    price_volatility: Math.round(volatility * 1000) / 1000,
    grading_recommendation: gradingRecommendation,
    psa10_probability: Math.round((psa10Count / totalPop) * 1000) / 1000,
    ev_grade: Math.round(basePrice * 0.3 * 100) / 100,
    upside_potential: Math.round(profitMargin * 1000) / 1000,
    badges,
    headline_momentum: Math.round(rawDelta5d * 100) / 100,
    sparkline_data: sparklineData,
  };
}

function generateSparklineData(basePrice, volatility, cardId) {
  const data = [];
  const fixedDate = new Date('2024-01-01T00:00:00Z');
  
  const cardIdHash = cardId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const trendOffset = (cardIdHash % 100) / 100 * Math.PI * 2;
  const volatilityMultiplier = 0.5 + (cardIdHash % 50) / 50 * 1.5;
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(fixedDate.getTime() - i * 24 * 60 * 60 * 1000);
    const trend = Math.sin((30 - i) * Math.PI / 30 + trendOffset) * 0.15;
    const noise = (Math.random() - 0.5) * volatility * volatilityMultiplier;
    const price = basePrice * (1 + trend + noise);
    
    data.push({
      date: date.toISOString().split('T')[0],
      price: Math.max(Math.round(price * 100) / 100, basePrice * 0.1)
    });
  }
  
  return data;
}

try {
  const mockData = {
    cards: celebrationsCards.map((card, index) => generateCardData(card, index))
  };

  // Save to file
  fs.writeFileSync('celebrations-mock-data.json', JSON.stringify(mockData, null, 2));
  
  console.log(`✅ Generated mock data for ${mockData.cards.length} Celebrations cards!`);
  console.log('📁 Saved to: celebrations-mock-data.json');
  console.log('\nSample cards:');
  mockData.cards.slice(0, 5).forEach(card => {
    console.log(`- ${card.name} (${card.number}): $${card.raw_price} → PSA 10: $${card.psa10_price}`);
  });
  
} catch (error) {
  console.error('\n❌ Mock data generation failed:', error.message);
  process.exit(1);
}
