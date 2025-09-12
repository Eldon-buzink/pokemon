export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: { number: string }}) {
  const base = process.env.PPT_BASE_URL || 'https://www.pokemonpricetracker.com/api/v2';
  const key  = process.env.PPT_API_KEY!;
  const url = `${base}/card?set=swsh35&number=${encodeURIComponent(params.number)}`;
  const res = await fetch(url, { headers: { Authorization:`Bearer ${key}` }});
  const data = res.ok ? await res.json() : { error: res.status };
  return <pre className="p-4 text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
}
