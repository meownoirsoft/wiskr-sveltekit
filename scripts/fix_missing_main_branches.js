#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvVars() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  } catch (error) {
    console.log('Could not load .env, using system environment variables');
  }
}

loadEnvVars();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMissingMainBranches() {
  console.log('🔧 Fixing sessions with missing main branches...\n');

  try {
    // Get all sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('conversation_sessions')
      .select('id, session_name, project_id')
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError);
      return;
    }

    console.log(`📞 Found ${sessions.length} sessions to check\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const session of sessions) {
      console.log(`🔍 Checking session: "${session.session_name}" (ID: ${session.id})`);

      // Check if this session has a main branch
      const { data: branches, error: branchesError } = await supabase
        .from('conversation_branches')
        .select('id, branch_id, branch_name')
        .eq('session_id', session.id)
        .eq('branch_id', 'main');

      if (branchesError) {
        console.error(`   ❌ Error checking branches:`, branchesError);
        continue;
      }

      if (branches.length > 0) {
        console.log(`   ✅ Already has main branch: "${branches[0].branch_name}"`);
        skippedCount++;
        continue;
      }

      // Create missing main branch
      console.log(`   🔧 Creating missing main branch...`);

      const { error: insertError } = await supabase
        .from('conversation_branches')
        .insert({
          project_id: session.project_id,
          session_id: session.id,
          branch_id: 'main',
          branch_name: 'Main Branch',
          color_index: 0
        });

      if (insertError) {
        console.error(`   ❌ Error creating main branch:`, insertError);
        continue;
      }

      console.log(`   ✅ Created main branch successfully`);
      fixedCount++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Fixed: ${fixedCount} sessions`);
    console.log(`   ⏭️  Skipped (already had main branch): ${skippedCount} sessions`);

    if (fixedCount > 0) {
      console.log(`\n🎉 Fixed ${fixedCount} sessions! Branch dropdowns should now appear for imported projects.`);
    }

  } catch (error) {
    console.error('❌ Fix operation failed:', error);
  }
}

// Run the fix
fixMissingMainBranches().then(() => {
  console.log('\n✅ Fix operation complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
