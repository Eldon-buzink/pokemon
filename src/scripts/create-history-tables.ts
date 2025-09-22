import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function runSQL(description: string, sql: string) {
  console.log(`🔧 ${description}...`);
  try {
    const { data, error } = await db.rpc('exec_sql', { sql_query: sql });
    if (error) {
      throw error;
    }
    console.log(`✅ ${description} - Success`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - Failed:`, error);
    return false;
  }
}

async function createHistoryTables() {
  console.log('🗄️ Creating price_history and pop_history tables...');
  
  // Create price_history table
  await runSQL('Creating price_history table', `
    create table if not exists price_history (
      set_id text not null,
      number text not null,
      date date not null,
      raw_usd numeric,
      psa10_usd numeric,
      primary key (set_id, number, date)
    );
    
    -- Add indexes for better query performance
    create index if not exists idx_price_history_set_date on price_history(set_id, date desc);
    
    -- Add comments for documentation
    comment on table price_history is 'Historical price data for cards across different conditions';
    comment on column price_history.raw_usd is 'Raw/ungraded card price in USD';
    comment on column price_history.psa10_usd is 'PSA 10 graded card price in USD';
  `);
  
  // Create pop_history table
  await runSQL('Creating pop_history table', `
    create table if not exists pop_history (
      set_id text not null,
      number text not null,
      date date not null,
      psa10 int,
      psa9 int,
      psa8 int,
      total int,
      primary key (set_id, number, date)
    );
    
    -- Add indexes for better query performance
    create index if not exists idx_pop_history_set_date on pop_history(set_id, date desc);
    
    -- Add comments for documentation
    comment on table pop_history is 'Historical PSA population data for graded cards';
    comment on column pop_history.psa10 is 'Number of PSA 10 graded cards';
    comment on column pop_history.psa9 is 'Number of PSA 9 graded cards';
    comment on column pop_history.psa8 is 'Number of PSA 8 graded cards';
    comment on column pop_history.total is 'Total number of graded cards';
  `);
  
  console.log('🎉 Database tables setup complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createHistoryTables().catch(console.error);
}

export { createHistoryTables };
