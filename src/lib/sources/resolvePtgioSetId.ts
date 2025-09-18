import { createClient } from '@supabase/supabase-js';

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Resolve internal set ID to external PTCG.io set ID using database mapping
 */
export async function resolvePtgioSetId(internalSetId: string, number: string): Promise<string> {
  try {
    const n = parseInt(number, 10);
    
    const { data, error } = await db()
      .from('source_set_map')
      .select('external_set_id, number_min, number_max')
      .eq('internal_set_id', internalSetId)
      .eq('source', 'ptgio');
    
    if (error) {
      console.error('Error querying source_set_map:', error);
      return internalSetId; // fallback
    }
    
    if (data?.length) {
      // Find the mapping that matches the number range
      const row = data.find(r => 
        (r.number_min == null || n >= r.number_min) && 
        (r.number_max == null || n <= r.number_max)
      ) ?? data[0]; // fallback to first mapping if no range matches
      
      return row.external_set_id;
    }
    
    // Fallback: assume internal already equals external (for sets stored with official IDs)
    return internalSetId;
  } catch (error) {
    console.error('Error in resolvePtgioSetId:', error);
    return internalSetId; // fallback
  }
}

/**
 * Bulk resolve set mappings for better performance when processing many cards
 */
export async function getSetMappings(internalSetId: string, source: string = 'ptgio') {
  try {
    const { data, error } = await db()
      .from('source_set_map')
      .select('external_set_id, number_min, number_max')
      .eq('internal_set_id', internalSetId)
      .eq('source', source);
    
    if (error) {
      console.error('Error querying source_set_map:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getSetMappings:', error);
    return [];
  }
}

/**
 * Helper to resolve a card number to external set ID using pre-fetched mappings
 */
export function resolveWithMappings(
  mappings: Array<{external_set_id: string, number_min: number | null, number_max: number | null}>,
  number: string,
  fallbackSetId: string
): string {
  const n = parseInt(number, 10);
  
  const mapping = mappings.find(m => 
    (m.number_min == null || n >= m.number_min) && 
    (m.number_max == null || n <= m.number_max)
  ) ?? mappings[0];
  
  return mapping?.external_set_id || fallbackSetId;
}
