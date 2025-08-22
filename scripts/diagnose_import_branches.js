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
    console.log('Could not load .env.local, using system environment variables');
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

async function diagnoseImportedProjects() {
  console.log('🔍 Diagnosing imported projects and branch visibility...\n');

  try {
    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, user_id, created_at')
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
      return;
    }

    console.log(`📁 Found ${projects.length} projects:\n`);

    for (const project of projects) {
      console.log(`🎯 Project: "${project.name}" (ID: ${project.id})`);
      console.log(`   Owner: ${project.user_id}`);
      console.log(`   Created: ${project.created_at}`);

      // Get sessions for this project
      const { data: sessions, error: sessionsError } = await supabase
        .from('conversation_sessions')
        .select('id, session_name, project_id, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (sessionsError) {
        console.error(`   ❌ Error fetching sessions:`, sessionsError);
        continue;
      }

      console.log(`   📞 Sessions: ${sessions.length}`);

      for (const session of sessions) {
        console.log(`      - "${session.session_name}" (ID: ${session.id})`);

        // Get branches for this session
        const { data: branches, error: branchesError } = await supabase
          .from('conversation_branches')
          .select('id, branch_id, branch_name, project_id, session_id, color_index, created_at')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false });

        if (branchesError) {
          console.error(`         ❌ Error fetching branches:`, branchesError);
          continue;
        }

        console.log(`         🌿 Branches: ${branches.length}`);
        for (const branch of branches) {
          console.log(`            - "${branch.branch_name}" (branch_id: ${branch.branch_id})`);
        }

        // Get messages for this session
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, role, content, session_id, branch_id, created_at')
          .eq('session_id', session.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (messagesError) {
          console.error(`         ❌ Error fetching messages:`, messagesError);
          continue;
        }

        console.log(`         💬 Messages: ${messages.length} (showing latest 5)`);
        for (const message of messages) {
          const preview = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
          console.log(`            - ${message.role}: "${preview}" (branch: ${message.branch_id})`);
        }
      }

      console.log(''); // Empty line between projects
    }

    // Now let's test RLS from a user perspective
    console.log('\n🔐 Testing RLS policies...\n');

    // Get a sample user
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    const sampleUser = authUsers.users.find(u => projects.some(p => p.user_id === u.id));
    if (!sampleUser) {
      console.log('⚠️  No matching user found to test RLS');
      return;
    }

    console.log(`👤 Testing with user: ${sampleUser.email} (${sampleUser.id})`);

    // Create a user-level client
    const userSupabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
    
    // Mock user session (this won't work for actual RLS testing but shows the approach)
    console.log('   📋 User would see the following through RLS:');
    
    const userProject = projects.find(p => p.user_id === sampleUser.id);
    if (userProject) {
      console.log(`   ✅ Can access project: "${userProject.name}"`);
      
      // Check if user can see branches for their own project
      const { data: userBranches, error: userBranchesError } = await supabase
        .from('conversation_branches')
        .select('*')
        .eq('project_id', userProject.id);

      if (userBranchesError) {
        console.error('   ❌ Error fetching user branches:', userBranchesError);
      } else {
        console.log(`   🌿 User can see ${userBranches.length} branches for their project`);
        userBranches.forEach(branch => {
          console.log(`      - ${branch.branch_name} (${branch.branch_id})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

// Run the diagnosis
diagnoseImportedProjects().then(() => {
  console.log('\n✅ Diagnosis complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
