#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMessages() {
  console.log('🔍 Debugging messages table...');
  
  try {
    // Get all messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching messages:', error);
      return;
    }
    
    console.log(`📊 Found ${messages?.length || 0} recent messages:`);
    
    if (messages && messages.length > 0) {
      messages.forEach((msg, index) => {
        console.log(`${index + 1}. ID: ${msg.id}`);
        console.log(`   Project ID: ${msg.project_id}`);
        console.log(`   Branch ID: ${msg.branch_id}`);
        console.log(`   Session ID: ${msg.session_id}`);
        console.log(`   Role: ${msg.role}`);
        console.log(`   Content: ${msg.content?.substring(0, 100)}...`);
        console.log(`   Created: ${msg.created_at}`);
        console.log('---');
      });
    } else {
      console.log('📭 No messages found in the database');
    }
    
    // Check projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
    } else {
      console.log(`\n📁 Found ${projects?.length || 0} projects:`);
      projects?.forEach(project => {
        console.log(`- ${project.name} (ID: ${project.id})`);
      });
    }
    
  } catch (err) {
    console.error('💥 Error:', err);
  }
}

debugMessages().catch(console.error);
