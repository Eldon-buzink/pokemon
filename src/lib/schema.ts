/**
 * Standardized Data Schema for Pokemon TCG Cards and Sets
 * This defines the exact data contract that our UI expects
 */

import { z } from "zod";

export const ZSet = z.object({
  id: z.string(),              // internal id e.g. "cel25c"
  name: z.string(),
  lang: z.enum(["EN","JP"]),
  releaseDate: z.string().optional(), // ISO date
});

export const ZCard = z.object({
  setId: z.string(),
  number: z.string(),
  name: z.string(),
  rarity: z.string().optional(),
  artist: z.string().optional(),
  imageUrl: z.string().url().optional(),
  links: z.object({
    tcgplayer: z.string().url().optional(),
    cardmarket: z.string().url().optional(),
    psaPop: z.string().url().optional(),
  }).default({}),
  marketNow: z.object({
    rawUsd: z.number().nullable().optional(),
    psa10Usd: z.number().nullable().optional(),
    lastUpdated: z.string().optional(),
  }).default({}),
});

export type SetNormalized = z.infer<typeof ZSet>;
export type CardNormalized = z.infer<typeof ZCard>;

// Validation helpers
export function validateSet(data: unknown): SetNormalized | null {
  try {
    return ZSet.parse(data);
  } catch (error) {
    console.error('Set validation failed:', error);
    return null;
  }
}

export function validateCard(data: unknown): CardNormalized | null {
  try {
    return ZCard.parse(data);
  } catch (error) {
    console.error('Card validation failed:', error);
    return null;
  }
}

// Quality checks
export function getCardQualityIssues(card: CardNormalized): string[] {
  const issues: string[] = [];
  
  if (!card.imageUrl) {
    issues.push('Missing image URL');
  }
  
  if (!card.marketNow.rawUsd) {
    issues.push('Missing raw USD price');
  }
  
  if (!card.marketNow.psa10Usd) {
    issues.push('Missing PSA10 USD price');
  }
  
  // Suspicious ratio check
  if (card.marketNow.rawUsd && card.marketNow.psa10Usd) {
    const ratio = card.marketNow.psa10Usd / card.marketNow.rawUsd;
    if (ratio < 1.2 || ratio > 15) {
      issues.push(`Suspicious PSA10/Raw ratio: ${ratio.toFixed(2)}x`);
    }
  }
  
  if (!card.rarity) {
    issues.push('Missing rarity');
  }
  
  return issues;
}
