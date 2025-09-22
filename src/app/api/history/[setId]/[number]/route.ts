import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { PriceHistory, PopHistory } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string; number: string }> }
) {
  try {
    const { setId, number } = await params;
    const supabase = getServerSupabase();
    
    // Calculate date range (last 180 days)
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 180);
    
    // Fetch price history
    const { data: priceData, error: priceError } = await supabase
      .from('price_history')
      .select('date, raw_usd, psa10_usd')
      .eq('set_id', setId)
      .eq('number', number)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });
    
    if (priceError) {
      console.error('Error fetching price history:', priceError);
    }
    
    // Fetch population history
    const { data: popData, error: popError } = await supabase
      .from('pop_history')
      .select('date, psa10, psa9, psa8, total')
      .eq('set_id', setId)
      .eq('number', number)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });
    
    if (popError) {
      console.error('Error fetching population history:', popError);
    }
    
    // Fetch peers from the same set (for set-ratio estimation)
    const { data: peersData, error: peersError } = await supabase
      .from('price_history')
      .select('set_id, number, raw_usd, psa10_usd, date')
      .eq('set_id', setId)
      .not('number', 'eq', number)
      .not('raw_usd', 'is', null)
      .not('psa10_usd', 'is', null)
      .gt('raw_usd', 0)
      .gt('psa10_usd', 0)
      .order('date', { ascending: false })
      .limit(30);
    
    if (peersError) {
      console.error('Error fetching peers data:', peersError);
    }
    
    // Transform price history data
    const history: PriceHistory = (priceData || []).map(row => ({
      date: row.date,
      rawUsd: row.raw_usd,
      psa10Usd: row.psa10_usd
    }));
    
    // Transform population history data
    const popHistory: PopHistory = (popData || []).map(row => ({
      date: row.date,
      psa10: row.psa10 || 0,
      psa9: row.psa9 || 0,
      total: row.total || 0
    }));
    
    // If no data available, generate some mock data for demonstration
    if (history.length === 0) {
      const mockHistory: PriceHistory = [];
      const mockPopHistory: PopHistory = [];
      
      // Generate 30 days of mock data
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Mock price data with some variation
        const baseRaw = 25 + Math.sin(i * 0.1) * 5;
        const basePsa10 = baseRaw * (4 + Math.sin(i * 0.15) * 1);
        
        mockHistory.push({
          date: dateStr,
          rawUsd: Math.round(baseRaw * 100) / 100,
          psa10Usd: Math.round(basePsa10 * 100) / 100
        });
        
        // Mock population data
        const basePop = 1000 + i * 10;
        mockPopHistory.push({
          date: dateStr,
          psa10: Math.floor(basePop * 0.15),
          psa9: Math.floor(basePop * 0.25),
          total: basePop
        });
      }
      
      return NextResponse.json({
        history: mockHistory,
        popHistory: mockPopHistory,
        peers: []
      });
    }
    
    // Transform peers data (get latest price for each card)
    const peersMap = new Map<string, { raw: number; psa10: number }>();
    (peersData || []).forEach(row => {
      const key = `${row.set_id}-${row.number}`;
      if (!peersMap.has(key) && row.raw_usd && row.psa10_usd) {
        peersMap.set(key, {
          raw: row.raw_usd,
          psa10: row.psa10_usd
        });
      }
    });
    
    const peers = Array.from(peersMap.values());
    
    return NextResponse.json({
      history,
      popHistory,
      peers
    });
    
  } catch (error) {
    console.error('Error in history API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch history data',
        history: [],
        popHistory: [],
        peers: []
      },
      { status: 500 }
    );
  }
}
