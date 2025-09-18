import { NextResponse } from 'next/server';
import { syncCatalogAll } from '@/server/catalogSync';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const count = await syncCatalogAll();
    return NextResponse.json({ 
      ok: true, 
      setsUpdated: count,
      message: `Successfully synced ${count} sets`
    });
  } catch (error) {
    console.error('❌ Catalog sync error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Catalog sync failed'
      }, 
      { status: 500 }
    );
  }
}
