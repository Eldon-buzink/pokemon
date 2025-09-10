Common issues

Empty movers: check cron ran & PPT key; ensure backfill of ≥6 days.

Wild deltas: insufficient min‑sales or outlier filter off.

Pop not updating: missed snapshot; ensure daily psa_pop upsert.

Observability

Structured logs: source, card_id, day, counts, medians, IQR.

Health route /api/health: last snapshot timestamps per table.

Admin page: latest 50 ingest errors with retry.

Rate limits

Batch by set; exponential backoff; persist cursors.