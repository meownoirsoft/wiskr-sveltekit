#!/usr/bin/env node

/**
 * Cleanup script to remove old Wizard's Council messages with timestamp-based branch IDs
 * This will allow the new consistent branch ID system to work properly
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
function loadEnv() {
  try {
    const envContent = readFileSync('.env', 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
          process.env[key] = value;
        }
      }
    }
  } catch (error) {
    console.error('Warning: Could not load .env file:', error.message);
  }
}

loadEnv();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupWizardMessages() {
  console.log('🧹 Starting cleanup of old Wizard\'s Council messages...');
  
  try {
    // Find all messages with timestamp-based branch IDs (old format)
    const { data: oldMessages, error: fetchError } = await supabase
      .from('messages')
      .select('id, branch_id, content, created_at')
      .like('branch_id', 'branch_%')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ Error fetching messages:', fetchError);
      return;
    }
    
    console.log(`📊 Found ${oldMessages?.length || 0} messages with old timestamp-based branch IDs`);
    
    if (!oldMessages || oldMessages.length === 0) {
      console.log('✅ No old messages found to clean up');
      return;
    }
    
    // Show some examples
    console.log('\n📋 Sample old messages:');
    oldMessages.slice(0, 5).forEach((msg, i) => {
      console.log(`${i + 1}. Branch ID: ${msg.branch_id}`);
      console.log(`   Content: ${msg.content?.substring(0, 100)}...`);
      console.log(`   Created: ${msg.created_at}`);
      console.log('');
    });
    
    // Delete all old messages
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .like('branch_id', 'branch_%');
    
    if (deleteError) {
      console.error('❌ Error deleting messages:', deleteError);
      return;
    }
    
    console.log(`✅ Successfully deleted ${oldMessages.length} old messages`);
    
    // Also clean up any old branch records
    const { error: branchDeleteError } = await supabase
      .from('conversation_branches')
      .delete()
      .like('branch_id', 'branch_%');
    
    if (branchDeleteError) {
      console.error('⚠️  Warning: Error deleting old branch records:', branchDeleteError);
    } else {
      console.log('✅ Also cleaned up old branch records');
    }
    
    console.log('\n🎉 Cleanup complete! The Wizard\'s Council should now work with consistent branch IDs.');
    console.log('💡 Each card will now get its own unique, consistent branch ID like: branch-{card-id}');
    
  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error);
  }
}

// Run the cleanup
cleanupWizardMessages();
