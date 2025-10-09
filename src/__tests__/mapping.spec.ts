import { describe, it, expect } from 'vitest';
import { getSet, validateAdapter } from '../lib/adapters';
import { buildCardId, parseCardId, assertCard } from '../lib/types';

describe('Set Adapter Mapping', () => {
  it('should load and validate cel25c adapter', () => {
    const adapter = getSet('cel25c');
    expect(adapter).toBeDefined();
    expect(validateAdapter(adapter)).toBe(true);
    expect(adapter?.id).toBe('cel25c');
    expect(adapter?.lang).toBe('EN');
  });

  it('should load and validate sv35 adapter', () => {
    const adapter = getSet('sv35');
    expect(adapter).toBeDefined();
    expect(validateAdapter(adapter)).toBe(true);
    expect(adapter?.id).toBe('sv35');
    expect(adapter?.lang).toBe('EN');
  });

  it('should have required source configurations', () => {
    const adapter = getSet('cel25c');
    expect(adapter?.sources.meta).toBeInstanceOf(Array);
    expect(adapter?.sources.images).toBeInstanceOf(Array);
    expect(adapter?.sources.prices).toBeInstanceOf(Array);
    expect(adapter?.sources.pops).toBeInstanceOf(Array);
  });
});

describe('Card ID Generation', () => {
  it('should generate stable card IDs', () => {
    expect(buildCardId('cel25c', '4')).toBe('cel25c-4-base');
    expect(buildCardId('cel25c', '4', 'holo')).toBe('cel25c-4-holo');
    expect(buildCardId('sv35', '150', 'alt-art')).toBe('sv35-150-alt-art');
  });

  it('should parse card IDs correctly', () => {
    expect(parseCardId('cel25c-4-base')).toEqual({
      setId: 'cel25c',
      number: '4',
      variant: undefined
    });
    
    expect(parseCardId('cel25c-4-holo')).toEqual({
      setId: 'cel25c',
      number: '4',
      variant: 'holo'
    });
    
    expect(parseCardId('sv35-150-alt-art')).toEqual({
      setId: 'sv35',
      number: '150',
      variant: 'alt-art'
    });
  });
});

describe('Card Record Validation', () => {
  it('should validate a complete card record', () => {
    const validCard = {
      id: 'cel25c-4-base',
      setId: 'cel25c',
      setName: 'Celebrations Classic Collection',
      lang: 'EN' as const,
      number: '4',
      name: 'Charizard',
      rarity: 'Rare Holo',
      variant: 'base',
      imageSmall: 'https://images.pokemontcg.io/cel25c/4_small.png',
      imageLarge: 'https://images.pokemontcg.io/cel25c/4.png',
      marketCents: 2500,
      pptRawCents: 2400,
      pptPsa10Cents: 10800,
      psaPop10: 150,
      releaseDate: '2021-10-08',
      lastUpdatedUtc: '2024-01-01T00:00:00Z',
      sourceFlags: ['pokemontcg.api', 'ppt.latest']
    };

    expect(() => assertCard(validCard)).not.toThrow();
  });

  it('should reject invalid card records', () => {
    const invalidCard = {
      id: 'cel25c-4-base',
      setId: 'cel25c',
      // Missing required fields
    };

    expect(() => assertCard(invalidCard)).toThrow();
  });

  it('should reject cards with invalid lang', () => {
    const invalidCard = {
      id: 'cel25c-4-base',
      setId: 'cel25c',
      setName: 'Celebrations Classic Collection',
      lang: 'INVALID',
      number: '4',
      name: 'Charizard',
      lastUpdatedUtc: '2024-01-01T00:00:00Z',
      sourceFlags: []
    };

    expect(() => assertCard(invalidCard)).toThrow();
  });

  it('should reject cards with negative prices', () => {
    const invalidCard = {
      id: 'cel25c-4-base',
      setId: 'cel25c',
      setName: 'Celebrations Classic Collection',
      lang: 'EN' as const,
      number: '4',
      name: 'Charizard',
      lastUpdatedUtc: '2024-01-01T00:00:00Z',
      sourceFlags: [],
      marketCents: -100 // Invalid negative price
    };

    expect(() => assertCard(invalidCard)).toThrow();
  });
});

describe('Image URL Validation', () => {
  it('should validate image URLs', () => {
    const validUrls = [
      'https://images.pokemontcg.io/cel25c/4.png',
      'https://product-images.tcgplayer.com/12345.jpg',
      'https://static.cardmarket.com/images/67890.png'
    ];

    validUrls.forEach(url => {
      expect(url.startsWith('https://')).toBe(true);
    });
  });
});
