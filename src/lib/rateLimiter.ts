// Global rate limiter for eBay API calls
import Bottleneck from "bottleneck";

// Tweak safely: 60 req / 5 min ≈ 1 per 5s (very conservative)
export const ebayLimiter = new Bottleneck({
  minTime: 1300,          // ≥1.3s between requests
  reservoir: 240,         // max calls per run window (adjust via --budget)
  reservoirRefreshInterval: 60 * 60 * 1000, // reset each hour
  reservoirRefreshAmount: 240,
});

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export const jitter = (base: number, spread = 0.4) =>
  base + Math.floor(Math.random() * base * spread);
