// Core types
export type MoneyCents = number;
export type SetId = string;
export type CardId = { setId: string; number: string };

// Set adapter contract
export type SetAdapter = {
  id: string;
  name: string;
  lang: 'EN' | 'JP';
  sources: {
    meta: string[];
    images: string[];
    prices: string[];
    pops: string[];
  };
  imagesOverrides?: Record<string, Record<string, string>>;
};

// Raw card from source APIs
export type RawCard = {
  id?: string;
  number: string;
  name: string;
  rarity?: string;
  variant?: string;
  images?: {
    small?: string;
    large?: string;
  };
  imageUrl?: string;
  tcgplayerUrl?: string;
  cardmarketUrl?: string;
  psaPopUrl?: string;
  marketPrice?: number;
  psa10Price?: number;
  [key: string]: any; // Allow additional fields from different sources
};

// Canonical card record (our single source of truth)
export type CardRecord = {
  id: string;             // setId-number-rarity-variant
  setId: string;
  setName: string;
  lang: 'EN' | 'JP';
  number: string;
  name: string;
  rarity?: string;
  variant?: string;       // holo, full-art, alt-art, etc.
  imageSmall?: string;
  imageLarge?: string;
  marketCents?: MoneyCents;        // TCG/CM aggregated
  pptRawCents?: MoneyCents;        // PPT current / raw
  pptPsa10Cents?: MoneyCents;      // PPT PSA10
  psaPop10?: number | null;        // cached PSA pop
  releaseDate?: string;            // from set meta
  lastUpdatedUtc: string;          // when we computed this
  sourceFlags: string[];           // e.g. ['ppt.latest','pokemontcg.api']
};

// Legacy types for backward compatibility
export type PricePoint = { 
  date: string; 
  rawUsd?: number | null; 
  psa10Usd?: number | null; 
};

export type PriceHistory = PricePoint[];

export type PopulationSnapshot = { 
  date: string; 
  psa10: number; 
  psa9: number; 
  total: number; 
};

export type PopHistory = PopulationSnapshot[];

export type CardMeta = { 
  id: CardId; 
  name: string; 
  rarity?: string; 
  releaseDate?: string; 
  artist?: string; 
  setName: string; 
  imageUrl?: string; 
};

export type MarketNow = { 
  rawUsd?: number | null; 
  psa10Usd?: number | null; 
  lastUpdated?: string; 
};

export type Estimation = { 
  value: number | null; 
  method: "observed" | "set-ratio" | "global-ratio" | "manual" | "unknown"; 
  confidence: "high" | "medium" | "low" | "none"; 
  sample?: number;
  windowDays?: number;
  ratioUsed?: number | null;
  lastObservedAt?: string | null;
};

export type GemRate = { 
  value: number | null; 
  basis: "9v10" | "8v9v10" | "unknown"; 
  confidence: "high" | "medium" | "low" | "none"; 
};

export type RoiEstimate = {
  gross: number | null;
  net: number | null;
  roiPct: number | null;
};

// Runtime validation
export function assertCard(record: any): asserts record is CardRecord {
  if (!record || typeof record !== 'object') {
    throw new Error('CardRecord must be an object');
  }
  
  const required = ['id', 'setId', 'setName', 'lang', 'number', 'name', 'lastUpdatedUtc', 'sourceFlags'];
  for (const field of required) {
    if (!(field in record)) {
      throw new Error(`CardRecord missing required field: ${field}`);
    }
  }
  
  if (!['EN', 'JP'].includes(record.lang)) {
    throw new Error(`CardRecord.lang must be 'EN' or 'JP', got: ${record.lang}`);
  }
  
  if (!Array.isArray(record.sourceFlags)) {
    throw new Error('CardRecord.sourceFlags must be an array');
  }
  
  if (record.marketCents !== undefined && (typeof record.marketCents !== 'number' || record.marketCents < 0)) {
    throw new Error('CardRecord.marketCents must be a non-negative number or undefined');
  }
  
  if (record.pptRawCents !== undefined && (typeof record.pptRawCents !== 'number' || record.pptRawCents < 0)) {
    throw new Error('CardRecord.pptRawCents must be a non-negative number or undefined');
  }
  
  if (record.pptPsa10Cents !== undefined && (typeof record.pptPsa10Cents !== 'number' || record.pptPsa10Cents < 0)) {
    throw new Error('CardRecord.pptPsa10Cents must be a non-negative number or undefined');
  }
}

// Helper functions
export function buildCardId(setId: string, number: string, variant?: string): string {
  const variantSuffix = variant ? `-${variant}` : '-base';
  return `${setId}-${number}${variantSuffix}`;
}

export function parseCardId(cardId: string): { setId: string; number: string; variant?: string } {
  const parts = cardId.split('-');
  if (parts.length < 2) {
    throw new Error(`Invalid cardId format: ${cardId}`);
  }
  
  const setId = parts[0];
  const lastPart = parts[parts.length - 1];
  const variant = lastPart !== 'base' ? lastPart : undefined;
  const number = variant ? parts.slice(1, -1).join('-') : parts.slice(1).join('-');
  
  return { setId, number, variant };
}