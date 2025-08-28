// src/routes/projects/+page.server.js
import { redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth/admin.js';

export const load = async ({ locals }) => {
  // locals.supabase + locals.user should be set in your hooks.server.js (@supabase/ssr)
  const { data: { user } } = await locals.supabase.auth.getUser();

  if (!user) {
    // Redirect to login if not authenticated
    throw redirect(302, '/login');
  }

  const { data: projects, error } = await locals.supabase
    .from('projects')
    .select('id, name, icon, color, brief_text, description, created_at')
    .order('created_at');

  if (error) {
    console.error('projects load error', error);
    return { projects: [] };
  }

  let finalProjects = projects ?? [];

  // If user has no projects, create a default "My First Project" on the server side
  if (finalProjects.length === 0) {
    console.log('🆕 New user detected on server, creating default project for:', user.email);
    
    try {
      // First, ensure user has a persona (required for project creation)
      let { data: persona } = await locals.supabase
        .from('personas')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);
      
      if (!persona || persona.length === 0) {
        console.log('📝 Creating default persona for new user');
        const style_json = {
          tone: 'chaotic-hype', 
          emoji_level: 'med', 
          sentence_length: 'short',
          do: ['celebrate small wins', 'offer 3 options'], 
          dont: ['guilt', 'walls of text']
        };
        
        const { data: newPersona, error: personaError } = await locals.supabase
          .from('personas')
          .insert({ user_id: user.id, name: 'Default', style_json })
          .select('*')
          .single();
          
        if (personaError) {
          console.error('❌ Error creating persona:', personaError);
          return { projects: [] };
        }
        
        persona = [newPersona];
      }
      
      // Create the default project
      const { data: newProject, error: projectError } = await locals.supabase
        .from('projects')
        .insert({
          user_id: user.id,
          persona_id: persona[0].id,
          name: 'My First Project',
          icon: '📁',
          color: '#6366f1',
          description: 'Welcome to Wiskr! This is your first project to get you started.'
        })
        .select('id, name, icon, color, brief_text, description, created_at')
        .single();
        
      if (projectError) {
        console.error('❌ Error creating default project:', projectError);
        return { projects: [] };
      }
      
      console.log('✅ Created default project for new user:', newProject.name);
      
      // Create a main chat session for the new project
      const { data: newSession, error: sessionError } = await locals.supabase
        .from('conversation_sessions')
        .insert({
          project_id: newProject.id,
          session_name: 'Main Chat',
          session_date: new Date().toISOString().split('T')[0], // Today's date
          is_active: true,
          topic_summary: 'Your main conversation with Wiskrs'
        })
        .select('id')
        .single();
        
      if (sessionError) {
        console.error('❌ Error creating main chat session:', sessionError);
        console.error('❌ Session error details:', sessionError);
      } else {
        console.log('✅ Created main chat session for new project:', newSession.id);
        
        // Create a main conversation branch for the session
        const { data: newBranch, error: branchError } = await locals.supabase
          .from('conversation_branches')
          .insert({
            project_id: newProject.id,
            session_id: newSession.id,
            branch_id: 'main',
            branch_name: 'Main Branch', // Match client-side naming
            color_index: 0
          });
          
        if (branchError) {
          console.error('❌ Error creating main conversation branch:', branchError);
          console.error('❌ Branch error details:', branchError);
        } else {
          console.log('✅ Created main conversation branch for new session:', newBranch);
        }
      }
      
      finalProjects = [newProject];
      
    } catch (error) {
      console.error('❌ Error in new user project creation:', error);
      return { projects: [] };
    }
  }

  // Check if user has admin permissions
  const adminCheck = await isAdmin(locals.supabase, user);

  return { 
    projects: finalProjects,
    user,
    isAdmin: adminCheck.isAdmin
  };
};
