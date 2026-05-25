#!/usr/bin/env node

/**
 * Cleanup script to remove any legacy "BEDNOMANCER" projects
 * This ensures new users get a truly clean slate
 * 
 * IMPORTANT: Preserves BEDNOMANCER projects for user ry@nrwl.xyz
 * 
 * Usage: node scripts/cleanup-bednomancer.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('  - PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupBednomancerProjects() {
  console.log('🔍 Checking for BEDNOMANCER projects...');
  
  try {
    // First, get the user ID for ry@nrwl.xyz
    const { data: preserveUser, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      return;
    }
    
    const ryUser = preserveUser.users.find(user => user.email === 'ry@nrwl.xyz');
    const preserveUserId = ryUser?.id;
    
    if (preserveUserId) {
      console.log(`👤 Found user ry@nrwl.xyz with ID: ${preserveUserId}`);
      console.log('🛡️  Will preserve their BEDNOMANCER projects');
    } else {
      console.log('👤 User ry@nrwl.xyz not found - no projects to preserve');
    }
    
    // Find BEDNOMANCER projects, excluding those belonging to ry@nrwl.xyz
    let query = supabase
      .from('projects')
      .select('id, name, user_id, created_at, description')
      .or('name.ilike.%BEDNOMANCER%,description.ilike.%BEDNOMANCER%');
    
    if (preserveUserId) {
      query = query.neq('user_id', preserveUserId);
    }
    
    const { data: bednomancerProjects, error: findError } = await query;
      
    if (findError) {
      console.error('❌ Error finding BEDNOMANCER projects:', findError);
      return;
    }
    
    if (!bednomancerProjects || bednomancerProjects.length === 0) {
      console.log('✅ No BEDNOMANCER projects found to clean up. Database is already clean!');
      
      // Show preserved projects if any exist
      if (preserveUserId) {
        const { data: preservedProjects } = await supabase
          .from('projects')
          .select('id, name, created_at')
          .eq('user_id', preserveUserId)
          .or('name.ilike.%BEDNOMANCER%,description.ilike.%BEDNOMANCER%');
        
        if (preservedProjects && preservedProjects.length > 0) {
          console.log(`🛡️  Preserved ${preservedProjects.length} BEDNOMANCER project(s) for ry@nrwl.xyz:`);
          preservedProjects.forEach(project => {
            console.log(`  - ID: ${project.id}, Name: "${project.name}"`);
          });
        }
      }
      return;
    }
    
    console.log(`📋 Found ${bednomancerProjects.length} BEDNOMANCER project(s) to clean up:`);
    bednomancerProjects.forEach(project => {
      console.log(`  - ID: ${project.id}, Name: "${project.name}", User: ${project.user_id}`);
    });
    
    const projectIds = bednomancerProjects.map(p => p.id);
    
    // Clean up associated data in the correct order (children first)
    console.log('🧹 Cleaning up associated data...');
    
    // 1. Messages
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .in('project_id', projectIds);
    if (messagesError) console.warn('⚠️  Error cleaning messages:', messagesError);
    else console.log('✅ Messages cleaned');
    
    // 2. Facts
    const { error: factsError } = await supabase
      .from('facts')
      .delete()
      .in('project_id', projectIds);
    if (factsError) console.warn('⚠️  Error cleaning facts:', factsError);
    else console.log('✅ Facts cleaned');
    
    // 3. Docs
    const { error: docsError } = await supabase
      .from('docs')
      .delete()
      .in('project_id', projectIds);
    if (docsError) console.warn('⚠️  Error cleaning docs:', docsError);
    else console.log('✅ Docs cleaned');
    
    // 4. Conversation branches
    const { error: branchesError } = await supabase
      .from('conversation_branches')
      .delete()
      .in('project_id', projectIds);
    if (branchesError) console.warn('⚠️  Error cleaning conversation branches:', branchesError);
    else console.log('✅ Conversation branches cleaned');
    
    // 5. Conversation sessions
    const { error: sessionsError } = await supabase
      .from('conversation_sessions')
      .delete()
      .in('project_id', projectIds);
    if (sessionsError) console.warn('⚠️  Error cleaning conversation sessions:', sessionsError);
    else console.log('✅ Conversation sessions cleaned');
    
    // 6. Project questions
    const { error: questionsError } = await supabase
      .from('project_questions')
      .delete()
      .in('project_id', projectIds);
    if (questionsError) console.warn('⚠️  Error cleaning project questions:', questionsError);
    else console.log('✅ Project questions cleaned');
    
    // 7. Finally, delete the projects themselves
    const { error: projectsError } = await supabase
      .from('projects')
      .delete()
      .in('id', projectIds);
    if (projectsError) {
      console.error('❌ Error deleting BEDNOMANCER projects:', projectsError);
      return;
    }
    console.log('✅ BEDNOMANCER projects deleted');
    
    // Verify cleanup was successful
    console.log('🔍 Verifying cleanup...');
    const { data: remainingProjects, error: verifyError } = await supabase
      .from('projects')
      .select('id, name, user_id')
      .or('name.ilike.%BEDNOMANCER%,description.ilike.%BEDNOMANCER%')
      .neq('user_id', preserveUserId || 'no-user'); // Exclude preserved user
      
    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError);
      return;
    }
    
    if (remainingProjects && remainingProjects.length > 0) {
      console.error('❌ Cleanup verification failed. Some BEDNOMANCER projects still exist:');
      remainingProjects.forEach(project => {
        console.error(`  - ID: ${project.id}, Name: "${project.name}", User: ${project.user_id}`);
      });
    } else {
      console.log('🎉 Cleanup completed successfully! All unwanted BEDNOMANCER projects have been removed.');
      
      // Show what was preserved
      if (preserveUserId) {
        const { data: preservedProjects } = await supabase
          .from('projects')
          .select('id, name, created_at')
          .eq('user_id', preserveUserId)
          .or('name.ilike.%BEDNOMANCER%,description.ilike.%BEDNOMANCER%');
        
        if (preservedProjects && preservedProjects.length > 0) {
          console.log(`🛡️  Preserved ${preservedProjects.length} BEDNOMANCER project(s) for ry@nrwl.xyz:`);
          preservedProjects.forEach(project => {
            console.log(`  - ID: ${project.id}, Name: "${project.name}"`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error);
  }
}

// Run the cleanup
cleanupBednomancerProjects();
