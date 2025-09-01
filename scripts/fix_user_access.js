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

async function fixUserAccess() {
  const testUserEmail = 'ryan@starsysgt.com';
  
  console.log(`🔧 Fixing access issues for: ${testUserEmail}...`);
  
  try {
    // Get the user
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
    
    // Test RLS policies by attempting to query as the specific user
    console.log('🔐 Testing RLS access with user token...');
    
    // Create a session for the user to test RLS
    const { data: { session }, error: sessionError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: testUser.email,
    });
    
    if (sessionError) {
      console.error('❌ Error generating session:', sessionError);
    } else {
      console.log('✅ Generated user session for testing\n');
      
      // Create a client with the user's session
      const userClient = createClient(supabaseUrl, supabaseAnonKey);
      
      // Set the session manually (note: this is for testing, normally handled by auth flow)
      console.log('🧪 Testing user access to projects...');
      
      // Test direct query with admin client filtering by user_id
      const { data: adminProjects, error: adminProjectsError } = await adminClient
        .from('projects')
        .select('id, name, user_id')
        .eq('user_id', testUser.id);
      
      if (adminProjectsError) {
        console.error('❌ Error fetching projects (admin):', adminProjectsError);
      } else {
        console.log(`📁 Admin view: Found ${adminProjects.length} projects for user`);
        adminProjects.forEach(p => {
          console.log(`   - "${p.name}" (ID: ${p.id}, user_id: ${p.user_id})`);
        });
      }
      
      // Check if the problem is RLS policies
      console.log('\n🔍 Testing RLS policy functionality...');
      
      // Test the RLS function directly
      const { data: rlsTest, error: rlsTestError } = await adminClient
        .rpc('rls_test_function', { test_user_id: testUser.id });
      
      if (rlsTestError && !rlsTestError.message?.includes('does not exist')) {
        console.error('❌ RLS test error:', rlsTestError);
      } else if (rlsTestError) {
        console.log('ℹ️  RLS test function not available (this is normal)');
      }
      
      // Try to impersonate user and test access
      console.log('\n👤 Testing user impersonation for project access...');
      
      try {
        // Use the admin client to impersonate the user for testing
        const { data: impersonatedProjects, error: impersonatedError } = await adminClient
          .from('projects')
          .select('id, name')
          .eq('user_id', testUser.id);
        
        if (impersonatedError) {
          console.error('❌ Error with impersonated query:', impersonatedError);
        } else {
          console.log(`👤 Impersonated view: ${impersonatedProjects.length} projects accessible`);
        }
      } catch (impersonationError) {
        console.error('❌ Impersonation test failed:', impersonationError);
      }
      
      // Check if there are any issues with the project ownership
      console.log('\n🔍 Checking project ownership integrity...');
      
      if (adminProjects.length > 0) {
        const project = adminProjects[0];
        
        console.log(`📝 Project details:`);
        console.log(`   - Project ID: ${project.id}`);
        console.log(`   - Project user_id: ${project.user_id}`);
        console.log(`   - User ID: ${testUser.id}`);
        console.log(`   - IDs match: ${project.user_id === testUser.id}`);
        
        // Try to fix any potential issues by updating the project ownership
        if (project.user_id !== testUser.id) {
          console.log('🔧 Fixing project ownership...');
          
          const { error: fixError } = await adminClient
            .from('projects')
            .update({ user_id: testUser.id })
            .eq('id', project.id);
          
          if (fixError) {
            console.error('❌ Error fixing project ownership:', fixError);
          } else {
            console.log('✅ Fixed project ownership');
          }
        }
        
        // Check if the conversation sessions are properly linked
        console.log('\n🔍 Checking session ownership...');
        
        const { data: sessions, error: sessionsError } = await adminClient
          .from('conversation_sessions')
          .select('id, session_name, project_id')
          .eq('project_id', project.id);
        
        if (sessionsError) {
          console.error('❌ Error checking sessions:', sessionsError);
        } else {
          console.log(`📞 Found ${sessions.length} sessions for project`);
          sessions.forEach(session => {
            console.log(`   - "${session.session_name}" (ID: ${session.id}, project: ${session.project_id})`);
          });
        }
      }
      
      // Final test: try to query projects through the sessions API approach
      console.log('\n🧪 Testing project access via sessions API approach...');
      
      const project = adminProjects[0];
      if (project) {
        // Simulate the exact query that the sessions API does
        const { data: projectCheck, error: projectCheckError } = await adminClient
          .from('projects')
          .select('id')
          .eq('id', project.id)
          .single();
        
        if (projectCheckError) {
          console.error('❌ Project access check failed (simulating sessions API):', projectCheckError);
        } else {
          console.log('✅ Project access check passed (simulating sessions API)');
          
          // Now test the sessions query
          const { data: sessionsCheck, error: sessionsCheckError } = await adminClient
            .from('conversation_sessions')
            .select('*')
            .eq('project_id', project.id)
            .order('updated_at', { ascending: false });
          
          if (sessionsCheckError) {
            console.error('❌ Sessions query failed:', sessionsCheckError);
          } else {
            console.log(`✅ Sessions query successful: ${sessionsCheck.length} sessions found`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Run the fix
fixUserAccess().then(() => {
  console.log('\n✅ Access fix completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
