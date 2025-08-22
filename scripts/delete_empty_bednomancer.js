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

async function deleteEmptyBednomancer() {
  const projectId = '6a92cc18-08ed-4984-bb2d-2fb075b9dbe6'; // Current BEDNOMANCER project
  
  console.log('🗑️  Deleting empty BEDNOMANCER project to allow clean re-import...\n');

  try {
    // Verify this is indeed the empty project
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('project_id', projectId);

    if (messagesError) {
      console.error('❌ Error checking messages:', messagesError);
      return;
    }

    if (messages.length > 0) {
      console.error('❌ This project has messages! Aborting deletion for safety.');
      console.log(`   Found ${messages.length} messages in project. Will not delete.`);
      return;
    }

    console.log('✅ Confirmed project has 0 messages, safe to delete.');

    // Delete in proper order (children first, then parent)
    console.log('🗑️  Deleting conversation branches...');
    const { error: branchesError } = await supabase
      .from('conversation_branches')
      .delete()
      .eq('project_id', projectId);

    if (branchesError) {
      console.error('❌ Error deleting branches:', branchesError);
      return;
    }

    console.log('🗑️  Deleting conversation sessions...');
    const { error: sessionsError } = await supabase
      .from('conversation_sessions')
      .delete()
      .eq('project_id', projectId);

    if (sessionsError) {
      console.error('❌ Error deleting sessions:', sessionsError);
      return;
    }

    console.log('🗑️  Deleting facts...');
    const { error: factsError } = await supabase
      .from('facts')
      .delete()
      .eq('project_id', projectId);

    if (factsError) {
      console.error('❌ Error deleting facts:', factsError);
      return;
    }

    console.log('🗑️  Deleting docs...');
    const { error: docsError } = await supabase
      .from('docs')
      .delete()
      .eq('project_id', projectId);

    if (docsError) {
      console.error('❌ Error deleting docs:', docsError);
      return;
    }

    console.log('🗑️  Deleting questions...');
    const { error: questionsError } = await supabase
      .from('project_questions')
      .delete()
      .eq('project_id', projectId);

    if (questionsError) {
      console.error('❌ Error deleting questions:', questionsError);
      return;
    }

    console.log('🗑️  Deleting project...');
    const { error: projectError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (projectError) {
      console.error('❌ Error deleting project:', projectError);
      return;
    }

    console.log('✅ Empty BEDNOMANCER project deleted successfully!');
    console.log('🎯 You can now re-import the project and messages should come through.');

  } catch (error) {
    console.error('❌ Delete operation failed:', error);
  }
}

// Run the deletion
deleteEmptyBednomancer().then(() => {
  console.log('\n✅ Delete operation complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
