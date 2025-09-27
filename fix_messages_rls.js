#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
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

async function fixMessagesRLS() {
  console.log('🔧 Fixing messages RLS policies...');
  
  const statements = [
    'DROP POLICY IF EXISTS "messages_simple_access" ON messages',
    'DROP POLICY IF EXISTS "messages_all_access" ON messages', 
    'DROP POLICY IF EXISTS "messages_policy" ON messages',
    `CREATE POLICY "Users can view messages in their projects" ON messages
     FOR SELECT USING (
       project_id IN (
         SELECT id FROM projects WHERE user_id = (SELECT auth.uid())
       )
     )`,
    `CREATE POLICY "Users can insert messages in their projects" ON messages
     FOR INSERT WITH CHECK (
       project_id IN (
         SELECT id FROM projects WHERE user_id = (SELECT auth.uid())
       )
     )`,
    `CREATE POLICY "Users can update messages in their projects" ON messages
     FOR UPDATE USING (
       project_id IN (
         SELECT id FROM projects WHERE user_id = (SELECT auth.uid())
       )
     )`,
    `CREATE POLICY "Users can delete messages in their projects" ON messages
     FOR DELETE USING (
       project_id IN (
         SELECT id FROM projects WHERE user_id = (SELECT auth.uid())
       )
     )`
  ];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`📝 Executing statement ${i + 1}/${statements.length}:`);
    console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        console.error('❌ Error:', error);
        if (error.message?.includes('already exists') || error.message?.includes('does not exist')) {
          console.log('⚠️  Expected error, continuing...\n');
          continue;
        }
      } else {
        console.log('✅ Success\n');
      }
    } catch (err) {
      console.error('💥 Failed to execute statement:', err);
    }
  }
  
  console.log('🎉 Messages RLS fix completed!');
}

fixMessagesRLS().catch(console.error);
