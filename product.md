1) Problem

Identify Pokémon cards (raw & graded) that actually increased in the past 5 days, with enough volume & cleanliness to be actionable for grading flips.

2) Audience & Jobs-to-be-Done

Collector‑flippers (you): Find short‑term movers, estimate PSA10 chance, decide to buy raw/grade/sell.

EU buyers: Prefer EUR, Cardmarket context, FX toggle.

3) Scope (V1)

Leaderboard of 5‑day movers: raw, PSA9, PSA10.

Per‑card detail: 7/30/90‑day trend, pop trend, spread after fees, confidence bucket, “Grade now?” verdict.

Data sources (hybrid): PokemonPriceTracker API (PPT) + PSA pop; optional GemRate later.

4) Non‑Goals (V1)

No full arbitrage across every marketplace.

No live sniping/watch bots.

No advanced image condition scoring (future).

5) Success Metrics

Time to signal: < 3s p95 page load.

Data freshness: ≤ 24h snapshots.

Precision: ≥ 80% of “High confidence” picks hold price within ±10% next 14 days.

You can buy/grade 3 profitable cards/month from tool picks.

6) Risks & Mitigations

Low sample spikes → min‑sales filter + IQR outlier guard.

Pop pressure → pop delta penalties.

API changes → adapter pattern for sources; nightly health checks.

7) V1 Feature Checklist

Filters: set, rarity, min sales, min price, grade, currency.

Badges: High / Speculative / Noisy based on volume & IQR.

Fee model (PSA tiers + shipping + marketplace fees).

Transparent “PSA10 chance” trio: lifetime, rolling, adjusted.