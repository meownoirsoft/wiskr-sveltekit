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

async function fixBranchName() {
  console.log('🔧 Fixing branch name from generic format to proper name...\n');

  try {
    // Find branches with the generic naming pattern
    const { data: branches, error: branchesError } = await supabase
      .from('conversation_branches')
      .select('id, branch_id, branch_name, session_id')
      .like('branch_name', 'Branch branch_%');

    if (branchesError) {
      console.error('❌ Error fetching branches:', branchesError);
      return;
    }

    console.log(`🔍 Found ${branches.length} branches with generic names`);

    for (const branch of branches) {
      console.log(`\n🎯 Branch: "${branch.branch_name}" (ID: ${branch.branch_id})`);
      
      // The branch ID contains the original branch identifier
      if (branch.branch_id.includes('1754850898916_npof4f228')) {
        const newName = 'Location Name Options';
        console.log(`   ✏️  Updating to: "${newName}"`);
        
        const { error: updateError } = await supabase
          .from('conversation_branches')
          .update({ branch_name: newName })
          .eq('id', branch.id);

        if (updateError) {
          console.error('   ❌ Error updating branch name:', updateError);
        } else {
          console.log('   ✅ Branch name updated successfully');
        }
      } else {
        console.log('   ⏭️  Unknown branch pattern, skipping');
      }
    }

  } catch (error) {
    console.error('❌ Fix operation failed:', error);
  }
}

// Run the fix
fixBranchName().then(() => {
  console.log('\n✅ Branch name fix complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
