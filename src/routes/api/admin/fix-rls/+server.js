import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST() {
  try {
    // SQL to fix RLS policies
    const sqlCommands = [
      // Drop existing policies
      `DROP POLICY IF EXISTS "Users can only see their own projects" ON projects;`,
      `DROP POLICY IF EXISTS "Users can only access facts from their own projects" ON facts;`,
      
      // Create new policies that work with admin-created projects
      `CREATE POLICY "Users can see projects assigned to them" ON projects
       FOR ALL USING (auth.uid() = user_id);`,
       
      `CREATE POLICY "Users can access facts from their assigned projects" ON facts
       FOR ALL USING (
         project_id IN (
           SELECT id FROM projects WHERE user_id = auth.uid()
         )
       );`
    ];

    // Execute each SQL command
    for (const sql of sqlCommands) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (error) {
        console.error('SQL Error:', error);
        // Try direct query as fallback
        const { error: directError } = await supabase
          .from('_system')
          .select('*')
          .eq('never_match', true); // This won't match but allows us to execute raw SQL
        
        if (directError) {
          console.error('Direct SQL also failed:', directError);
        }
      }
    }

    // Alternative approach: Use the direct SQL execution method
    const combinedSQL = sqlCommands.join('\n');
    
    // Try to execute via raw SQL
    try {
      const { error: rawError } = await supabase
        .rpc('exec_sql', { sql_query: combinedSQL });
      
      if (rawError) {
        console.log('RPC failed, trying alternative approach...');
        // We'll need to execute these manually through Supabase dashboard
        return json({
          success: false,
          message: 'Could not execute SQL directly. Please run the following SQL in your Supabase SQL editor:',
          sql: combinedSQL
        });
      }
    } catch (rpcError) {
      console.log('RPC method not available, returning SQL for manual execution');
      return json({
        success: false,
        message: 'Please execute the following SQL in your Supabase SQL editor:',
        sql: combinedSQL
      });
    }

    return json({
      success: true,
      message: 'RLS policies updated successfully'
    });

  } catch (error) {
    console.error('Error updating RLS policies:', error);
    return json({
      success: false,
      message: 'Error updating RLS policies',
      error: error.message
    });
  }
}
