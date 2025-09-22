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
  }
}
```

## Fields

- **id**: Internal set identifier (e.g., "cel25c", "sv01", "sv35-jp")
- **name**: Display name for the set
- **lang**: Language code ("EN" or "JP")
- **sources**: Configuration for where to fetch different types of data

## Source Types

- **meta**: Set metadata (release date, total cards, etc.)
- **images**: Card images (small/large variants)
- **prices**: Current market pricing (raw, PSA10)
- **pops**: PSA population data

## Adding a New Set

1. Copy an existing adapter JSON file
2. Update the `id`, `name`, and `lang` fields
3. Adjust `sources` if the set has different data availability
4. Run `npm run ingest` to populate the database

## Examples

- `cel25c.json` - English Celebrations Classic
- `cel25c-jp.json` - Japanese Celebrations Classic
- `sv01.json` - English Scarlet & Violet Base Set
- `sv12.json` - English Mega Evolutions

The pipeline applies the same normalization logic to every set, ensuring consistent data quality and structure.
