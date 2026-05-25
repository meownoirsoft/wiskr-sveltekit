import { createClient } from '@supabase/supabase-js';

// You'll need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key'; // Need service role key for DDL

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addAvatarColumns() {
  console.log('🚀 Adding avatar columns to user_preferences table...');

  // Add avatar_type column
  try {
    //console.log('📝 Adding avatar_type column...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS avatar_type VARCHAR(20) DEFAULT 'default' CHECK (avatar_type IN ('default', 'premade', 'custom'));"
    });

    if (error) {
      console.error('❌ Error adding avatar_type column:', error);
    } else {
      console.log('✅ avatar_type column added successfully');
    }
  } catch (err) {
    console.error('💥 Failed to add avatar_type column:', err);
  }

  // Add avatar_value column
  try {
    console.log('📝 Adding avatar_value column...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS avatar_value TEXT;"
    });

    if (error) {
      console.error('❌ Error adding avatar_value column:', error);
    } else {
      console.log('✅ avatar_value column added successfully');
    }
  } catch (err) {
    console.error('💥 Failed to add avatar_value column:', err);
  }

  console.log('🎉 Migration completed!');
}

addAvatarColumns().catch(console.error);
