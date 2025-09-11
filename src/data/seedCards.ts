/**
 * Seed cards for testing and development
 * Based on popular Pokémon cards with good market data
 */

export const SEED_CARDS = [
  {
    name: 'Pikachu',
    set: 'Crown Zenith',
    number: 'CRZ 160',
    url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/Crown-Zenith/Pikachu-CRZ160'
  },
  {
    name: 'Lucario VSTAR',
    set: 'SWSH Black Star Promos',
    number: 'SWSH291',
    url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/SWSH-Black-Star-Promos/Lucario-VSTAR-SWSH291'
  },
  {
    name: 'Mew ex (V2)',
    set: 'Paldean Fates',
    number: 'PAF 232',
    url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/Paldean-Fates/Mew-ex-V2-PAF232'
  },
  {
    name: 'Charizard ex (V3)',
    set: '151',
    number: 'MEW 199',
    url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/151/Charizard-ex-V3-MEW199'
  },
  {
    name: 'Mew V (V2)',
    set: 'Celebrations',
    number: '—',
    url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/Celebrations/Mew-V2'
  },
  {
    name: 'Umbreon Gold Star',
    set: 'Celebrations Classic',
    number: '—',
    url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/Celebrations/Umbreon-Gold-Star-CELPOP5-17'
  },
  {
    name: 'Greninja Gold Star',
    set: 'SWSH Black Star Promos',
    number: 'SWSH144',
    url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/SWSH-Black-Star-Promos/Greninja-Gold-Star-SWSH144'
  },
  {
    name: 'Flareon TG01',
    set: 'Brilliant Stars',
    number: 'TG01',
    url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/Brilliant-Stars/Flareon-BRSTG01'
  },
  {
    name: 'Gengar V (V2)',
    set: 'Lost Origin',
    number: 'TG06',
    url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/Lost-Origin/Gengar-V2-LORTG06'
  },
  {
    name: 'Charizard',
    set: 'Lost Origin',
    number: 'TG03',
    url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/Lost-Origin/Charizard-LORTG03'
  },
  {
    name: 'Pikachu V (V2)',
    set: 'Lost Origin',
    number: 'TG05',
    url: 'https://www.cardmarket.com/en/Pokemon/Products/Singles/Lost-Origin/Pikachu-V2-LORTG05'
  }
];

/**
 * Get card key for API calls
 */
export function getCardKey(card: typeof SEED_CARDS[0]): { set: string; number: string; name: string } {
  return {
    set: card.set,
    number: card.number,
    name: card.name,
  };
}

/**
 * Get all card keys
 */
export function getAllCardKeys() {
  return SEED_CARDS.map(getCardKey);
}
