import { NextResponse } from 'next/server';
import { syncPricesForSet } from '@/src/server/priceSync';
export const runtime = 'nodejs';
export async function GET() {
  const targetSets = ['swsh35']; // add more set ids later
  const results = [];
  for (const id of targetSets) results.push(await syncPricesForSet(id));
  return NextResponse.json({ ok:true, results });
}
