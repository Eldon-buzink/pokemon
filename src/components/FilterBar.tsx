'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface FilterBarProps {
  availableSets?: string[];
}

const getSetDisplayName = (setId: string) => {
  switch (setId) {
    // Celebrations Era
    case 'cel25': return 'Celebrations Main';
    case 'cel25c': return 'Celebrations Classic';
    
    // Sword & Shield Era
    case 'swsh10': return 'Astral Radiance';
    case 'swsh11': return 'Brilliant Stars';
    case 'swsh12': return 'Fusion Strike';
    case 'pgo': return 'Pokemon GO';
    case 'swsh125': return 'Lost Origin';
    case 'swsh13': return 'Silver Tempest';
    
    // Scarlet & Violet Era
    case 'sv01': return 'Scarlet & Violet Base';
    case 'sv02': return 'Paldea Evolved';
    case 'sv03': return 'Obsidian Flames';
    case 'sv35': return '151';
    case 'sv04': return 'Paradox Rift';
    case 'sv045': return 'Paldean Fates';
    case 'sv05': return 'Temporal Forces';
    case 'sv06': return 'Twilight Masquerade';
    case 'sv065': return 'Shrouded Fable';
    case 'sv07': return 'Stellar Crown';
    case 'sv08': return 'Surging Sparks';
    case 'sv09': return 'Paradise Dragona';
    case 'sv10': return 'Prismatic Evolutions';
    case 'sv11': return 'Journey Together';
    case 'sv115': return 'Space-Time Smackdown';
    case 'sv12': return 'Mega Evolutions';
    
    // Japanese sets
    case 'cel25c-jp': return 'Celebrations Classic (JP)';
    case 'cel25-jp': return 'Celebrations (JP)';
    case 'swsh10-jp': return 'Fusion Arts (JP)';
    case 'swsh11-jp': return 'Star Birth (JP)';
    case 'swsh12-jp': return 'Time Gazer / Space Juggler (JP)';
    case 'pgo-jp': return 'Pokemon GO (JP)';
    case 'swsh125-jp': return 'Lost Abyss (JP)';
    case 'swsh13-jp': return 'VMAX Climax (JP)';
    case 'sv01-jp': return 'Scarlet ex / Violet ex (JP)';
    case 'sv02-jp': return 'Triplet Beat (JP)';
    case 'sv03-jp': return 'Raging Surf (JP)';
    case 'sv35-jp': return 'Pokemon Card 151 (JP)';
    case 'sv04-jp': return 'Ancient Roar / Future Flash (JP)';
    case 'sv045-jp': return 'Shiny Treasure ex (JP)';
    case 'sv05-jp': return 'Cyber Judge (JP)';
    case 'sv06-jp': return 'Mask of Change (JP)';
    case 'sv065-jp': return 'Night Wanderer (JP)';
    case 'sv07-jp': return 'Stellar Miracle (JP)';
    case 'sv08-jp': return 'Paradise Dragona (JP)';
    case 'sv09-jp': return 'Supercharged Breaker (JP)';
    case 'sv10-jp': return 'Prismatic Evolutions (JP)';
    case 'sv11-jp': return 'Journey Together (JP)';
    case 'sv115-jp': return 'Space-Time Creation (JP)';
    case 'sv12-jp': return 'Mega Evolution (JP)';
    
    default: return setId.toUpperCase();
  }
};

export function FilterBar({ availableSets = [
  // English sets
  'cel25c', 'cel25', 'swsh10', 'swsh11', 'swsh12', 'pgo', 'swsh125', 'swsh13',
  'sv01', 'sv02', 'sv03', 'sv35', 'sv04', 'sv045', 'sv05', 'sv06', 'sv065',
  'sv07', 'sv08', 'sv09', 'sv10', 'sv11', 'sv115', 'sv12',
  // Japanese sets
  'cel25c-jp', 'cel25-jp', 'swsh10-jp', 'swsh11-jp', 'swsh12-jp', 'pgo-jp', 
  'swsh125-jp', 'swsh13-jp', 'sv01-jp', 'sv02-jp', 'sv03-jp', 'sv35-jp', 
  'sv04-jp', 'sv045-jp', 'sv05-jp', 'sv06-jp', 'sv065-jp', 'sv07-jp', 
  'sv08-jp', 'sv09-jp', 'sv10-jp', 'sv11-jp', 'sv115-jp', 'sv12-jp'
] }: FilterBarProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const [searchValue, setSearchValue] = useState(sp.get('q') || '');
  
  function set(k: string, v?: string) {
    const p = new URLSearchParams(sp);
    v ? p.set(k, v) : p.delete(k);
    router.push(`?${p.toString()}`, { scroll: false });
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      set('q', searchValue || undefined);
    }
  };

  const handleMinMaxBlur = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      set(key, undefined);
    } else {
      set(key, numValue.toString());
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Set Selector */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Set</label>
          <select 
            className="border rounded px-3 py-2 text-sm min-w-[120px]"
            defaultValue={sp.get('set') || 'cel25'} 
            onChange={e => set('set', e.target.value)}
          >
            {availableSets.map(setId => (
              <option key={setId} value={setId}>
                {getSetDisplayName(setId)}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Search</label>
          <input 
            className="border rounded px-3 py-2 text-sm min-w-[160px]"
            placeholder="Search name or #" 
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={() => set('q', searchValue || undefined)}
          />
        </div>

        {/* Sort By */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select 
            className="border rounded px-3 py-2 text-sm min-w-[100px]"
            defaultValue={sp.get('sort') || 'number'} 
            onChange={e => set('sort', e.target.value)}
          >
            <option value="number">#</option>
            <option value="name">Name</option>
            <option value="price">TCG $</option>
            <option value="psa10">PSA10 $</option>
          </select>
        </div>

        {/* Direction */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Order</label>
          <select 
            className="border rounded px-3 py-2 text-sm"
            defaultValue={sp.get('dir') || 'asc'} 
            onChange={e => set('dir', e.target.value)}
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>

        {/* Min Price */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Min $</label>
          <input 
            className="border rounded px-3 py-2 text-sm w-20"
            type="number" 
            placeholder="Min $" 
            defaultValue={sp.get('min') || ''} 
            onBlur={e => handleMinMaxBlur('min', e.currentTarget.value)}
          />
        </div>

        {/* Max Price */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Max $</label>
          <input 
            className="border rounded px-3 py-2 text-sm w-20"
            type="number" 
            placeholder="Max $" 
            defaultValue={sp.get('max') || ''} 
            onBlur={e => handleMinMaxBlur('max', e.currentTarget.value)}
          />
        </div>

        {/* Clear Filters */}
        <div className="flex flex-col">
          <div className="h-6"></div> {/* Spacer for alignment */}
          <button
            className="border rounded px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => {
              setSearchValue('');
              router.push(window.location.pathname, { scroll: false });
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
