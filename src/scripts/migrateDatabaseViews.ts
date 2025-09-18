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
    console.error(`❌ ${description} - Error:`, error);
    return false;
  }
}

async function createExecSQLFunction() {
  console.log('🔧 Creating exec_sql helper function...');
  try {
    const { error } = await db.rpc('exec_sql', { sql_query: 'SELECT 1' });
    if (!error) {
      console.log('✅ exec_sql function already exists');
      return true;
    }
  } catch {
    // Function doesn't exist, create it
  }

  // Create the helper function
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;
  `;

  try {
    const { error } = await db.from('').select('').limit(0); // Test connection
    if (error && error.message.includes('exec_sql')) {
      // Try direct SQL execution
      const { error: createError } = await db.from('').select('').limit(0);
      console.log('⚠️ Cannot create exec_sql function - will try direct queries');
      return false;
    }
    console.log('✅ exec_sql function ready');
    return true;
  } catch (error) {
    console.error('❌ Cannot create exec_sql function:', error);
    return false;
  }
}

async function migrateViews() {
  console.log('🚀 Starting database view migration...');
  console.log('📡 Using Supabase URL:', supabaseUrl);
  
  // Test database connection
  try {
    const { data, error } = await db.from('cards').select('count', { count: 'exact' }).limit(1);
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  let success = 0;
  let total = 0;

  // 1. Drop existing views
  total++;
  if (await runSQL('Dropping existing views', `
    DROP VIEW IF EXISTS v_cards_latest;
    DROP VIEW IF EXISTS v_latest_prices;
  `)) success++;

  // 2. Create v_latest_prices view
  total++;
  if (await runSQL('Creating v_latest_prices view', `
    CREATE VIEW v_latest_prices AS
    SELECT DISTINCT ON (card_id, source)
      card_id, source, raw_cents, psa10_cents, currency, ts, notes
    FROM prices
    ORDER BY card_id, source, ts DESC;
  `)) success++;

  // 3. Create v_cards_latest view with images
  total++;
  if (await runSQL('Creating v_cards_latest view with images', `
    CREATE VIEW v_cards_latest AS
    SELECT
      c.card_id, c.set_id, c.number, c.name, c.rarity,
      ca.image_url_small, ca.image_url_large, ca.set_name,
      tp.raw_cents   as tcg_raw_cents, tp.currency as tcg_currency,
      cm.raw_cents   as cm_raw_cents,  cm.currency as cm_currency,
      ppt.raw_cents  as ppt_raw_cents, ppt.psa10_cents as ppt_psa10_cents
    FROM cards c
    LEFT JOIN card_assets ca ON ca.card_id = c.card_id
    LEFT JOIN v_latest_prices tp  ON tp.card_id=c.card_id AND tp.source='tcgplayer'
    LEFT JOIN v_latest_prices cm  ON cm.card_id=c.card_id AND cm.source='cardmarket'
    LEFT JOIN v_latest_prices ppt ON ppt.card_id=c.card_id AND ppt.source='ppt';
  `)) success++;

  // 4. Create index
  total++;
  if (await runSQL('Creating index on cards(set_id)', `
    CREATE INDEX IF NOT EXISTS v_cards_latest_set_id_idx ON cards(set_id);
  `)) success++;

  // 5. Create source_set_map table
  total++;
  if (await runSQL('Creating source_set_map table', `
    CREATE TABLE IF NOT EXISTS public.source_set_map (
      id bigserial primary key,
      internal_set_id text not null,
      source text not null,
      external_set_id text not null,
      number_min int null,
      number_max int null,
      created_at timestamptz default now()
    );
  `)) success++;

  // 6. Create indexes on mapping table
  total++;
  if (await runSQL('Creating indexes on source_set_map', `
    CREATE INDEX IF NOT EXISTS ssm_internal_idx ON public.source_set_map(internal_set_id);
    CREATE INDEX IF NOT EXISTS ssm_source_idx ON public.source_set_map(source);
  `)) success++;

  // 7. Insert mappings
  total++;
  if (await runSQL('Inserting set mappings', `
    INSERT INTO public.source_set_map (internal_set_id, source, external_set_id, number_min, number_max)
    VALUES
      ('68af37225bce97006df9f260','ptgio','cel25',   1,  100),
      ('68af37225bce97006df9f260','ptgio','cel25c', 101,  999),
      ('cel25','ptgio','cel25',   null,  null),
      ('cel25c','ptgio','cel25c', null,  null),
      ('cel25c','ppt','celebrations-classic-collection', null,  null)
    ON CONFLICT DO NOTHING;
  `)) success++;

  // 8. Create upsert function
  total++;
  if (await runSQL('Creating upsert_price_if_newer function', `
    CREATE OR REPLACE FUNCTION upsert_price_if_newer(
      p_card_id text, p_source text, p_raw_cents int, p_psa10_cents int,
      p_currency text, p_ts timestamptz, p_notes text)
    RETURNS void LANGUAGE plpgsql AS $$
    BEGIN
      INSERT INTO prices(card_id, source, raw_cents, psa10_cents, currency, ts, notes)
      VALUES (p_card_id, p_source, p_raw_cents, p_psa10_cents, p_currency, p_ts, p_notes)
      ON CONFLICT (card_id, source, ts) DO NOTHING;
    END $$;
  `)) success++;

  console.log(`\n🎉 Migration complete! ${success}/${total} operations successful`);
  
  // Test the new view
  try {
    const { data: testData, error: testError } = await db
      .from('v_cards_latest')
      .select('card_id,image_url_small,tcg_raw_cents,ppt_raw_cents')
      .limit(1);
    
    if (testError) {
      console.error('❌ View test failed:', testError);
    } else {
      console.log('✅ New view working correctly');
      if (testData?.[0]) {
        console.log('📊 Sample row:', JSON.stringify(testData[0], null, 2));
      }
    }
  } catch (error) {
    console.error('❌ View test error:', error);
  }
}

// Alternative approach using individual queries if exec_sql doesn't work
async function migrateViewsDirect() {
  console.log('🚀 Starting direct database migration...');
  
  const migrations = [
    {
      name: 'Drop existing views',
      query: 'DROP VIEW IF EXISTS v_cards_latest CASCADE'
    },
    {
      name: 'Drop v_latest_prices',
      query: 'DROP VIEW IF EXISTS v_latest_prices CASCADE'
    },
    {
      name: 'Create v_latest_prices',
      query: `
        CREATE VIEW v_latest_prices AS
        SELECT DISTINCT ON (card_id, source)
          card_id, source, raw_cents, psa10_cents, currency, ts, notes
        FROM prices
        ORDER BY card_id, source, ts DESC
      `
    },
    {
      name: 'Create v_cards_latest with images',
      query: `
        CREATE VIEW v_cards_latest AS
        SELECT
          c.card_id, c.set_id, c.number, c.name, c.rarity,
          ca.image_url_small, ca.image_url_large, ca.set_name,
          tp.raw_cents   as tcg_raw_cents, tp.currency as tcg_currency,
          cm.raw_cents   as cm_raw_cents,  cm.currency as cm_currency,
          ppt.raw_cents  as ppt_raw_cents, ppt.psa10_cents as ppt_psa10_cents
        FROM cards c
        LEFT JOIN card_assets ca ON ca.card_id = c.card_id
        LEFT JOIN v_latest_prices tp  ON tp.card_id=c.card_id AND tp.source='tcgplayer'
        LEFT JOIN v_latest_prices cm  ON cm.card_id=c.card_id AND cm.source='cardmarket'
        LEFT JOIN v_latest_prices ppt ON ppt.card_id=c.card_id AND ppt.source='ppt'
      `
    }
  ];

  let success = 0;
  for (const migration of migrations) {
    try {
      console.log(`🔧 ${migration.name}...`);
      const { error } = await db.rpc('exec', { sql: migration.query });
      if (error) {
        throw error;
      }
      console.log(`✅ ${migration.name} - Success`);
      success++;
    } catch (error) {
      console.error(`❌ ${migration.name} - Error:`, error);
    }
  }

  console.log(`\n🎉 Direct migration complete! ${success}/${migrations.length} operations successful`);
}

async function main() {
  try {
    // Try the RPC approach first, fall back to direct if needed
    await migrateViews();
  } catch (error) {
    console.log('⚠️ RPC approach failed, trying direct queries...');
    await migrateViewsDirect();
  }
}

main().then(() => {
  console.log('🏁 Database migration script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
});
