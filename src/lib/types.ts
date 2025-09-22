export type CardId = { setId: string; number: string };

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
