import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  const { data: cards } = await supabase.from('cards').select('id,number,name').eq('set_id','swsh35').order('number::int');
  const rows: any[] = [];
  for (const c of cards || []) {
    const { data: prices } = await supabase.from('prices').select('*').eq('card_id', c.id);
    const tcg = prices?.find(p=>p.source==='tcgplayer');
    const cm  = prices?.find(p=>p.source==='cardmarket');
    const ppt = prices?.find(p=>p.source==='ppt');
    rows.push({ ...c, tcg: tcg?.raw_cents, cm: cm?.raw_cents, ppt: ppt?.raw_cents, pptPsa10: ppt?.psa10_cents });
  }
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Celebrations sanity</h1>
      <table className="w-full text-sm">
        <thead><tr><th>#</th><th>Name</th><th>TCGplayer (USD)</th><th>Cardmarket (EUR)</th><th>PPT Raw</th><th>PPT PSA10</th></tr></thead>
        <tbody>
        {rows.map(r=>{
          return <tr key={r.id}>
            <td>{r.number}</td>
            <td>{r.name}</td>
            <td>{r.tcg?('$'+(r.tcg/100).toFixed(2)):'-'}</td>
            <td>{r.cm?('€'+(r.cm/100).toFixed(2)):'-'}</td>
            <td>{r.ppt?('$'+(r.ppt/100).toFixed(2)):'-'}</td>
            <td>{r.pptPsa10?('$'+(r.pptPsa10/100).toFixed(2)):'-'}</td>
          </tr>;
        })}
        </tbody>
      </table>
    </div>
  );
}
