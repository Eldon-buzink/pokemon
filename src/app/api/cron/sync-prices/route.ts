import { NextRequest, NextResponse } from 'next/server';
import { syncPricesForSet } from '@/server/priceSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('set');
    
    if (setId) {
      // Sync specific set
      console.log(`🎯 API: Starting price sync for set ${setId}`);
      const result = await syncPricesForSet(setId);
      return NextResponse.json({ 
        ok: true, 
        message: `Successfully synced ${result.priced} prices for set ${result.setId}`,
        result 
      });
    } else {
      // Default: sync Celebrations sets
      const targetSets = ['cel25', 'cel25c'];
      const results = [];
      
      for (const id of targetSets) {
        console.log(`🎯 API: Starting price sync for set ${id}`);
        const result = await syncPricesForSet(id);
        results.push(result);
      }
      
      const totalPriced = results.reduce((sum, r) => sum + r.priced, 0);
      return NextResponse.json({ 
        ok: true, 
        message: `Successfully synced ${totalPriced} total prices for ${targetSets.length} sets`,
        results 
      });
    }
  } catch (error) {
    console.error('❌ Price sync API error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Price sync failed'
      }, 
      { status: 500 }
    );
  }
}
