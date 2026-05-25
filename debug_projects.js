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

async function debugProjects() {
  console.log('🔍 Debugging projects table...');
  
  try {
    // Try to get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Error getting user:', userError);
    } else if (!user) {
      console.log('👤 No authenticated user - this is expected for server-side scripts');
    } else {
      console.log('👤 Authenticated user:', user.id);
    }
    
    // Try to get projects without authentication (using service role)
    console.log('\n🔍 Trying to access projects table...');
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(10);
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
      console.error('Error details:', JSON.stringify(projectsError, null, 2));
    } else {
      console.log(`📁 Found ${projects?.length || 0} projects:`);
      if (projects && projects.length > 0) {
        projects.forEach(project => {
          console.log(`- ${project.name} (ID: ${project.id}, User: ${project.user_id})`);
        });
      } else {
        console.log('📭 No projects found');
      }
    }
    
    // Try to get messages
    console.log('\n🔍 Trying to access messages table...');
    
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(5);
    
    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError);
      console.error('Error details:', JSON.stringify(messagesError, null, 2));
    } else {
      console.log(`📨 Found ${messages?.length || 0} messages:`);
      if (messages && messages.length > 0) {
        messages.forEach(msg => {
          console.log(`- ${msg.role}: ${msg.content?.substring(0, 50)}... (Project: ${msg.project_id})`);
        });
      } else {
        console.log('📭 No messages found');
      }
    }
    
  } catch (err) {
    console.error('💥 Error:', err);
  }
}

debugProjects().catch(console.error);
