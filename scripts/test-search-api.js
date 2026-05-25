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

async function testSearchAPI() {
  const projectId = '6a92cc18-08ed-4984-bb2d-2fb075b9dbe6'; // Current BEDNOMANCER project
  const searchTerm = 'test'; // Simple search term
  
  console.log('🔍 Testing Search API for BEDNOMANCER project...\n');
  console.log('Search term:', searchTerm);
  console.log('Project ID:', projectId);

  try {
    // First, let's check what messages exist and their session/branch info
    console.log('\n📨 Checking messages with session_id and branch_id...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, content, branch_id, session_id, created_at')
      .eq('project_id', projectId)
      .ilike('content', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError);
      return;
    }

    console.log(`📊 Found ${messages.length} messages containing "${searchTerm}"\n`);
    
    if (messages.length > 0) {
      messages.forEach((msg, idx) => {
        const preview = msg.content.substring(0, 80) + (msg.content.length > 80 ? '...' : '');
        console.log(`  ${idx + 1}. Message ID: ${msg.id}`);
        console.log(`     Content: "${preview}"`);
        console.log(`     session_id: ${msg.session_id}`);
        console.log(`     branch_id: ${msg.branch_id}`);
        console.log(`     created: ${msg.created_at}\n`);
      });
    }

    // Now let's check the sessions and branches these messages reference
    const sessionIds = [...new Set(messages.map(m => m.session_id).filter(id => id))];
    const branchIds = [...new Set(messages.map(m => m.branch_id).filter(id => id))];

    console.log('🔍 Unique session IDs found:', sessionIds);
    console.log('🔍 Unique branch IDs found:', branchIds);

    if (sessionIds.length > 0) {
      console.log('\n📞 Fetching session information...');
      const { data: sessions, error: sessionsError } = await supabase
        .from('conversation_sessions')
        .select('id, session_name, project_id')
        .in('id', sessionIds);

      if (sessionsError) {
        console.error('❌ Error fetching sessions:', sessionsError);
      } else {
        console.log(`📊 Found ${sessions.length} sessions:`);
        sessions.forEach(session => {
          console.log(`     - ${session.session_name} (ID: ${session.id})`);
        });
      }
    }

    if (branchIds.length > 0) {
      console.log('\n🌿 Fetching branch information...');
      const { data: branches, error: branchesError } = await supabase
        .from('conversation_branches')
        .select('id, branch_id, branch_name, session_id, project_id')
        .in('branch_id', branchIds);

      if (branchesError) {
        console.error('❌ Error fetching branches:', branchesError);
      } else {
        console.log(`📊 Found ${branches.length} branches:`);
        branches.forEach(branch => {
          console.log(`     - ${branch.branch_name} (branch_id: ${branch.branch_id}, session: ${branch.session_id})`);
        });
      }
    }

    // Now let's simulate what the search API would return
    console.log('\n🔍 Simulating search API response...');
    
    if (messages.length > 0) {
      const results = messages.map(message => {
        // Find the session and branch info
        const session = sessions?.find(s => s.id === message.session_id);
        const branch = branches?.find(b => b.branch_id === message.branch_id);
        
        return {
          id: message.id,
          type: 'chats',
          title: session?.session_name || 'Chat',
          name: session?.session_name || 'Chat',
          snippet: message.content.substring(0, 100) + '...',
          content: message.content,
          sessionId: message.session_id,
          session_name: session?.session_name,
          branch_id: message.branch_id,
          branch_name: branch?.branch_name,
          messageId: message.id,
          instanceCount: 1,
          firstMatchIndex: 0
        };
      });

      console.log(`📊 Search results (${results.length}):`);
      results.forEach((result, idx) => {
        console.log(`  ${idx + 1}. ${result.title} - ${result.branch_name || 'Unknown Branch'}`);
        console.log(`     sessionId: ${result.sessionId}`);
        console.log(`     branch_id: ${result.branch_id}`);
        console.log(`     hasSessionId: ${!!result.sessionId}`);
        console.log(`     hasBranchId: ${!!result.branch_id}\n`);
      });

      // Check for any missing IDs
      const missingSessionIds = results.filter(r => !r.sessionId).length;
      const missingBranchIds = results.filter(r => !r.branch_id).length;
      
      console.log('📊 Summary:');
      console.log(`     Messages with sessionId: ${results.length - missingSessionIds}/${results.length}`);
      console.log(`     Messages with branch_id: ${results.length - missingBranchIds}/${results.length}`);
      
      if (missingSessionIds > 0 || missingBranchIds > 0) {
        console.log('\n⚠️  WARNING: Some messages are missing session or branch IDs!');
        console.log('This could cause navigation issues in the mobile search.');
      } else {
        console.log('\n✅ All messages have both sessionId and branch_id - search should work correctly!');
      }
    }

  } catch (error) {
    console.error('❌ Error during search API test:', error);
  }
}

testSearchAPI().then(() => {
  console.log('\n🏁 Search API test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
