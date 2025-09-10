Goals: clean, data‑forward, fast to scan; looks great with card images; works well on mobile and desktop.

Layout

Grid: content max‑width 1200px. Two‑pane on desktop: left filters (sticky at top: 12px), right results. Single column on mobile.

Density: compact tables (text-sm) with 12–14px row padding; cards use rounded-2xl and subtle shadow.

Spacing scale: 4/8/12/16/24. Avoid arbitrary values.

Typography

Headings: text-2xl/xl bold, tight tracking.

Body: text-sm for tables; text-base for detail pages.

Monospace: small numerals (tabular-nums) for price columns to align digits.

Color & theming

Neutral base (gray-50..900). Accent for positives/negatives only.

Delta colors: green for ↑, red for ↓; never convey meaning by color alone—pair with icons or labels.

Support light mode first; dark mode later.

Components

Table row (movers): 56px image • Name (bold) • Set & # (muted) • Δ5d PSA10 • Δ5d Raw • Spread after fees • Confidence badge.

Badges: rounded‑2xl; High (solid green), Speculative (amber), Noisy (neutral). Include accessible labels.

Filters: sticky column with Selects (Set, Rarity), Range (Min sales), Toggles (Grade, Currency), and a Reset button.

Buttons/inputs: large interactive targets (min 40px hit area).

Images

Use next/image with sizes attr. Small thumb 64×64; detail image max 420px wide.

Blur placeholder from dominant color; fallback to /placeholder-card.svg.

Cache & serve from Supabase Storage CDN.

Charts (Recharts)

One metric per chart. 7/30/90 day toggle.

Axis labels: compact currency (e.g., $1.2k). Tooltip shows exact date + median + n.

No grid clutter; thin axis lines; focus on trend.

States

Loading: skeleton rows (image + three text bars).

Empty: friendly message + tip (“Try lowering min sales to ≥3”).

Error: inline alert with retry.

Responsiveness

At <640px: stack filters above table, hide low‑signal columns (e.g., volume) behind a “More” disclosure.

Use react-virtual for long lists to keep 60fps scroll.

Accessibility

Keyboard navigable rows; aria-sort on column headers; focus rings visible.

Text alternatives for images (card name + set + number).

Color contrast ≥ 4.5:1 for all text.

Copy & tone

Short, helpful labels: “Δ5d PSA10”, “Spread after fees”, “Confidence”.

Avoid hype; add small helper tooltips on hover/press.
