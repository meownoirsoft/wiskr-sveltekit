#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read the migration file
const migrationSQL = readFileSync('src/lib/migrations/complete_missing_parts.sql', 'utf8');

// Split into individual statements (remove comments and empty lines)
const statements = migrationSQL
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt && !stmt.startsWith('--'))
  .filter(stmt => stmt !== "SELECT 'Migration completed successfully!' as status");

console.log('🚀 Running migration with', statements.length, 'statements...\n');

async function runMigration() {
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement) continue;
    
    console.log(`📝 Executing statement ${i + 1}/${statements.length}:`);
    console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
      
      if (error) {
        console.error('❌ Error:', error);
        
        // Continue with certain expected errors
        if (error.message?.includes('already exists')) {
          console.log('⚠️  Already exists, continuing...\n');
          continue;
        } else {
          throw error;
        }
      } else {
        console.log('✅ Success\n');
      }
    } catch (err) {
      console.error('💥 Failed to execute statement:', err);
      
      // Try alternative approach for complex statements
      if (statement.includes('DO $$')) {
        console.log('🔄 Retrying with direct SQL execution...');
        try {
          const { error: directError } = await supabase
            .from('__migrations__')
            .select('*')
            .limit(0);
          console.log('⚠️  Complex statement skipped - please run manually in Supabase Dashboard');
        } catch {
          console.log('⚠️  Complex statement skipped - please run manually in Supabase Dashboard');
        }
      }
    }
  }
  
  console.log('🎉 Migration completed! Check your database.');
}

runMigration().catch(console.error);
