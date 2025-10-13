/**
 * Image validation and fallback system
 * Fixes the issue where wrong images are shown for cards
 */

export interface ImageSource {
  url: string;
  source: 'tcgdex' | 'pokemontcgapi' | 'pokemon-tcg-data' | 'tcgplayer' | 'pokeapi-sprites' | 'unknown';
  priority: number;
  validated: boolean;
}

export interface CardImageInfo {
  cardId: string;
  setId: string;
  name: string;
  number: string;
}

/**
 * Determine image source from URL
 */
export function getImageSource(url: string): ImageSource['source'] {
  if (url.includes('tcgdex.net')) return 'tcgdex';
  if (url.includes('pokemontcg.io')) return 'pokemontcgapi';
  if (url.includes('raw.githubusercontent.com')) return 'pokemon-tcg-data';
  if (url.includes('tcgplayer')) return 'tcgplayer';
  if (url.includes('pokeapi.co')) return 'pokeapi-sprites';
  return 'unknown';
}

/**
 * Get priority for image source (lower = better)
 */
export function getSourcePriority(source: ImageSource['source']): number {
  const priorities = {
    'tcgdex': 1,           // Best for Japanese
    'pokemon-tcg-data': 2, // Good for English
    'pokemontcgapi': 3,    // Sometimes wrong
    'tcgplayer': 4,        // Backup
    'pokeapi-sprites': 9,  // Placeholder sprites
    'unknown': 5
  };
  return priorities[source];
}

/**
 * Known problematic images that serve wrong content
 */
const KNOWN_BAD_IMAGES = new Set([
  'https://images.pokemontcg.io/sv10/215_hires.png', // Charizard ex Rainbow shows Garchomp
  'https://images.pokemontcg.io/sv10/215.png',       // Same issue with small version
  // Add more as discovered
]);

/**
 * Validate if image URL belongs to the same set as the card
 */
export function validateImageForSet(imageUrl: string, cardInfo: CardImageInfo): boolean {
  const { setId } = cardInfo;
  
  // Check if this is a known bad image
  if (KNOWN_BAD_IMAGES.has(imageUrl)) {
    return false;
  }
  
  // PokeAPI sprites are never validated (they're generic)
  if (imageUrl.includes('pokeapi.co')) {
    return false;
  }
  
  // Direct set_id match in URL
  if (imageUrl.includes(`/${setId}/`) || imageUrl.includes(`/${setId}_`)) {
    return true;
  }
  
  // Special cases for known problematic mappings
  if (setId === 'sv35-jp' && imageUrl.includes('/sv35/')) {
    return false; // This is the problem - sv35 images used for sv35-jp
  }
  if (setId === 'sv12-jp' && imageUrl.includes('/sv12/')) {
    return false; // This is the problem - sv12 images used for sv12-jp
  }
  
  // For TCGdex images, be more lenient - they're generally good quality
  if (imageUrl.includes('tcgdx.net')) {
    return true;
  }
  
  // For Pokemon TCG API images, be more lenient unless we know they're bad
  if (imageUrl.includes('pokemontcg.io')) {
    return true;
  }
  
  // For GitHub images, be more lenient
  if (imageUrl.includes('raw.githubusercontent.com')) {
    return true;
  }
  
  // Default to valid if we can't determine otherwise
  return true;
}

/**
 * Get the best image for a card with validation
 */
export function getBestImage(cardInfo: CardImageInfo, availableImages: string[]): string | null {
  if (!availableImages || availableImages.length === 0) {
    return null;
  }
  
  // Create image sources with validation
  const imageSources: ImageSource[] = availableImages.map(url => ({
    url,
    source: getImageSource(url),
    priority: getSourcePriority(getImageSource(url)),
    validated: validateImageForSet(url, cardInfo)
  }));
  
  // Sort by: validated first, then priority, then by URL (for consistency)
  imageSources.sort((a, b) => {
    // Validated images first
    if (a.validated && !b.validated) return -1;
    if (!a.validated && b.validated) return 1;
    
    // Then by priority (lower is better)
    if (a.priority !== b.priority) return a.priority - b.priority;
    
    // Finally by URL for consistency
    return a.url.localeCompare(b.url);
  });
  
  // Return the best image, or null if no validated images
  const bestImage = imageSources[0];
  
  // Only return validated images, or if no validated images exist, return the best unvalidated
  if (bestImage.validated || imageSources.every(img => !img.validated)) {
    return bestImage.url;
  }
  
  return null; // No good images available
}

/**
 * Get fallback image URL for a card
 */
export function getFallbackImage(cardInfo: CardImageInfo): string {
  const { setId, number } = cardInfo;
  
  // Create a placeholder that shows the set and number
  const setDisplay = setId.replace(/-jp$/, ' (JP)').toUpperCase();
  return `https://via.placeholder.com/300x420/4f46e5/ffffff?text=${encodeURIComponent(setDisplay + ' #' + number)}`;
}

/**
 * Main function to get safe image URL for a card
 */
export function getSafeImageUrl(cardInfo: CardImageInfo, imageUrl?: string): string {
  // If no image URL provided, return fallback
  if (!imageUrl) {
    return getFallbackImage(cardInfo);
  }
  
  // Validate the single image
  const isValid = validateImageForSet(imageUrl, cardInfo);
  
  if (isValid) {
    return imageUrl;
  }
  
  // Image is invalid, return fallback
  return getFallbackImage(cardInfo);
}

/**
 * Debug function to analyze image issues
 */
export function analyzeImageIssues(cardInfo: CardImageInfo, imageUrl?: string): {
  isValid: boolean;
  source: ImageSource['source'];
  priority: number;
  reason?: string;
} {
  if (!imageUrl) {
    return {
      isValid: false,
      source: 'unknown',
      priority: 5,
      reason: 'No image URL provided'
    };
  }
  
  const source = getImageSource(imageUrl);
  const priority = getSourcePriority(source);
  const isValid = validateImageForSet(imageUrl, cardInfo);
  
  let reason: string | undefined;
  if (!isValid) {
    if (KNOWN_BAD_IMAGES.has(imageUrl)) {
      reason = 'Known bad image - serves wrong card content';
    } else if (source === 'pokeapi-sprites') {
      reason = 'Generic Pokemon sprite, not card artwork';
    } else if (imageUrl.includes('/sv35/') && cardInfo.setId === 'sv35-jp') {
      reason = 'English set image used for Japanese set';
    } else if (imageUrl.includes('/sv12/') && cardInfo.setId === 'sv12-jp') {
      reason = 'English set image used for Japanese set';
    } else {
      reason = 'Image URL does not match card set';
    }
  }
  
  return {
    isValid,
    source,
    priority,
    reason
  };
}
