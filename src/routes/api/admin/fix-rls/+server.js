import sql from '$lib/server/db.js';
import { json } from '@sveltejs/kit';

export async function POST() {
  try {
    const sqlCommands = [
      `DROP POLICY IF EXISTS "Users can only see their own projects" ON projects`,
      `DROP POLICY IF EXISTS "Users can only access facts from their own projects" ON facts`,
      `CREATE POLICY IF NOT EXISTS "Users can see projects assigned to them" ON projects
       FOR ALL USING (user_id = current_setting('app.current_user_id', true)::uuid)`,
      `CREATE POLICY IF NOT EXISTS "Users can access facts from their assigned projects" ON facts
       FOR ALL USING (
         project_id IN (
           SELECT id FROM projects
           WHERE user_id = current_setting('app.current_user_id', true)::uuid
         )
       )`
    ];

    for (const command of sqlCommands) {
      await sql.unsafe(command);
    }

    return json({ success: true, message: 'RLS policies updated successfully' });
  } catch (error) {
    console.error('Error updating RLS policies:', error);
    return json({ success: false, message: 'Error updating RLS policies', error: error.message });
  }
}
