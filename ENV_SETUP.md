# Environment Variables Setup

Create a `.env.local` file with these variables:

```bash
# Catalog (PokémonTCG.io)
POKEMONTCG_API_BASE=https://api.pokemontcg.io/v2
POKEMONTCG_API_KEY=your_pokemon_tcg_api_key_here

# PPT (Pokemon Price Tracker)
PPT_BASE_URL=https://www.pokemonpricetracker.com/api/v2
PPT_API_KEY=your_ppt_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## API Keys Needed:

1. **Pokemon TCG API**: https://pokemontcg.io/ (free tier)
2. **Pokemon Price Tracker**: https://www.pokemonpricetracker.com/ (your existing key)
3. **Supabase**: Your existing Supabase project

## Testing:

1. **Catalog sync**: `curl http://localhost:3000/api/cron/sync-catalog`
2. **Price sync**: `curl http://localhost:3000/api/cron/sync-prices`
3. **Debug page**: Visit `http://localhost:3000/debug/celebrations`
4. **PPT debug**: Visit `http://localhost:3000/debug/ppt/2` (Blastoise)
