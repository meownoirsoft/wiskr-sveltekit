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
          let value = valueParts.join('=').trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key.trim()] = value;
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

async function addTestUserChatSession() {
  const testUserEmail = 'ryan@starsysgt.com';
  
  console.log(`🔍 Finding test user: ${testUserEmail}...`);
  
  try {
    // Find the user by email in auth.users
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      return;
    }
    
    const testUser = users.find(user => user.email === testUserEmail);
    
    if (!testUser) {
      console.error(`❌ User not found: ${testUserEmail}`);
      return;
    }
    
    console.log(`✅ Found user: ${testUser.email} (ID: ${testUser.id})`);
    
    // Find the user's projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, created_at')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: true });
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
      return;
    }
    
    if (projects.length === 0) {
      console.error(`❌ No projects found for user: ${testUserEmail}`);
      return;
    }
    
    console.log(`📁 Found ${projects.length} project(s):`);
    projects.forEach((project, idx) => {
      console.log(`   ${idx + 1}. "${project.name}" (ID: ${project.id})`);
    });
    
    // Use the first (oldest) project
    const project = projects[0];
    console.log(`\n🎯 Using project: "${project.name}" (${project.id})`);
    
    // Check if the project already has sessions
    const { data: existingSessions, error: sessionsError } = await supabase
      .from('conversation_sessions')
      .select('id, session_name')
      .eq('project_id', project.id);
    
    if (sessionsError) {
      console.error('❌ Error checking existing sessions:', sessionsError);
      return;
    }
    
    if (existingSessions.length > 0) {
      console.log(`⚠️  Project already has ${existingSessions.length} session(s):`);
      existingSessions.forEach(session => {
        console.log(`   - "${session.session_name}" (${session.id})`);
      });
      
      // Ask if we should still proceed
      console.log('\n🤔 Do you want to add another session? Continuing...\n');
    }
    
    // Create a main chat session
    console.log('📞 Creating main chat session...');
    const { data: newSession, error: sessionError } = await supabase
      .from('conversation_sessions')
      .insert({
        project_id: project.id,
        session_name: 'Main Chat',
        is_active: true,
        topic_summary: 'Your main conversation with Wiskrs'
      })
      .select('id, session_name')
      .single();
    
    if (sessionError) {
      console.error('❌ Error creating chat session:', sessionError);
      return;
    }
    
    console.log(`✅ Created chat session: "${newSession.session_name}" (${newSession.id})`);
    
    // Create a main conversation branch
    console.log('🌿 Creating main conversation branch...');
    const { data: newBranch, error: branchError } = await supabase
      .from('conversation_branches')
      .insert({
        project_id: project.id,
        session_id: newSession.id,
        branch_id: 'main',
        branch_name: 'Main Conversation',
        color_index: 0
      })
      .select('id, branch_name, branch_id')
      .single();
    
    if (branchError) {
      console.error('❌ Error creating conversation branch:', branchError);
      return;
    }
    
    console.log(`✅ Created conversation branch: "${newBranch.branch_name}" (branch_id: ${newBranch.branch_id})`);
    
    // Verify the setup by querying back
    console.log('\n🔍 Verifying setup...');
    const { data: verification, error: verifyError } = await supabase
      .from('conversation_sessions')
      .select(`
        id,
        session_name,
        topic_summary,
        is_active,
        conversation_branches (
          id,
          branch_id,
          branch_name,
          color_index
        )
      `)
      .eq('id', newSession.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying setup:', verifyError);
      return;
    }
    
    console.log('📊 Setup verification:');
    console.log(`   Session: "${verification.session_name}" (Active: ${verification.is_active})`);
    console.log(`   Summary: "${verification.topic_summary}"`);
    console.log(`   Branches: ${verification.conversation_branches.length}`);
    verification.conversation_branches.forEach(branch => {
      console.log(`      - "${branch.branch_name}" (${branch.branch_id})`);
    });
    
    console.log(`\n🎉 Successfully set up main chat session for ${testUserEmail}!`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the script
addTestUserChatSession().then(() => {
  console.log('\n✅ Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
