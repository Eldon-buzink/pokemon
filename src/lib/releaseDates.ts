/**
 * Release dates for Pokémon card sets
 * Used for early market detection and confidence scoring
 */

const RELEASE_DATES: Record<string, string> = {
  'Crown Zenith': '2023-01-20',
  'Paldean Fates': '2024-01-26',
  '151': '2023-06-16',
  'Brilliant Stars': '2022-02-25',
  'Lost Origin': '2022-09-09',
  'Astral Radiance': '2022-05-27',
  'SWSH Black Star Promos': '2019-10-04',
  'Celebrations': '2021-10-08',
  'Celebrations Classic': '2021-10-08',
  'Base Set': '1996-10-20',
  'Jungle': '1999-06-16',
  'Fossil': '1999-10-10',
  'Team Rocket': '2000-04-24',
  'Gym Heroes': '2000-08-14',
  'Gym Challenge': '2000-10-16',
  'Neo Genesis': '2000-12-16',
  'Neo Discovery': '2001-06-01',
  'Neo Destiny': '2001-02-28',
  'Neo Revelation': '2001-09-21',
};

/**
 * Calculate days since release for a set
 */
export function daysSinceRelease(set: string): number {
  const releaseDate = RELEASE_DATES[set];
  
  if (!releaseDate) {
    // Default to 2 years ago for unknown sets
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 2);
    return Math.floor((Date.now() - defaultDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  const release = new Date(releaseDate);
  const now = new Date();
  
  return Math.floor((now.getTime() - release.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a set is considered "early market" (< 120 days)
 */
export function isEarlyMarket(set: string): boolean {
  return daysSinceRelease(set) < 120;
}

/**
 * Get release date for a set
 */
export function getReleaseDate(set: string): Date | null {
  const releaseDate = RELEASE_DATES[set];
  return releaseDate ? new Date(releaseDate) : null;
}

/**
 * Get all known sets
 */
export function getAllSets(): string[] {
  return Object.keys(RELEASE_DATES);
}
