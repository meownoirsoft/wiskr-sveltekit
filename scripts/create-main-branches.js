#!/usr/bin/env node

// Script to create missing "main" branches for sessions
// This fixes the issue where messages reference "main" branch but no branch record exists

import { createClient } from '@supabase/supabase-js';

// You'll need to temporarily add your Supabase credentials here
// Get them from your environment variables or Supabase dashboard
const supabaseUrl = 'YOUR_SUPABASE_URL_HERE';
const supabaseServiceKey = 'YOUR_SUPABASE_SERVICE_KEY_HERE';

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('YOUR_')) {
  console.error('Please update the supabaseUrl and supabaseServiceKey in this script');
  console.error('Get the values from your environment variables or Supabase dashboard');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createMainBranches() {
  try {
    console.log('🔍 Finding sessions that need "main" branches...');
    
    // Get all conversation sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('conversation_sessions')
      .select('id, session_name, project_id');
      
    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return;
    }
    
    console.log(`Found ${sessions.length} sessions`);
    
    // Get existing branches
    const { data: existingBranches, error: branchesError } = await supabase
      .from('conversation_branches')
      .select('session_id, id, branch_name');
      
    if (branchesError) {
      console.error('Error fetching existing branches:', branchesError);
      return;
    }
    
    console.log(`Found ${existingBranches.length} existing branches`);
    
    // Find sessions that don't have a "main" branch
    const existingMainBranches = new Set(
      existingBranches
        .filter(b => b.branch_name === 'main' || b.id === 'main')
        .map(b => b.session_id)
    );
    
    const sessionsNeedingMainBranch = sessions.filter(
      session => !existingMainBranches.has(session.id)
    );
    
    console.log(`Found ${sessionsNeedingMainBranch.length} sessions needing "main" branches`);
    
    if (sessionsNeedingMainBranch.length === 0) {
      console.log('✅ All sessions already have main branches!');
      return;
    }
    
    // Create main branches for sessions that need them
    const branchesToCreate = sessionsNeedingMainBranch.map(session => ({
      id: 'main', // Use string ID to match message references
      session_id: session.id,
      branch_name: 'main',
      project_id: session.project_id,
      created_at: new Date().toISOString()
    }));
    
    console.log('Creating main branches:', branchesToCreate);
    
    const { data: createdBranches, error: createError } = await supabase
      .from('conversation_branches')
      .insert(branchesToCreate);
      
    if (createError) {
      console.error('Error creating branches:', createError);
      
      // Try creating them one by one to see which ones fail
      for (const branch of branchesToCreate) {
        const { data, error } = await supabase
          .from('conversation_branches')
          .insert([branch]);
          
        if (error) {
          console.error(`Failed to create branch for session ${branch.session_id}:`, error);
        } else {
          console.log(`✅ Created main branch for session ${branch.session_id}`);
        }
      }
    } else {
      console.log(`✅ Successfully created ${branchesToCreate.length} main branches!`);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createMainBranches();