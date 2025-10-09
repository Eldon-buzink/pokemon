import { createClient } from '@supabase/supabase-js';
import { SetAdapter, CardRecord, RawCard, buildCardId, assertCard } from '../types';
import { getSet } from '../adapters';
import { pptFetchSummary } from '../sources/ppt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Ensure PPT API key is available
if (!process.env.PPT_API_KEY) {
  console.warn('⚠️ PPT_API_KEY not found in environment variables');
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('PPT')));
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting configuration
const PPT_RATE_LIMIT = parseInt(process.env.REQUESTS_PER_MINUTE_PPT || '40');
const TCG_RATE_LIMIT = parseInt(process.env.REQUESTS_PER_MINUTE_TCG || '60');

// Cache configuration
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

interface IngestOptions {
  dryRun?: boolean;
  skipCache?: boolean;
  batchSize?: number;
  maxRetries?: number;
}

interface IngestResult {
  setId: string;
  success: boolean;
  cardsProcessed: number;
  cardsAdded: number;
  cardsUpdated: number;
  errors: string[];
  duration: number;
}

// Simple rate limiter
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // Add 100ms buffer
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForSlot();
    }
    
    this.requests.push(now);
  }
}

const pptLimiter = new RateLimiter(PPT_RATE_LIMIT);
const tcgLimiter = new RateLimiter(TCG_RATE_LIMIT);

// Cache helpers
async function getCache(key: string): Promise<any | null> {
  const { data } = await supabase
    .from('ppt_cache')
    .select('payload, fetched_at, ttl_seconds')
    .eq('key', key)
    .single();
  
  if (!data) return null;
  
  const now = new Date();
  const fetchedAt = new Date(data.fetched_at);
  const ttlMs = data.ttl_seconds * 1000;
  
  if (now.getTime() - fetchedAt.getTime() > ttlMs) {
    return null; // Cache expired
  }
  
  return data.payload;
}

async function setCache(key: string, payload: any, ttlSeconds: number = CACHE_TTL_SECONDS): Promise<void> {
  await supabase
    .from('ppt_cache')
    .upsert({
      key,
      payload,
      fetched_at: new Date().toISOString(),
      ttl_seconds: ttlSeconds
    });
}

// Image resolver
async function resolveCardImage(card: RawCard, adapter: SetAdapter): Promise<{ small?: string; large?: string }> {
  const images: { small?: string; large?: string } = {};
  
  // Try adapter overrides first
  if (adapter.imagesOverrides?.[card.number]) {
    const override = adapter.imagesOverrides[card.number];
    if (override.small) images.small = override.small;
    if (override.large) images.large = override.large;
    return images;
  }
  
  // Try PokemonTCG API images
  if (card.images?.small) images.small = card.images.small;
  if (card.images?.large) images.large = card.images.large;
  
  // Try direct imageUrl
  if (card.imageUrl && !images.large) {
    images.large = card.imageUrl;
  }
  
  return images;
}

// Price resolver
async function resolveCardPrices(card: RawCard, adapter: SetAdapter, setId: string): Promise<{ marketCents?: number; pptRawCents?: number; pptPsa10Cents?: number }> {
  const prices: { marketCents?: number; pptRawCents?: number; pptPsa10Cents?: number } = {};
  
  // Try PPT first
  if (adapter.sources.prices.includes('ppt.latest')) {
    try {
      await pptLimiter.waitForSlot();
      
      const cacheKey = `ppt:latest:${setId}:${card.number}:${card.variant || 'base'}`;
      let pptData = await getCache(cacheKey);
      
      if (!pptData) {
        pptData = await pptFetchSummary(setId, card.number);
        if (pptData) {
          await setCache(cacheKey, pptData);
        }
      }
      
      if (pptData?.raw?.usd) {
        prices.pptRawCents = Math.round(pptData.raw.usd * 100);
      }
      if (pptData?.psa10?.usd) {
        prices.pptPsa10Cents = Math.round(pptData.psa10.usd * 100);
      }
    } catch (error) {
      console.warn(`PPT fetch failed for ${setId}#${card.number}:`, error);
    }
  }
  
  // Fallback to TCGPlayer/Cardmarket
  if (card.marketPrice && !prices.marketCents) {
    prices.marketCents = Math.round(card.marketPrice * 100);
  }
  
  return prices;
}

// Main ingestion function
export async function ingestSets(setIds: string[], options: IngestOptions = {}): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  
  for (const setId of setIds) {
    const startTime = Date.now();
    const result: IngestResult = {
      setId,
      success: false,
      cardsProcessed: 0,
      cardsAdded: 0,
      cardsUpdated: 0,
      errors: [],
      duration: 0
    };
    
    try {
      console.log(`🎯 Starting ingestion for ${setId}...`);
      
      const adapter = getSet(setId);
      if (!adapter) {
        throw new Error(`No adapter found for set ${setId}`);
      }
      
      // Fetch set metadata and cards from PokemonTCG API
      const setMeta = await fetchSetMeta(adapter);
      const rawCards = await fetchSetCards(adapter, setId);
      
      console.log(`📊 Found ${rawCards.length} cards in ${setId}`);
      
      // Process cards in batches
      const batchSize = options.batchSize || 25;
      for (let i = 0; i < rawCards.length; i += batchSize) {
        const batch = rawCards.slice(i, i + batchSize);
        
        for (const rawCard of batch) {
          try {
            const cardRecord = await processCard(rawCard, adapter, setId);
            assertCard(cardRecord);
            
            if (!options.dryRun) {
              await upsertCard(cardRecord);
            }
            
            result.cardsProcessed++;
            result.cardsAdded++; // Simplified for now
            
            if (result.cardsProcessed % 25 === 0) {
              console.log(`📈 ${setId}: ${result.cardsProcessed}/${rawCards.length} cards processed`);
            }
          } catch (error) {
            result.errors.push(`Card ${rawCard.number}: ${error}`);
          }
        }
        
        // Small delay between batches
        if (i + batchSize < rawCards.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      result.success = true;
      console.log(`✅ Completed ${setId}: ${result.cardsProcessed} cards processed`);
      
    } catch (error) {
      result.errors.push(`Set ingestion failed: ${error}`);
      console.error(`❌ Failed ${setId}:`, error);
    }
    
    result.duration = Date.now() - startTime;
    results.push(result);
  }
  
  return results;
}

async function fetchSetMeta(adapter: SetAdapter): Promise<any> {
  // This would fetch set metadata from the configured sources
  // For now, return basic info
  return {
    id: adapter.id,
    name: adapter.name,
    lang: adapter.lang,
    releaseDate: new Date().toISOString().split('T')[0]
  };
}

async function fetchSetCards(adapter: SetAdapter, setId: string): Promise<RawCard[]> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Fetching cards for ${setId} from Pokemon TCG API (attempt ${attempt}/${maxRetries})...`);
      
      const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}`, {
        headers: {
          'X-Api-Key': process.env.POKEMON_TCG_API_KEY || '',
        },
      });
      
      if (!response.ok) {
        if (response.status === 504 && attempt < maxRetries) {
          console.log(`⏳ Gateway timeout for ${setId}, retrying in ${attempt * 2} seconds...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
          continue;
        }
        throw new Error(`Pokemon TCG API error: ${response.status}`);
      }
      
      const data = await response.json();
      const cards = data.data || [];
      
      console.log(`📊 Found ${cards.length} cards in ${setId}`);
      return cards.map((card: any) => ({
        id: card.id,
        name: card.name,
        number: card.number,
        rarity: card.rarity,
        images: card.images,
        tcgplayer: card.tcgplayer,
        cardmarket: card.cardmarket,
      }));
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Attempt ${attempt} failed for ${setId}:`, error);
      
      if (attempt < maxRetries) {
        const delay = attempt * 2000; // 2s, 4s, 6s
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`❌ Failed to fetch cards for ${setId} after ${maxRetries} attempts:`, lastError);
  return [];
}

async function processCard(rawCard: RawCard, adapter: SetAdapter, setId: string): Promise<CardRecord> {
  const cardId = buildCardId(setId, rawCard.number, rawCard.variant);
  
  // Resolve images
  const images = await resolveCardImage(rawCard, adapter);
  
  // Resolve prices
  const prices = await resolveCardPrices(rawCard, adapter, setId);
  
  // Build source flags
  const sourceFlags: string[] = [];
  if (adapter.sources.meta.length > 0) sourceFlags.push('meta.pokemontcg');
  if (adapter.sources.images.length > 0) sourceFlags.push('img.resolved');
  if (adapter.sources.prices.length > 0) sourceFlags.push('prices.resolved');
  
  const cardRecord: CardRecord = {
    id: cardId,
    setId,
    setName: adapter.name,
    lang: adapter.lang,
    number: rawCard.number,
    name: rawCard.name,
    rarity: rawCard.rarity,
    variant: rawCard.variant,
    imageSmall: images.small,
    imageLarge: images.large,
    marketCents: prices.marketCents,
    pptRawCents: prices.pptRawCents,
    pptPsa10Cents: prices.pptPsa10Cents,
    psaPop10: null, // Would be resolved from PSA API
    releaseDate: undefined, // Would come from set meta
    lastUpdatedUtc: new Date().toISOString(),
    sourceFlags
  };
  
  return cardRecord;
}

async function upsertCard(cardRecord: CardRecord): Promise<void> {
  await supabase
    .from('cards')
    .upsert({
      card_id: cardRecord.id,
      set_id: cardRecord.setId,
      number: cardRecord.number,
      name: cardRecord.name,
      rarity: cardRecord.rarity,
      variant: cardRecord.variant,
      image_url_small: cardRecord.imageSmall,
      image_url_large: cardRecord.imageLarge,
      market_cents: cardRecord.marketCents,
      ppt_raw_cents: cardRecord.pptRawCents,
      ppt_psa10_cents: cardRecord.pptPsa10Cents,
      psa_pop_10: cardRecord.psaPop10,
      release_date: cardRecord.releaseDate,
      last_updated_utc: cardRecord.lastUpdatedUtc,
      source_flags: cardRecord.sourceFlags
    });
}
