export function estimatePSA10FromRaw(rawCents?:number|null){
  if (!rawCents) return null;
  // Modern reprints (like Celebrations Classic) often trade ~6–12x raw in PSA10.
  // Use a conservative 8x midpoint, clamp for sanity.
  const est = Math.round(Math.min(Math.max(rawCents * 8, rawCents * 3), rawCents * 20));
  return est;
}
