Medians & Outliers

For each (card, grade, day): median of prices; drop outliers outside Q1−1.5IQR & Q3+1.5IQR.

Require min sales: raw ≥ 5 over 5 days; graded ≥ 3.

5‑day deltas

Δ5d_raw   = (raw_median[t] - raw_median[t-5]) / raw_median[t-5]
Δ5d_psa10 = (psa10_median[t] - psa10_median[t-5]) / psa10_median[t-5]

Spread after fees (today)

spread = psa10_median[t] - (raw_median[t] + total_fees)

PSA10 probability trio

lifetime = PSA10_total / total_grades (from pop snapshot joined to card).

rolling  = ratio using last 90 days (diff pop snapshots).

adjusted = rolling * penalty(pop10_delta_30d) where penalty = 1 / (1 + k * pop_growth).

Ranking

score = 0.4*Δ5d_psa10 + 0.2*Δ5d_raw + 0.2*z(volume) - 0.2*z(pop10_delta_5d)
score += 0.2 * (spread_after_fees / psa10_median[t]) * psa10_prob_adj

Confidence

High: graded_n ≥ 8 in 5d AND IQR width/median ≤ 25%.

Speculative: graded_n ∈ [3,7].

Noisy: else.