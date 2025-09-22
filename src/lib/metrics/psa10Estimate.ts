export function estimatePSA10FromRaw(rawCents?:number|null){
  if (!rawCents) return null;
  // Updated based on PriceCharting analysis:
  // Charizard #4: $394.21 PSA10 / $114.33 Raw = 3.45x
  // Most modern cards: 3.5-5.5x range
  // Use 4.5x as realistic midpoint
  const multiplier = 4.5;
  const est = Math.round(rawCents * multiplier);
  
  // Sanity bounds: 2.5x - 8x (more realistic range)
  const min = Math.round(rawCents * 2.5);
  const max = Math.round(rawCents * 8.0);
  
  return Math.min(Math.max(est, min), max);
}
