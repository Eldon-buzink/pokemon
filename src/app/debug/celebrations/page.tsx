import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  const { data: cards } = await supabase.from('cards').select('id,number,name').eq('set_id','swsh35').order('number::int');
  const rows: any[] = [];
  for (const c of cards || []) {
    const { data: prices } = await supabase.from('prices').select('*').eq('card_id', c.id);
    const tcg = prices?.find(p=>p.source==='tcgplayer');
    const pc  = prices?.find(p=>p.source==='pricecharting');
    rows.push({ ...c, tcg: tcg?.raw_cents, pc: pc?.raw_cents });
  }
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Celebrations sanity</h1>
      <table className="w-full text-sm">
        <thead><tr><th>#</th><th>Name</th><th>TCGplayer</th><th>PriceCharting</th></tr></thead>
        <tbody>
        {rows.map(r=>{
          const diff = r.tcg && r.pc ? Math.abs(r.tcg-r.pc) / Math.max(r.tcg,r.pc) : 0;
          const warn = diff>0.4 ? 'bg-red-100' : '';
          return <tr key={r.id} className={warn}><td>{r.number}</td><td>{r.name}</td><td>{r.tcg?('$'+(r.tcg/100).toFixed(2)):'-'}</td><td>{r.pc?('$'+(r.pc/100).toFixed(2)):'-'}</td></tr>;
        })}
        </tbody>
      </table>
    </div>
  );
}
