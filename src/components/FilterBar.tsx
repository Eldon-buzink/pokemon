'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

interface FilterBarProps {
  availableSets?: string[];
}

const getSetDisplayName = (setId: string) => {
  switch (setId) {
    case 'cel25': return 'Celebrations Main';
    case 'cel25c': return 'Celebrations Classic';
    default: return setId;
  }
};

export function FilterBar({ availableSets = ['cel25', 'cel25c'] }: FilterBarProps) {
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
