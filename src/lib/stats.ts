// Statistical helpers for price analysis
export function median(nums: number[]): number | null {
  const arr = nums.filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return null;
  const m = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
}

export function withinDays(iso: string, days: number) {
  const t = new Date(iso).getTime();
  return t >= Date.now() - days * 24 * 3600 * 1000;
}

export function aggregateWindow(prices: number[], daysCounted: number) {
  return { median: median(prices), count: prices.length, windowDays: daysCounted };
}
