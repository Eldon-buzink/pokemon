#!/usr/bin/env node

/**
 * Generate mock Celebrations data and save to JSON file
 * This works without database connection
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎉 Generating mock Celebrations data...');
console.log('=' .repeat(50));

try {
  // Run the mock data generation script
  console.log('📦 Running mock data generation...');
  const result = execSync('npx tsx src/scripts/ingest-celebrations-mock.ts', {
    encoding: 'utf8',
    cwd: process.cwd()
  });

  console.log(result);

  // For now, let's create a simple mock data file
  console.log('💾 Creating mock data file...');
  
  const mockData = {
    cards: [
      {
        card_id: 'Celebrations-4',
        name: 'Charizard',
        set_name: 'Celebrations',
        number: '4',
        rarity: 'Rare Holo',
        image_url_small: 'https://images.pokemontcg.io/v2/celebrations/4.png',
        image_url_large: 'https://images.pokemontcg.io/v2/celebrations/4_hires.png',
        raw_price: 45.99,
        psa10_price: 299.99,
        spread_after_fees: 44.01,
        profit_loss: 44.01,
        confidence: 'High',
        volume_score: 0.85,
        raw_delta_5d: 12.5,
        raw_delta_30d: 28.3,
        raw_delta_90d: 45.2,
        psa10_delta_5d: 8.2,
        psa10_delta_30d: 18.7,
        psa10_delta_90d: 32.1,
        psa9_count: 1250,
        psa10_count: 89,
        total_psa_count: 2500,
        price_volatility: 0.15,
        grading_recommendation: 'Strong Buy',
        psa10_probability: 0.036,
        ev_grade: 13.8,
        upside_potential: 0.96,
        badges: ['HOT', 'GRADE_EV'],
        headline_momentum: 12.5,
        sparkline_data: generateSparklineData(45.99, 0.15, 'Celebrations-4')
      },
      {
        card_id: 'Celebrations-29',
        name: 'Pikachu V-Union',
        set_name: 'Celebrations',
        number: '29',
        rarity: 'Rare Ultra',
        image_url_small: 'https://images.pokemontcg.io/v2/celebrations/29.png',
        image_url_large: 'https://images.pokemontcg.io/v2/celebrations/29_hires.png',
        raw_price: 8.99,
        psa10_price: 45.99,
        spread_after_fees: 4.81,
        profit_loss: 4.81,
        confidence: 'Speculative',
        volume_score: 0.65,
        raw_delta_5d: 5.2,
        raw_delta_30d: 12.8,
        raw_delta_90d: 22.1,
        psa10_delta_5d: 3.1,
        psa10_delta_30d: 8.4,
        psa10_delta_90d: 15.2,
        psa9_count: 890,
        psa10_count: 45,
        total_psa_count: 1800,
        price_volatility: 0.22,
        grading_recommendation: 'Buy',
        psa10_probability: 0.025,
        ev_grade: 2.7,
        upside_potential: 0.54,
        badges: ['GRADE_EV'],
        headline_momentum: 5.2,
        sparkline_data: generateSparklineData(8.99, 0.22, 'Celebrations-29')
      },
      {
        card_id: 'Celebrations-25',
        name: 'Mew ex',
        set_name: 'Celebrations',
        number: '25',
        rarity: 'Rare Ultra',
        image_url_small: 'https://images.pokemontcg.io/v2/celebrations/25.png',
        image_url_large: 'https://images.pokemontcg.io/v2/celebrations/25_hires.png',
        raw_price: 12.99,
        psa10_price: 89.99,
        spread_after_fees: 14.01,
        profit_loss: 14.01,
        confidence: 'High',
        volume_score: 0.78,
        raw_delta_5d: 8.7,
        raw_delta_30d: 19.2,
        raw_delta_90d: 31.5,
        psa10_delta_5d: 5.4,
        psa10_delta_30d: 12.8,
        psa10_delta_90d: 22.1,
        psa9_count: 1100,
        psa10_count: 67,
        total_psa_count: 2200,
        price_volatility: 0.18,
        grading_recommendation: 'Strong Buy',
        psa10_probability: 0.030,
        ev_grade: 3.9,
        upside_potential: 1.08,
        badges: ['HOT', 'GRADE_EV'],
        headline_momentum: 8.7,
        sparkline_data: generateSparklineData(12.99, 0.18, 'Celebrations-25')
      },
      {
        card_id: 'Celebrations-2',
        name: 'Venusaur',
        set_name: 'Celebrations',
        number: '2',
        rarity: 'Rare Holo',
        image_url_small: 'https://images.pokemontcg.io/v2/celebrations/2.png',
        image_url_large: 'https://images.pokemontcg.io/v2/celebrations/2_hires.png',
        raw_price: 15.99,
        psa10_price: 79.99,
        spread_after_fees: 8.01,
        profit_loss: 8.01,
        confidence: 'Speculative',
        volume_score: 0.72,
        raw_delta_5d: 3.2,
        raw_delta_30d: 8.9,
        raw_delta_90d: 16.4,
        psa10_delta_5d: 2.1,
        psa10_delta_30d: 6.2,
        psa10_delta_90d: 11.5,
        psa9_count: 950,
        psa10_count: 52,
        total_psa_count: 1900,
        price_volatility: 0.25,
        grading_recommendation: 'Buy',
        psa10_probability: 0.027,
        ev_grade: 4.8,
        upside_potential: 0.50,
        badges: ['GRADE_EV'],
        headline_momentum: 3.2,
        sparkline_data: generateSparklineData(15.99, 0.25, 'Celebrations-2')
      },
      {
        card_id: 'Celebrations-3',
        name: 'Blastoise',
        set_name: 'Celebrations',
        number: '3',
        rarity: 'Rare Holo',
        image_url_small: 'https://images.pokemontcg.io/v2/celebrations/3.png',
        image_url_large: 'https://images.pokemontcg.io/v2/celebrations/3_hires.png',
        raw_price: 18.99,
        psa10_price: 99.99,
        spread_after_fees: 12.01,
        profit_loss: 12.01,
        confidence: 'High',
        volume_score: 0.81,
        raw_delta_5d: 6.8,
        raw_delta_30d: 15.2,
        raw_delta_90d: 24.7,
        psa10_delta_5d: 4.1,
        psa10_delta_30d: 10.6,
        psa10_delta_90d: 17.3,
        psa9_count: 1200,
        psa10_count: 73,
        total_psa_count: 2400,
        price_volatility: 0.19,
        grading_recommendation: 'Strong Buy',
        psa10_probability: 0.030,
        ev_grade: 5.7,
        upside_potential: 0.63,
        badges: ['HOT', 'GRADE_EV'],
        headline_momentum: 6.8,
        sparkline_data: generateSparklineData(18.99, 0.19, 'Celebrations-3')
      }
    ]
  };

  // Save to file
  fs.writeFileSync('celebrations-mock-data.json', JSON.stringify(mockData, null, 2));
  
  console.log(`\n✅ Generated mock data for ${mockData.cards.length} Celebrations cards!`);
  console.log('📁 Saved to: celebrations-mock-data.json');
  console.log('\nSample cards:');
  mockData.cards.forEach(card => {
    console.log(`- ${card.name} (${card.number}): $${card.raw_price} → PSA 10: $${card.psa10_price}`);
  });
  
} catch (error) {
  console.error('\n❌ Mock data generation failed:', error.message);
  process.exit(1);
}

function generateSparklineData(basePrice, volatility, cardId) {
  const data = [];
  const fixedDate = new Date('2024-01-01T00:00:00Z');
  
  // Use cardId for deterministic but unique data
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
