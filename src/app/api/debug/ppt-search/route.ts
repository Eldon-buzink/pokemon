import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const query = u.searchParams.get('q') || 'Blastoise #2';
  
  const BASE = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
  const KEY = process.env.PPT_API_KEY;
  const H = KEY ? { Authorization: `Bearer ${KEY}` } : {};

  const tries = [
    `/cards?search=${encodeURIComponent(query)}&includeEbay=true`,
    `/sales/search?query=${encodeURIComponent(query)}`,
    `/search?query=${encodeURIComponent(query)}`
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
        hasData: payload?.data?.length > 0,
        sample: payload?.data?.[0] || payload
      });
    } catch (err) {
      results.push({
        path,
        error: String(err)
      });
    }
  }

  return NextResponse.json({ 
    query, 
    key: KEY ? 'present' : 'missing',
    results 
  });
}
