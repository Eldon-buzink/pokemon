/**
 * Data Normalizer - Applies Celebrations Rules to Any Set
 * Converts raw vendor payloads into our standardized schema
 */

import { ZCard, ZSet, CardNormalized, SetNormalized } from "./schema";

type RawSources = {
  meta?: any;
  images?: { 
    tcgplayer?: any; 
    cardmarket?: any; 
    pokecollector?: any;
    pokemontcg?: any;
  };
  prices?: { 
    ppt?: any;
    tcgplayer?: any;
  };
  pops?: { 
    psa?: any;
  };
};

export function normalizeSet(raw: RawSources, cfg: { id: string; name: string; lang: "EN"|"JP"; }): SetNormalized {
  const set: SetNormalized = {
    id: cfg.id,
    name: cfg.name,
    lang: cfg.lang,
    releaseDate: raw.meta?.releaseDate ?? raw.meta?.release_date ?? undefined,
  };
  
  return ZSet.parse(set);
}

export function normalizeCard(raw: RawSources & { card: any }, setId: string): CardNormalized {
  const c = raw.card;
  
  // Apply Celebrations image fallback logic
  const image = 
    raw.images?.pokemontcg?.small ??           // Pokemon TCG API (preferred)
    raw.images?.tcgplayer?.image ??            // TCGPlayer
    raw.images?.cardmarket?.image ??           // Cardmarket
    raw.images?.pokecollector?.image ??        // Pokemon Collector
    c.images?.small ??                         // Direct from card data
    c.image_url_small ??                       // Legacy field
    undefined;

  // Apply Celebrations pricing fallback logic
  const rawUsd = 
    raw.prices?.ppt?.rawUsd ??                 // PPT API (preferred)
    raw.prices?.tcgplayer?.normal?.market ??   // TCGPlayer normal
    raw.prices?.tcgplayer?.holofoil?.market ?? // TCGPlayer holofoil
    (c.tcgplayer_prices?.normal?.market ? c.tcgplayer_prices.normal.market : null) ??
    (c.tcgplayer_prices?.holofoil?.market ? c.tcgplayer_prices.holofoil.market : null) ??
    null;

  const psa10Usd = 
    raw.prices?.ppt?.psa10Usd ??               // PPT API (preferred)
    (rawUsd ? rawUsd * 4.5 : null) ??         // Fallback estimate
    null;

  const card: CardNormalized = {
    setId,
    number: String(c.number ?? c.card_number ?? ''),
    name: c.name ?? c.card_name ?? "",
    rarity: c.rarity ?? undefined,
    artist: c.artist ?? undefined,
    imageUrl: image,
    links: {
      tcgplayer: c.tcgplayerUrl ?? c.tcgplayer_url ?? undefined,
      cardmarket: c.cardmarketUrl ?? c.cardmarket_url ?? undefined,
      psaPop: c.psaPopUrl ?? c.psa_pop_url ?? undefined,
    },
    marketNow: {
      rawUsd: rawUsd,
      psa10Usd: psa10Usd,
      lastUpdated: raw.prices?.ppt?.lastUpdated ?? new Date().toISOString(),
    }
  };

  return ZCard.parse(card);
}

// Helper to extract PPT pricing data
export function extractPPTPricing(pptData: any): { rawUsd: number | null; psa10Usd: number | null } {
  const rawCents = pptData?.raw?.price_cents ?? pptData?.rawPrice ?? pptData?.raw_cents;
  const psa10Cents = pptData?.psa10?.price_cents ?? pptData?.psa10Price ?? pptData?.psa10_cents;
  
  return {
    rawUsd: rawCents ? rawCents / 100 : null,
    psa10Usd: psa10Cents ? psa10Cents / 100 : null
  };
}

// Helper to extract Pokemon TCG API image data
export function extractPokemonTCGImages(cardData: any): { small?: string; large?: string } {
  return {
    small: cardData?.images?.small,
    large: cardData?.images?.large
  };
}
