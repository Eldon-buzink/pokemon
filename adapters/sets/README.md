# Set Adapters

Every Pokemon TCG set has a lightweight JSON config that tells the ingestion pipeline where to fetch each field and what fallbacks to use.

## Structure

Each set adapter is a JSON file with the following structure:

```json
{
  "id": "cel25c",
  "name": "Celebrations Classic Collection", 
  "lang": "EN",
  "sources": {
    "meta": ["ppt.sets", "bulbapedia.setpage"],
    "images": ["tcgplayer.images", "cardmarket.images", "pokecollector.images"],
    "prices": ["ppt.latest"],
    "pops": ["psa.popCached"]
  },
  "imagesOverrides": {
    "4": {
      "base": "https://custom-image-url.com/charizard.png"
    }
  }
}
```

## Fields

- **id**: Internal set identifier (e.g., "cel25c", "sv01", "sv35-jp")
- **name**: Display name for the set
- **lang**: Language code ("EN" or "JP")
- **sources**: Configuration for where to fetch different types of data
- **imagesOverrides**: Optional overrides for specific card images

## Source Types

- **meta**: Set metadata (release date, total cards, etc.)
- **images**: Card images (small/large variants)
- **prices**: Current market pricing (raw, PSA10)
- **pops**: PSA population data

## Source Fallback Order

The system tries sources in the order listed in each array:

1. **meta**: `ppt.sets` → `pokemontcg.api`
2. **images**: `pokemontcg.images` → `tcgplayer.images` → `cardmarket.images`
3. **prices**: `ppt.latest` → `tcgplayer.market` → `cardmarket.market`
4. **pops**: `psa.popCached` → `psa.api`

## Adding a New Set

### Method 1: Use the generator script (Recommended)
```bash
tsx src/scripts/generate-adapter.ts --id sv13 --name "Temporal Forces" --lang EN
```

### Method 2: Manual creation
1. Copy `_template.json` to `{setId}.json`
2. Update the `id`, `name`, and `lang` fields
3. Adjust `sources` if the set has different data availability
4. Run `npm run ingest:modern` to populate the database

## Testing

Run the mapping tests to ensure data consistency:
```bash
npm run test
```

## Common Sources

- `ppt.sets`: Pokemon Price Tracker set metadata
- `pokemontcg.api`: Pokemon TCG API for cards and images
- `tcgplayer.images`: TCGPlayer image URLs
- `cardmarket.images`: Cardmarket image URLs
- `ppt.latest`: Pokemon Price Tracker latest prices
- `tcgplayer.market`: TCGPlayer market prices
- `cardmarket.market`: Cardmarket prices
- `psa.popCached`: Cached PSA population data

## Examples

- `cel25c.json` - English Celebrations Classic
- `cel25c-jp.json` - Japanese Celebrations Classic
- `sv01.json` - English Scarlet & Violet Base Set
- `sv12.json` - English Mega Evolutions

The pipeline applies the same normalization logic to every set, ensuring consistent data quality and structure.