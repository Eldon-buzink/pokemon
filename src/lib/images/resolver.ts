import { SetAdapter, RawCard } from '../types';

export const ALLOWLIST_HOSTS = [
  'images.pokemontcg.io',
  'product-images.tcgplayer.com',
  'static.cardmarket.com'
];

export interface ImageResult {
  url: string;
  source: string;
}

export function resolveCardImage({ 
  setId, 
  number, 
  variant, 
  candidates 
}: { 
  setId: string; 
  number: string; 
  variant?: string; 
  candidates: RawCard;
}): ImageResult | null {
  // Try adapter overrides first
  const adapter = getAdapterForSet(setId);
  if (adapter?.imagesOverrides?.[number]) {
    const override = adapter.imagesOverrides[number];
    const variantKey = variant || 'base';
    const overrideUrl = override[variantKey] || override.small || override.large;
    
    if (overrideUrl && isValidUrl(overrideUrl)) {
      return { url: normalizeUrl(overrideUrl), source: 'adapter.override' };
    }
  }
  
  // Try PokemonTCG API images
  if (candidates.images?.small) {
    const url = normalizeUrl(candidates.images.small);
    if (isValidUrl(url)) {
      return { url, source: 'pokemontcg.small' };
    }
  }
  
  if (candidates.images?.large) {
    const url = normalizeUrl(candidates.images.large);
    if (isValidUrl(url)) {
      return { url, source: 'pokemontcg.large' };
    }
  }
  
  // Try direct imageUrl
  if (candidates.imageUrl) {
    const url = normalizeUrl(candidates.imageUrl);
    if (isValidUrl(url)) {
      return { url, source: 'direct.imageUrl' };
    }
  }
  
  // Try TCGPlayer imageUrl
  if (candidates.tcgplayerUrl) {
    const url = normalizeUrl(candidates.tcgplayerUrl);
    if (isValidUrl(url)) {
      return { url, source: 'tcgplayer.imageUrl' };
    }
  }
  
  return null;
}

export function pickBestResolution(candidates: string[]): string | null {
  if (candidates.length === 0) return null;
  
  // Prefer larger images based on common patterns
  const sorted = candidates
    .map(url => ({ url, score: scoreImageUrl(url) }))
    .sort((a, b) => b.score - a.score);
  
  return sorted[0]?.url || null;
}

function scoreImageUrl(url: string): number {
  let score = 0;
  
  // Prefer HTTPS
  if (url.startsWith('https://')) score += 10;
  
  // Prefer larger images based on filename patterns
  if (url.includes('_hires') || url.includes('_large')) score += 5;
  if (url.includes('_small') || url.includes('_thumb')) score += 1;
  
  // Prefer certain hosts
  if (url.includes('images.pokemontcg.io')) score += 3;
  if (url.includes('product-images.tcgplayer.com')) score += 2;
  
  return score;
}

export function buildCardId(setId: string, number: string, variant?: string): string {
  const variantSuffix = variant ? `-${variant}` : '-base';
  return `${setId}-${number}${variantSuffix}`;
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove query parameters
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

export function isAllowlistedHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWLIST_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

// Helper to get adapter (this would be imported from your adapters registry)
function getAdapterForSet(setId: string): SetAdapter | null {
  // This would use your adapter registry
  // For now, return null to avoid circular imports
  return null;
}
