import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const set = u.searchParams.get('set') || 'cel25c';
  const number = u.searchParams.get('number') || '2';
  
  const base = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
  const key = process.env.PPT_API_KEY;
  
  if (!key) {
    return NextResponse.json({ 
      ok: false, 
      error: 'PPT_API_KEY not configured' 
    });
  }
  
  try {
    console.log(`🔍 PPT Debug: Fetching set=${set}, number=${number}`);
    const res = await fetch(`${base}/card?set=${encodeURIComponent(set)}&number=${encodeURIComponent(number)}`, {
      headers: { Authorization: `Bearer ${key}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ PPT Debug: Success for ${set}#${number}`);
      return NextResponse.json({ 
        ok: true, 
        set, 
        number, 
        data,
        raw: data?.raw || data?.prices?.raw,
        psa10: data?.psa10 || data?.prices?.psa10
      });
    } else {
      const errorText = await res.text();
      console.log(`❌ PPT Debug: Failed for ${set}#${number} - ${res.status}`);
      return NextResponse.json({ 
        ok: false, 
        set,
        number,
        status: res.status, 
        statusText: res.statusText,
        error: errorText 
      });
    }
  } catch (error) {
    console.error(`💥 PPT Debug: Exception for ${set}#${number}:`, error);
    return NextResponse.json({ 
      ok: false, 
      set,
      number,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
