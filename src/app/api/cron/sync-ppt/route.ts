import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPptPrice } from '@/lib/sources/ppt';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const setId = searchParams.get('set') || 'cel25';
    
    console.log(`🎯 PPT API: Starting PPT-only price sync for set ${setId}`);
    
    const { data: cards, error } = await db
      .from('cards')
      .select('card_id,set_id,number,name')
      .eq('set_id', setId);
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!cards?.length) {
      return NextResponse.json({ 
        ok: false, 
        message: `No cards found for set ${setId}`,
        wrote: 0 
      });
    }
    
    console.log(`📊 Found ${cards.length} cards to sync PPT prices for`);
    let wrote = 0;
    
    for (const c of cards) {
      try {
        const ppt = await getPptPrice({ 
          setId: c.set_id, 
          number: c.number, 
          name: c.name 
        });
        
        if (ppt) {
          const { error: upsertError } = await db.from('prices').upsert({
            card_id: c.card_id, 
            source: 'ppt',
            raw_cents: ppt.rawCents ?? null, 
            psa10_cents: ppt.psa10Cents ?? null,
            currency: ppt.currency, 
            ts: ppt.ts, 
            notes: ppt.notes
          });
          
          if (!upsertError) {
            wrote++;
            console.log(`✅ PPT: ${c.name} (#${c.number}) - Raw: ${ppt.rawCents ? '$' + (ppt.rawCents/100).toFixed(2) : 'N/A'}, PSA10: ${ppt.psa10Cents ? '$' + (ppt.psa10Cents/100).toFixed(2) : 'N/A'}`);
          } else {
            console.error(`❌ PPT upsert error for ${c.name}:`, upsertError.message);
          }
        } else {
          console.log(`⚠️ PPT: No price data found for ${c.name} (#${c.number})`);
        }
      } catch (cardError) {
        console.error(`❌ PPT fetch error for ${c.name}:`, cardError);
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 150));
    }
    
    console.log(`✅ PPT sync complete: ${wrote} prices written for ${cards.length} cards`);
    
    return NextResponse.json({ 
      ok: true, 
      set: setId, 
      wrote,
      total: cards.length,
      message: `Successfully synced ${wrote} PPT prices for set ${setId}`
    });
    
  } catch (error) {
    console.error('❌ PPT sync API error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'PPT price sync failed'
      }, 
      { status: 500 }
    );
  }
}
