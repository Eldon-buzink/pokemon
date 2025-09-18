export const EURUSD = Number(process.env.MANUAL_EURUSD || '1.08'); // override in env if you want

export function usdToEurCents(usdCents?: number | null): number | null {
  if (!usdCents) return null;
  return Math.round((usdCents / 100) / EURUSD * 100);
}

export function eurToUsdCents(eurCents?: number | null): number | null {
  if (!eurCents) return null;
  return Math.round((eurCents / 100) * EURUSD * 100);
}

export function formatCurrency(cents: number | null, currency: 'USD' | 'EUR'): string {
  if (!cents) return '—';
  const value = cents / 100;
  const symbol = currency === 'USD' ? '$' : '€';
  return `${symbol}${value.toFixed(2)}`;
}

export function formatCurrencyWithEstimate(
  cents: number | null, 
  currency: 'USD' | 'EUR', 
  isEstimated: boolean = false
): string {
  if (!cents) return '—';
  const formatted = formatCurrency(cents, currency);
  return isEstimated ? `${formatted} (est)` : formatted;
}
