import { SetAdapter, SetId } from '../types';
import fs from 'fs';
import path from 'path';

// Dynamic adapter loading
function loadAdapters(): Record<SetId, SetAdapter> {
  const adapters: Record<SetId, SetAdapter> = {};
  const adapterDir = path.join(process.cwd(), 'adapters', 'sets');
  
  try {
    const files = fs.readdirSync(adapterDir).filter(f => f.endsWith('.json') && f !== '_template.json');
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(adapterDir, file), 'utf8');
        const adapter = JSON.parse(content) as SetAdapter;
        adapters[adapter.id] = adapter;
      } catch (error) {
        console.warn(`Failed to load adapter ${file}:`, error);
      }
    }
  } catch (error) {
    console.warn('Failed to read adapter directory:', error);
  }
  
  return adapters;
}

// Registry of all set adapters
export const SETS: Record<SetId, SetAdapter> = loadAdapters();

// Default range after Celebrations (chronologically ordered)
export const DEFAULT_RANGE_AFTER_CELEBRATIONS: SetId[] = [
  // Celebrations Era
  'cel25c', 'cel25c', 'cel25', 'cel25',
  
  // Sword & Shield Era
  'swsh12pt5', 'swsh12', 'swsh12pt5', 'swsh12pt5', 'swsh12pt5', 'swsh12pt5', 'pgo', 'pgo-jp', 'swsh12pt5', 'swsh12pt5', 'swsh13', 'swsh13-jp', 'swsh14', 'swsh14-jp',
  
  // Scarlet & Violet Era
  'sv1', 'sv1', 'sv2', 'sv2', 'sv3', 'sv3', 'sv3pt5', 'sv3pt5', 
  'sv4', 'sv4', 'sv4pt5', 'sv5', 'sv5', 'sv6', 'sv6', 'sv6pt5', 
  'sv7', 'sv7', 'sv8', 'sv8', 'sv9', 'sv9', 'sv10', 'sv10', 
  'zsv10pt5', 'zsv10pt5', 'rsv10pt5', 'sv8pt5', 'sv8pt5'
];

export function listSets(): SetAdapter[] {
  return Object.values(SETS);
}

export function getSet(setId: SetId): SetAdapter | undefined {
  return SETS[setId];
}

export function listSetsByLang(lang: 'EN' | 'JP'): SetAdapter[] {
  return Object.values(SETS).filter(set => set.lang === lang);
}

export function getAvailableSetIds(): SetId[] {
  return Object.keys(SETS);
}

// Validate adapter structure
export function validateAdapter(adapter: any): adapter is SetAdapter {
  if (!adapter || typeof adapter !== 'object') {
    return false;
  }
  
  const required = ['id', 'name', 'lang', 'sources'];
  for (const field of required) {
    if (!(field in adapter)) {
      return false;
    }
  }
  
  if (!['EN', 'JP'].includes(adapter.lang)) {
    return false;
  }
  
  if (!adapter.sources || typeof adapter.sources !== 'object') {
    return false;
  }
  
  const requiredSources = ['meta', 'images', 'prices', 'pops'];
  for (const source of requiredSources) {
    if (!Array.isArray(adapter.sources[source])) {
      return false;
    }
  }
  
  return true;
}

// Get sets that are available for ingestion
export function getIngestibleSets(): SetAdapter[] {
  return Object.values(SETS).filter(adapter => {
    // Only include sets that have the required source configurations
    return adapter.sources.meta.length > 0 && 
           adapter.sources.images.length > 0 && 
           adapter.sources.prices.length > 0;
  });
}
