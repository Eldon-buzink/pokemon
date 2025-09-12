export type SourceName = 'tcgplayer' | 'cardmarket' | 'ppt';
export interface CardKey {
  setId: string;    // canonical set id, e.g., 'swsh35'
  number: string;   // e.g., '2', '114'
  name?: string;
}
export interface MarketPrice {
  source: SourceName;
  ts: string;            // ISO
  currency: 'USD'|'EUR';
  rawCents?: number;
  psa10Cents?: number;
  lowCents?: number;
  highCents?: number;
  notes?: string;
}
