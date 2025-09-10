# Pokémon Card Movers

A Next.js application for tracking Pokémon card price movements and identifying grading opportunities.

## Features

- **5-Day Movers**: Track cards with significant price movements
- **Confidence Scoring**: High/Speculative/Noisy ratings based on data quality
- **PSA10 Analysis**: Probability calculations and spread analysis
- **Fee Modeling**: Comprehensive cost analysis for grading decisions

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Data Sources**: Pokemon Price Tracker API
- **Charts**: Recharts

## Project Structure

```
src/
├── app/
│   ├── (routes)/
│   │   └── movers/          # 5-day movers leaderboard
│   ├── card/[id]/           # Individual card detail pages
│   └── layout.tsx           # Root layout with navigation
├── components/
│   └── navigation.tsx       # Main navigation component
├── lib/
│   ├── sources/
│   │   └── ppt.ts          # Pokemon Price Tracker API client
│   ├── compute/
│   │   ├── aggregates.ts   # Price aggregation and outlier detection
│   │   └── score.ts        # Ranking and confidence scoring
│   ├── fees/
│   │   └── model.ts        # PSA grading fee structure
│   └── supabase.ts         # Supabase client configuration
└── scripts/                # Data ingestion and computation scripts
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase and PPT API credentials.

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)** in your browser.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `PPT_API_KEY`: Your Pokemon Price Tracker API key
- `PPT_BASE_URL`: Pokemon Price Tracker API base URL

## Database Schema

The application uses a comprehensive schema for tracking:
- Card catalog and assets
- Raw and graded price data
- PSA population data
- Computed daily and 5-day aggregates

See `schema.sql` in the project root for the complete database structure.

## Data Flow

1. **Ingest**: Pull data from PPT API into staging tables
2. **Normalize**: Process into canonical cards and price records
3. **Compute**: Calculate daily aggregates and 5-day deltas
4. **Score**: Apply ranking algorithm and confidence scoring
5. **Serve**: Display results via typed server queries

## Development

- **Linting**: `npm run lint`
- **Type checking**: `npm run type-check`
- **Build**: `npm run build`

## Next Steps

1. Set up Supabase project and run database migrations
2. Implement PPT API integration
3. Build data ingestion scripts
4. Add chart components with Recharts
5. Implement filtering and search functionality