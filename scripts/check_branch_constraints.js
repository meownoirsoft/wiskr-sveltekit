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

async function checkBranchConstraints() {
  console.log('🔍 Checking conversation_branches table schema and constraints...\n');

  try {
    // Check current branches to see the schema
    const { data: sampleBranches, error: branchesError } = await supabase
      .from('conversation_branches')
      .select('*')
      .limit(3);

    if (branchesError) {
      console.error('❌ Error fetching sample branches:', branchesError);
      return;
    }

    if (sampleBranches.length > 0) {
      console.log('📋 Sample branch record structure:');
      console.log(JSON.stringify(sampleBranches[0], null, 2));
      console.log('\n🔧 Available columns:');
      Object.keys(sampleBranches[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof sampleBranches[0][key]}`);
      });
    }

    // Check for duplicate branch names per session
    console.log('\n🔍 Checking for duplicate branch names per session...\n');
    
    const { data: duplicates, error: duplicatesError } = await supabase
      .rpc('check_duplicate_branch_names', {});

    if (duplicatesError) {
      // If the function doesn't exist, do a manual check
      console.log('📊 Manual check for duplicate branch names:');
      
      const { data: branches, error: allBranchesError } = await supabase
        .from('conversation_branches')
        .select('session_id, branch_name')
        .not('session_id', 'is', null);

      if (allBranchesError) {
        console.error('❌ Error fetching all branches:', allBranchesError);
        return;
      }

      // Group by session and branch name to find duplicates
      const branchCounts = {};
      branches.forEach(branch => {
        const key = `${branch.session_id}::${branch.branch_name}`;
        branchCounts[key] = (branchCounts[key] || 0) + 1;
      });

      const duplicateKeys = Object.keys(branchCounts).filter(key => branchCounts[key] > 1);
      
      if (duplicateKeys.length > 0) {
        console.log(`⚠️  Found ${duplicateKeys.length} duplicate branch names:`);
        duplicateKeys.forEach(key => {
          const [sessionId, branchName] = key.split('::');
          console.log(`   - "${branchName}" in session ${sessionId} (${branchCounts[key]} times)`);
        });
      } else {
        console.log('✅ No duplicate branch names found per session');
      }
    }

    // Check current BEDNOMANCER project branches
    console.log('\n🎯 Current BEDNOMANCER project branches:');
    const { data: bednoMancerBranches, error: bednoError } = await supabase
      .from('conversation_branches')
      .select('id, session_id, branch_id, branch_name, project_id')
      .eq('project_id', '6a92cc18-08ed-4984-bb2d-2fb075b9dbe6')
      .order('created_at');

    if (bednoError) {
      console.error('❌ Error fetching BEDNOMANCER branches:', bednoError);
    } else {
      bednoMancerBranches.forEach((branch, idx) => {
        console.log(`   ${idx + 1}. "${branch.branch_name}" (${branch.branch_id})`);
        console.log(`      session: ${branch.session_id}`);
      });
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

// Run the check
checkBranchConstraints().then(() => {
  console.log('\n✅ Schema check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
