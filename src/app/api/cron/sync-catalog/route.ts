import { NextResponse } from 'next/server';
import { syncCatalogAll } from '@/src/server/catalogSync';
export const runtime = 'nodejs';
export async function GET() {
  const count = await syncCatalogAll();
  return NextResponse.json({ ok:true, setsUpdated: count });
}
