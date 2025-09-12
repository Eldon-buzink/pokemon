import { createClient } from '@supabase/supabase-js';

test('celebrations completeness + pricing', async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  const { data: cards } = await supabase.from('cards').select('id').eq('set_id','swsh35');
  expect((cards||[]).length).toBeGreaterThanOrEqual(50);
  const { data: prices } = await supabase.from('prices').select('id').in('card_id', (cards||[]).map(c=>c.id));
  expect((prices||[]).length).toBeGreaterThanOrEqual(40); // at least most cards have some price
});
