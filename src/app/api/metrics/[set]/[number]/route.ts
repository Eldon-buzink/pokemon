import { NextRequest, NextResponse } from 'next/server';
import { getSeries } from '@/lib/sales'
import { HybridSalesProvider } from '@/lib/sales-providers/ppt-provider';
import { computeBasicStats } from '@/lib/metrics';
import { estimateGemRate } from '@/lib/gemRate';
import { daysSinceRelease } from '@/lib/releaseDates';

// In-memory cache for 15 minutes
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ set: string; number: string }> }
) {
  try {
    const { set, number } = await params;
    const { searchParams } = new URL(request.url);
    
    const market = (searchParams.get('market') as 'raw' | 'psa9' | 'psa10') || 'raw';
    const days = parseInt(searchParams.get('days') || '90');
    const force = searchParams.get('force') === '1';
    
    // Create cache key
    const cacheKey = `${set}-${number}-${market}-${days}`;
    
    // Check cache unless force refresh
    if (!force && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        return NextResponse.json(cached.data);
      }
    }
    
    // Create card key
    const cardKey = { set, number, name: `${set} ${number}` };
    
    // Use hybrid provider (real data + mock fallback)
    const provider = new HybridSalesProvider();
    
    // Fetch data for all markets
    const [rawSeries, psa9Series, psa10Series] = await Promise.all([
      getSeries(provider, cardKey, 'raw', days),
      getSeries(provider, cardKey, 'psa9', days),
      getSeries(provider, cardKey, 'psa10', days),
    ]);
    
    // Compute basic stats for each market
    const rawStats = computeBasicStats(rawSeries);
    const psa9Stats = computeBasicStats(psa9Series);
    const psa10Stats = computeBasicStats(psa10Series);
    
    // Calculate age in days
    const ageDays = daysSinceRelease(set);
    
    // Estimate PSA 10 probability for raw market
    const gemRate = estimateGemRate({
      set,
      number,
      ageDays,
    });
    
    // Calculate EV and upside for raw market
    let evData = undefined;
    if (psa10Stats.median30d > 0 && psa9Stats.median30d > 0) {
      const evGrade = gemRate.p10 * psa10Stats.median30d + 
                     (1 - gemRate.p10) * psa9Stats.median30d * 0.9;
      
      const gradeCostAllIn = 18.99; // PSA grading cost
      const netEv = evGrade - rawStats.median30d - gradeCostAllIn;
      const upsidePct = netEv / rawStats.median30d;
      
      evData = {
        p10: gemRate.p10,
        method: gemRate.method,
        confidence: gemRate.confidence,
        evGrade,
        net: netEv,
        upside: upsidePct,
      };
    }
    
    // Calculate headline momentum (highest among all markets)
    const momentums = [rawStats.momentum, psa9Stats.momentum, psa10Stats.momentum];
    const headlineMomentum = Math.max(...momentums);
    
    // Generate badges
    const badges: string[] = [];
    
    // HOT badge
    if (rawStats.pct5d > 0.1 && rawStats.sales5d >= 5) {
      badges.push('HOT');
    }
    
    // GRADE EV badge
    if (evData && evData.upside > 0.5 && evData.confidence >= 0.4) {
      badges.push('GRADE_EV');
    }
    
    // EARLY badge
    if (ageDays < 120 || psa10Stats.sales90d === 0) {
      badges.push('EARLY');
    }
    
    // Build response
    const response = {
      card: { set, number },
      markets: {
        raw: rawStats.sales30d > 0 ? { ...rawStats, ev: evData } : undefined,
        psa9: psa9Stats.sales30d > 0 ? psa9Stats : undefined,
        psa10: psa10Stats.sales30d > 0 ? psa10Stats : undefined,
      },
      headlineMomentum,
      badges,
    };
    
    // Cache the result
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in metrics API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
