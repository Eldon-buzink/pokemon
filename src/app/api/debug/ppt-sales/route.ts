import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const set = u.searchParams.get('set') || 'celebrations-classic-collection';
  const number = u.searchParams.get('number') || '2';
  
  const BASE = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
  const KEY = process.env.PPT_API_KEY;
  const H = KEY ? { Authorization: `Bearer ${KEY}` } : {};

  const tries = [
    `/sales?set=${encodeURIComponent(set)}&number=${encodeURIComponent(number)}`,
    `/card/sales?set=${encodeURIComponent(set)}&number=${encodeURIComponent(number)}`,
    `/cards?set=${encodeURIComponent(set)}&number=${encodeURIComponent(number)}&includeEbay=true`
  ];

  const results = [];
  for (const path of tries) {
    try {
      const r = await fetch(`${BASE}${path}`, { headers: H });
      const payload = r.ok ? await r.json().catch(()=>null) : null;
      results.push({
        path,
        status: r.status,
        ok: r.ok,
        payload: payload ? Object.keys(payload) : null,
        sample: payload
      });
    } catch (err) {
      results.push({
        path,
        error: String(err)
      });
    }
  }

  return NextResponse.json({ 
    set, 
    number, 
    key: KEY ? 'present' : 'missing',
    results 
  });
}
