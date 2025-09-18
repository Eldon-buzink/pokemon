import { NextRequest, NextResponse } from 'next/server';

const BASE = process.env.POKEMONTCG_API_BASE || 'https://api.pokemontcg.io/v2';
const H = process.env.POKEMONTCG_API_KEY ? { 'X-Api-Key': process.env.POKEMONTCG_API_KEY! } : {};

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const id = u.searchParams.get('id'); // e.g., cel25c-2
  
  if (!id) {
    return NextResponse.json({ 
      ok: false, 
      error: 'pass ?id= parameter (e.g., ?id=cel25c-2)' 
    });
  }
  
  try {
    console.log(`🔍 PTCG Debug: Fetching card ${id}`);
    const r = await fetch(`${BASE}/cards/${encodeURIComponent(id)}`, { headers: H });
    
    if (r.ok) {
      const data = await r.json();
      console.log(`✅ PTCG Debug: Success for ${id}`);
      return NextResponse.json({ 
        ok: true, 
        id, 
        data,
        tcgplayer: data?.data?.tcgplayer,
        cardmarket: data?.data?.cardmarket,
        images: data?.data?.images
      });
    } else {
      const errorText = await r.text();
      console.log(`❌ PTCG Debug: Failed for ${id} - ${r.status}`);
      return NextResponse.json({ 
        ok: false, 
        id,
        status: r.status, 
        statusText: r.statusText,
        error: errorText 
      });
    }
  } catch (error) {
    console.error(`💥 PTCG Debug: Exception for ${id}:`, error);
    return NextResponse.json({ 
      ok: false, 
      id,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
