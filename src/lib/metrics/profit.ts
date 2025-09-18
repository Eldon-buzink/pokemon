// src/lib/metrics/profit.ts

/**
 * Calculate profit/loss from grading and selling a card
 * @param rawCents - Raw card price in cents
 * @param psa10Cents - PSA 10 graded card price in cents
 * @returns Profit in cents after all fees, or null if insufficient data
 */
export function profitUSD(rawCents?: number | null, psa10Cents?: number | null): number | null {
  if (!rawCents || !psa10Cents || rawCents <= 0 || psa10Cents <= 0) {
    return null;
  }
  
  // Costs
  const gradingFee = 1500; // $15 PSA bulk service fee
  const sellingFeePct = 0.13; // 13% selling fees (eBay + PayPal)
  
  // Total cost = raw card price + grading fee
  const totalCost = rawCents + gradingFee;
  
  // Net proceeds after selling fees
  const netProceeds = psa10Cents * (1 - sellingFeePct);
  
  // Profit = net proceeds - total cost
  return netProceeds - totalCost;
}

/**
 * Calculate profit margin as a percentage
 * @param rawCents - Raw card price in cents
 * @param psa10Cents - PSA 10 graded card price in cents
 * @returns Profit margin percentage, or null if insufficient data
 */
export function profitMargin(rawCents?: number | null, psa10Cents?: number | null): number | null {
  const profit = profitUSD(rawCents, psa10Cents);
  if (profit === null || !rawCents) return null;
  
  const gradingFee = 1500;
  const totalCost = rawCents + gradingFee;
  
  return (profit / totalCost) * 100;
}
