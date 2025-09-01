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
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey);
const userClient = createClient(supabaseUrl, supabaseAnonKey);

async function debugUserChatSessions() {
  const testUserEmail = 'ryan@starsysgt.com';
  
  console.log(`🔍 Debugging chat sessions for: ${testUserEmail}...`);
  
  try {
    // First, get the user from admin perspective
    const { data: { users }, error: userError } = await adminClient.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      return;
    }
    
    const testUser = users.find(user => user.email === testUserEmail);
    
    if (!testUser) {
      console.error(`❌ User not found: ${testUserEmail}`);
      return;
    }
    
    console.log(`✅ Found user: ${testUser.email} (ID: ${testUser.id})\n`);
    
    // Check what projects exist for this user (admin view)
    console.log('📁 Admin view of user projects:');
    const { data: adminProjects, error: adminProjectsError } = await adminClient
      .from('projects')
      .select('id, name, user_id, created_at')
      .eq('user_id', testUser.id);
    
    if (adminProjectsError) {
      console.error('❌ Error fetching projects (admin):', adminProjectsError);
    } else {
      console.log(`   Found ${adminProjects.length} projects:`);
      adminProjects.forEach(project => {
        console.log(`   - "${project.name}" (ID: ${project.id}, user_id: ${project.user_id})`);
      });
    }
    
    // Check what sessions exist for these projects (admin view)
    if (adminProjects.length > 0) {
      console.log('\n📞 Admin view of conversation sessions:');
      for (const project of adminProjects) {
        const { data: adminSessions, error: adminSessionsError } = await adminClient
          .from('conversation_sessions')
          .select('id, session_name, project_id, is_active, created_at')
          .eq('project_id', project.id);
        
        if (adminSessionsError) {
          console.error(`❌ Error fetching sessions for project ${project.id}:`, adminSessionsError);
        } else {
          console.log(`   Project "${project.name}" has ${adminSessions.length} sessions:`);
          adminSessions.forEach(session => {
            console.log(`     - "${session.session_name}" (ID: ${session.id}, active: ${session.is_active})`);
          });
          
          // Check branches for each session
          for (const session of adminSessions) {
            const { data: adminBranches, error: adminBranchesError } = await adminClient
              .from('conversation_branches')
              .select('id, branch_id, branch_name, session_id, project_id, created_at')
              .eq('session_id', session.id);
            
            if (adminBranchesError) {
              console.error(`❌ Error fetching branches for session ${session.id}:`, adminBranchesError);
            } else {
              console.log(`       Session "${session.session_name}" has ${adminBranches.length} branches:`);
              adminBranches.forEach(branch => {
                console.log(`         - "${branch.branch_name}" (branch_id: ${branch.branch_id})`);
              });
            }
          }
        }
      }
    }
    
    // Now simulate what the user would see through RLS
    console.log('\n🔐 User RLS view (simulating logged-in user):');
    
    // We can't easily simulate the user session without their actual auth token
    // But we can check the RLS policies
    
    console.log('\n🔍 Checking RLS policies for conversation_sessions:');
    const { data: rlsPolicies, error: rlsError } = await adminClient
      .rpc('exec_sql', { 
        sql_query: `
          SELECT schemaname, tablename, policyname, permissive, cmd, qual 
          FROM pg_policies 
          WHERE tablename = 'conversation_sessions';
        `
      });
    
    if (rlsError) {
      console.error('❌ Error checking RLS policies:', rlsError);
    } else {
      console.log('   RLS policies for conversation_sessions:');
      if (rlsPolicies && rlsPolicies.length > 0) {
        rlsPolicies.forEach(policy => {
          console.log(`     - ${policy.policyname} (${policy.cmd}): ${policy.qual}`);
        });
      } else {
        console.log('     No RLS policies found or unable to fetch them');
      }
    }
    
    // Try to query as if we were the user (this might fail due to RLS)
    console.log('\n👤 Attempting to query as user (may fail due to RLS):');
    const { data: userProjects, error: userProjectsError } = await userClient
      .from('projects')
      .select('id, name')
      .eq('user_id', testUser.id);
    
    if (userProjectsError) {
      console.log('❌ Cannot query projects as user (expected due to RLS):', userProjectsError.message);
    } else {
      console.log(`✅ User can see ${userProjects.length} projects through RLS`);
    }
    
    // Check if there might be any data issues
    console.log('\n🔧 Data integrity checks:');
    
    if (adminProjects.length > 0) {
      const projectId = adminProjects[0].id;
      
      // Check if sessions have proper project_id references
      const { data: sessionCheck, error: sessionCheckError } = await adminClient
        .from('conversation_sessions')
        .select('id, project_id')
        .eq('project_id', projectId);
      
      if (sessionCheckError) {
        console.error('❌ Error checking session integrity:', sessionCheckError);
      } else {
        console.log(`✅ Found ${sessionCheck.length} sessions with correct project_id reference`);
      }
      
      // Check if branches have proper session_id references
      if (sessionCheck.length > 0) {
        for (const session of sessionCheck) {
          const { data: branchCheck, error: branchCheckError } = await adminClient
            .from('conversation_branches')
            .select('id, session_id, branch_id')
            .eq('session_id', session.id);
          
          if (branchCheckError) {
            console.error(`❌ Error checking branch integrity for session ${session.id}:`, branchCheckError);
          } else {
            console.log(`✅ Session ${session.id} has ${branchCheck.length} branches with correct references`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugUserChatSessions().then(() => {
  console.log('\n✅ Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
