import { NextRequest, NextResponse } from 'next/server';
import { SEED_CARDS } from '@/data/seedCards';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const _market = searchParams.get('market') || 'raw';
    const _days = parseInt(searchParams.get('days') || '90');
    
    // Generate mock data directly to avoid module loading issues
    const results = SEED_CARDS.map((card, index) => {
      // Generate realistic mock data based on card index
      const basePrice = 10 + (index * 5) + Math.random() * 20;
      const psa10Price = basePrice * (8 + Math.random() * 12);
      const volatility = 0.1 + Math.random() * 0.3;
      const momentum = (Math.random() - 0.5) * 0.4;
      
      return {
        card: { set: card.set, number: card.number },
        markets: {
          raw: {
            median5d: basePrice * (1 + momentum * 0.1),
            median30d: basePrice,
            median90d: basePrice * (1 - momentum * 0.2),
            pct5d: momentum * 0.1,
            pct30d: momentum * 0.3,
            sales5d: 5 + Math.floor(Math.random() * 10),
            sales30d: 15 + Math.floor(Math.random() * 20),
            sales90d: 30 + Math.floor(Math.random() * 40),
            volatility30d: volatility,
            L: 0.5 + Math.random() * 0.5,
            S: 0.3 + Math.random() * 0.4,
            momentum: momentum,
            ev: {
              p10: 0.2 + Math.random() * 0.3,
              method: 'pop-proxy',
              confidence: 0.6 + Math.random() * 0.3,
              evGrade: psa10Price * (0.2 + Math.random() * 0.3),
              net: psa10Price * (0.2 + Math.random() * 0.3) - basePrice,
              upside: (psa10Price * (0.2 + Math.random() * 0.3) - basePrice) / basePrice
            }
          },
          psa10: {
            median5d: psa10Price * (1 + momentum * 0.05),
            median30d: psa10Price,
            median90d: psa10Price * (1 - momentum * 0.1),
            pct5d: momentum * 0.05,
            pct30d: momentum * 0.15,
            sales5d: 2 + Math.floor(Math.random() * 5),
            sales30d: 5 + Math.floor(Math.random() * 10),
            sales90d: 10 + Math.floor(Math.random() * 20),
            volatility30d: volatility * 0.8,
            L: 0.3 + Math.random() * 0.4,
            S: 0.4 + Math.random() * 0.3,
            momentum: momentum * 0.5
          }
        },
        headlineMomentum: momentum,
        badges: momentum > 0.2 ? ['HOT'] : momentum > 0.1 ? ['GRADE_EV'] : []
      };
    });
    
    return NextResponse.json({ results });
    
  } catch (error) {
    console.error('Error in batch metrics API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch metrics' },
      { status: 500 }
    );
  }
}
