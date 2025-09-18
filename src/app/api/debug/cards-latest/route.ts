import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const set = url.searchParams.get('set') || 'cel25c';
  
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  try {
    const { data, error } = await db
      .from('v_cards_latest')
      .select('*')
      .eq('set_id', set)
      .order('number', { ascending: true })
      .limit(5);
    
    return NextResponse.json({ 
      set, 
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, 
      error, 
      data,
      count: data?.length || 0,
      sampleCard: data?.[0] || null
    });
  } catch (err) {
    return NextResponse.json({
      set,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      error: err instanceof Error ? err.message : 'Unknown error',
      data: null
    });
  }
}
