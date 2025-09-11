import { NextRequest, NextResponse } from 'next/server';
import { SEED_CARDS } from '@/data/seedCards';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') || 'raw';
    const days = parseInt(searchParams.get('days') || '90');
    
    // For now, return the seed cards with mock data
    // In a real implementation, this would call the single metrics API for each card
    const results = await Promise.all(
      SEED_CARDS.map(async (card) => {
        try {
          const response = await fetch(
            `${request.nextUrl.origin}/api/metrics/${encodeURIComponent(card.set)}/${encodeURIComponent(card.number)}?market=${market}&days=${days}`
          );
          
          if (!response.ok) {
            throw new Error(`Failed to fetch metrics for ${card.set} ${card.number}`);
          }
          
          return await response.json();
        } catch (error) {
          console.error(`Error fetching metrics for ${card.set} ${card.number}:`, error);
          return {
            card: { set: card.set, number: card.number },
            markets: {},
            headlineMomentum: 0,
            badges: [],
            error: 'Failed to fetch data',
          };
        }
      })
    );
    
    return NextResponse.json({ results });
    
  } catch (error) {
    console.error('Error in batch metrics API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch metrics' },
      { status: 500 }
    );
  }
}
