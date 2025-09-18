import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const set = u.searchParams.get('set') || 'celebrations-classic-collection';
  const number = u.searchParams.get('number') || '2'; // Blastoise
  const base = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
  const key = process.env.PPT_API_KEY;

  if (!key) {
    return NextResponse.json({ 
      ok: false, 
      error: 'PPT_API_KEY not configured' 
    }, { status: 500 });
  }

  console.log(`🧪 Testing PPT API: ${base}/card?set=${set}&number=${number}`);

  try {
    const res = await fetch(`${base}/card?set=${encodeURIComponent(set)}&number=${encodeURIComponent(number)}`, {
      headers: { Authorization: `Bearer ${key}` }
    });
    
    const text = await res.text();
    
    return NextResponse.json({ 
      ok: res.ok, 
      status: res.status, 
      set, 
      number, 
      url: `${base}/card?set=${set}&number=${number}`,
      headers: Object.fromEntries(res.headers.entries()),
      preview: text.slice(0, 800),
      fullResponse: res.ok ? text : undefined
    });
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      set, 
      number 
    }, { status: 500 });
  }
}
