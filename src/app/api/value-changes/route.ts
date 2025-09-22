import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d
  const type = searchParams.get('type') || 'gainers'; // gainers, losers
  const limit = parseInt(searchParams.get('limit') || '20');
  const setId = searchParams.get('set');

  try {
    // Calculate the date range
    const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const endDate = new Date();
    const endDateStr = endDate.toISOString().split('T')[0];

    // Query to get price changes over the period
    let query = `
      WITH price_changes AS (
        SELECT 
          ph1.set_id,
          ph1.number,
          ph1.raw_usd as current_price,
          ph2.raw_usd as previous_price,
          CASE 
            WHEN ph2.raw_usd > 0 THEN 
              ((ph1.raw_usd - ph2.raw_usd) / ph2.raw_usd) * 100
            ELSE NULL
          END as price_change_pct,
          (ph1.raw_usd - ph2.raw_usd) as price_change_abs
        FROM 
          (SELECT DISTINCT ON (set_id, number) set_id, number, raw_usd, date
           FROM price_history 
           WHERE date >= '${endDateStr}'
           ORDER BY set_id, number, date DESC) ph1
        INNER JOIN 
          (SELECT DISTINCT ON (set_id, number) set_id, number, raw_usd, date
           FROM price_history 
           WHERE date <= '${startDateStr}'
           ORDER BY set_id, number, date DESC) ph2
        ON ph1.set_id = ph2.set_id AND ph1.number = ph2.number
        WHERE ph1.raw_usd IS NOT NULL AND ph2.raw_usd IS NOT NULL
          AND ph2.raw_usd > 0
          ${setId ? `AND ph1.set_id = '${setId}'` : ''}
      )
      SELECT 
        pc.*,
        COALESCE(cl.name, 'Unknown Card') as card_name,
        COALESCE(cl.image_url_small, '') as image_url,
        COALESCE(cl.rarity, '') as rarity
      FROM price_changes pc
      LEFT JOIN v_cards_latest cl ON pc.set_id = cl.set_id AND pc.number = cl.number
      WHERE pc.price_change_pct IS NOT NULL
      ORDER BY pc.price_change_${type === 'gainers' ? 'pct DESC' : 'pct ASC'}
      LIMIT ${limit}
    `;

    const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
      sql_query: query 
    });

    if (error) {
      console.error('Error fetching value changes:', error);
      // Fallback to mock data if database query fails
      return NextResponse.json({
        data: generateMockValueChanges(type, period, limit),
        period,
        type,
        generated: true
      });
    }

    return NextResponse.json({
      data: data || [],
      period,
      type,
      generated: false
    });

  } catch (error) {
    console.error('Database query error:', error);
    
    // Return mock data as fallback
    return NextResponse.json({
      data: generateMockValueChanges(type, period, limit),
      period,
      type,
      generated: true
    });
  }
}

// Generate mock data when database is not available
function generateMockValueChanges(type: string, period: string, limit: number) {
  const mockCards = [
    { name: 'Charizard ex', setId: 'sv01', number: '1', rarity: 'Double Rare' },
    { name: 'Pikachu VMAX', setId: 'sv35', number: '25', rarity: 'VMAX' },
    { name: 'Mewtwo ex', setId: 'sv02', number: '150', rarity: 'Double Rare' },
    { name: 'Rayquaza VMAX', setId: 'sv03', number: '384', rarity: 'VMAX' },
    { name: 'Lugia V', setId: 'sv04', number: '249', rarity: 'V' },
    { name: 'Umbreon VMAX', setId: 'sv05', number: '197', rarity: 'VMAX' },
    { name: 'Espeon V', setId: 'sv06', number: '196', rarity: 'V' },
    { name: 'Garchomp ex', setId: 'sv07', number: '445', rarity: 'Double Rare' },
    { name: 'Dragonite V', setId: 'sv08', number: '149', rarity: 'V' },
    { name: 'Alakazam ex', setId: 'sv09', number: '65', rarity: 'Double Rare' }
  ];

  const baseMultiplier = period === '7d' ? 0.5 : period === '30d' ? 1.0 : 1.5;
  
  return mockCards.slice(0, limit).map((card, index) => {
    const isGainer = type === 'gainers';
    const changeBase = isGainer ? 15 + Math.random() * 50 : -(10 + Math.random() * 40);
    const priceChangePct = changeBase * baseMultiplier * (1 - index * 0.1);
    
    const currentPrice = 25 + Math.random() * 100;
    const previousPrice = currentPrice / (1 + priceChangePct / 100);
    const priceChangeAbs = currentPrice - previousPrice;
    
    return {
      set_id: card.setId,
      number: card.number,
      card_name: card.name,
      rarity: card.rarity,
      current_price: Math.round(currentPrice * 100) / 100,
      previous_price: Math.round(previousPrice * 100) / 100,
      price_change_pct: Math.round(priceChangePct * 100) / 100,
      price_change_abs: Math.round(priceChangeAbs * 100) / 100,
      image_url: ''
    };
  });
}
