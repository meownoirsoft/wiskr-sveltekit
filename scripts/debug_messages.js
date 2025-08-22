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

async function debugMessages() {
  const projectId = '6a92cc18-08ed-4984-bb2d-2fb075b9dbe6'; // Current BEDNOMANCER project
  
  console.log('🔍 Debugging messages for BEDNOMANCER project...\n');

  try {
    // Get all messages for this project, regardless of session or branch
    console.log('📨 Checking ALL messages for project:', projectId);
    const { data: allMessages, error: allMessagesError } = await supabase
      .from('messages')
      .select('id, role, content, session_id, branch_id, project_id, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (allMessagesError) {
      console.error('❌ Error fetching all messages:', allMessagesError);
    } else {
      console.log(`📊 Found ${allMessages.length} total messages for this project\n`);
      
      if (allMessages.length > 0) {
        allMessages.forEach((msg, idx) => {
          const preview = msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : '');
          console.log(`  ${idx + 1}. ${msg.role}: "${preview}"`);
          console.log(`     session: ${msg.session_id}, branch: ${msg.branch_id}`);
          console.log(`     created: ${msg.created_at}\n`);
        });
      }
    }

    // Get sessions for this project
    console.log('📞 Checking sessions for project:', projectId);
    const { data: sessions, error: sessionsError } = await supabase
      .from('conversation_sessions')
      .select('id, session_name, project_id, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError);
      return;
    }

    console.log(`📊 Found ${sessions.length} sessions for this project\n`);

    for (const session of sessions) {
      console.log(`🎯 Session: "${session.session_name}" (ID: ${session.id})`);
      
      // Get branches for this session
      const { data: branches, error: branchesError } = await supabase
        .from('conversation_branches')
        .select('id, branch_id, branch_name, session_id, created_at')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

      if (branchesError) {
        console.error(`   ❌ Error fetching branches:`, branchesError);
        continue;
      }

      console.log(`   🌿 Branches (${branches.length}):`);
      branches.forEach(branch => {
        console.log(`      - "${branch.branch_name}" (branch_id: ${branch.branch_id})`);
      });

      // Check messages for each branch in this session
      for (const branch of branches) {
        const { data: branchMessages, error: branchMessagesError } = await supabase
          .from('messages')
          .select('id, role, content, created_at')
          .eq('session_id', session.id)
          .eq('branch_id', branch.branch_id)
          .order('created_at', { ascending: false });

        if (branchMessagesError) {
          console.error(`      ❌ Error fetching messages for branch ${branch.branch_id}:`, branchMessagesError);
          continue;
        }

        console.log(`      📨 Messages in "${branch.branch_name}": ${branchMessages.length}`);
        if (branchMessages.length > 0) {
          branchMessages.forEach(msg => {
            const preview = msg.content.substring(0, 40) + (msg.content.length > 40 ? '...' : '');
            console.log(`         - ${msg.role}: "${preview}"`);
          });
        }
      }
      
      console.log(''); // Empty line between sessions
    }

    // Check if there are any orphaned messages (messages without valid session/branch references)
    console.log('🔍 Checking for orphaned messages...\n');
    
    const validSessionIds = sessions.map(s => s.id);
    const { data: orphanedMessages, error: orphanedError } = await supabase
      .from('messages')
      .select('id, role, content, session_id, branch_id, created_at')
      .eq('project_id', projectId)
      .not('session_id', 'in', `(${validSessionIds.map(id => `"${id}"`).join(',')})`);

    if (orphanedError) {
      console.error('❌ Error checking orphaned messages:', orphanedError);
    } else if (orphanedMessages.length > 0) {
      console.log(`⚠️  Found ${orphanedMessages.length} orphaned messages (session not found):`);
      orphanedMessages.forEach(msg => {
        const preview = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
        console.log(`   - ${msg.role}: "${preview}" (session: ${msg.session_id}, branch: ${msg.branch_id})`);
      });
    } else {
      console.log('✅ No orphaned messages found');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugMessages().then(() => {
  console.log('\n✅ Message debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
