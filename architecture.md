Stack: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Recharts. Supabase (Postgres + Cron + RLS off initially).

Data flow:

Ingest (server actions/cron): pull PPT → staging_* tables.

Normalize into canonical cards, raw_prices, graded_sales, psa_pop.

Compute daily aggregates & 5‑day deltas into facts_daily + facts_5d.

Serve via typed server queries; cache with SWR/React Query.

Key modules:

/lib/sources/ppt.ts – PPT client.

/lib/compute/aggregates.ts – medians, IQR, winsorization.

/lib/compute/score.ts – ranking & confidence.

/app/(ui)/movers – leaderboard page.

/app/card/[id] – detail page.

/lib/fees/model.ts – param table for fees & turnaround.