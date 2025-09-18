import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function createPPTCacheTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
    return;
  }

  const db = createClient(supabaseUrl, supabaseKey);
  console.log('🔧 Creating PPT cache and throttle tables...');

  const statements = [
    {
      name: 'ppt_cache table',
      sql: `create table if not exists ppt_cache (
        id bigserial primary key,
        set_id text not null,
        number text not null,
        kind text not null,
        payload jsonb not null,
        fetched_at timestamptz not null default now(),
        unique (set_id, number, kind)
      )`
    },
    {
      name: 'ppt_throttle table', 
      sql: `create table if not exists ppt_throttle (
        id bigserial primary key,
        set_id text not null,
        number text not null,
        last_attempt timestamptz,
        next_earliest timestamptz,
        last_status text,
        attempts int default 0,
        unique (set_id, number)
      )`
    },
    {
      name: 'ppt_cache RLS',
      sql: `alter table ppt_cache enable row level security`
    },
    {
      name: 'ppt_throttle RLS',
      sql: `alter table ppt_throttle enable row level security`
    },
    {
      name: 'ppt_cache read policy',
      sql: `create policy if not exists "read cache" on ppt_cache for select using (true)`
    },
    {
      name: 'ppt_throttle read policy',
      sql: `create policy if not exists "read throttle" on ppt_throttle for select using (true)`
    }
  ];
  
  for (const stmt of statements) {
    try {
      console.log(`🔄 Creating ${stmt.name}...`);
      const { error } = await db.rpc('exec_sql', { sql_text: stmt.sql });
      
      if (error) {
        console.error(`❌ Error with ${stmt.name}:`, error.message);
      } else {
        console.log(`✅ Success: ${stmt.name}`);
      }
    } catch (e) {
      console.error(`❌ Exception with ${stmt.name}:`, e);
    }
  }
  
  // Verify tables exist
  try {
    const { data: tables, error: checkError } = await db
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['ppt_cache', 'ppt_throttle']);
      
    if (checkError) {
      console.error('❌ Error checking tables:', checkError.message);
    } else {
      const tableNames = tables?.map(t => t.table_name) || [];
      console.log('📋 Tables now exist:', tableNames);
      
      if (tableNames.includes('ppt_cache') && tableNames.includes('ppt_throttle')) {
        console.log('🎉 PPT cache system ready!');
      } else {
        console.warn('⚠️ Some tables missing:', ['ppt_cache', 'ppt_throttle'].filter(t => !tableNames.includes(t)));
      }
    }
  } catch (e) {
    console.error('❌ Error verifying tables:', e);
  }
}

// Run the script
createPPTCacheTables().then(() => {
  console.log('✨ Script complete');
}).catch(e => {
  console.error('💥 Script failed:', e);
});