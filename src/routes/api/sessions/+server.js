import { json } from '@sveltejs/kit';

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function GET({ url, locals }) {
  try {
    // Verify user is authenticated
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = url.searchParams.get('projectId');
    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { supabase } = locals;

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Get all sessions for this project, ordered by most recent first
    const { data: sessions, error: sessionsError } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return json({ sessions: sessions || [] });
  } catch (error) {
    console.error('Sessions GET error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function POST({ request, locals }) {
  try {
    // Verify user is authenticated
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, projectId, sessionId, sessionName, isActive, topicSummary } = await request.json();

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { supabase } = locals;

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    switch (action) {
      case 'create': {
        if (!sessionName) {
          return json({ error: 'Session name is required' }, { status: 400 });
        }

        // Create new session
        const { data: session, error: createError } = await supabase
          .from('conversation_sessions')
          .insert({
            project_id: projectId,
            session_name: sessionName,
            session_date: new Date().toISOString().split('T')[0], // Today's date
            is_active: true,
            topic_summary: topicSummary || null
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating session:', createError);
          return json({ error: 'Failed to create session' }, { status: 500 });
        }

        // Create default 'main' branch for the new session
        const { error: branchError } = await supabase
          .from('conversation_branches')
          .insert({
            project_id: projectId,
            session_id: session.id,
            branch_id: 'main',
            branch_name: 'Main Branch',
            color_index: 0
          });

        if (branchError) {
          console.error('Error creating main branch for session:', branchError);
          // Don't fail the session creation, but log the error
        }

        return json({ session });
      }

      case 'update': {
        if (!sessionId) {
          return json({ error: 'Session ID is required for update' }, { status: 400 });
        }

        const updates = {};
        if (sessionName !== undefined) updates.session_name = sessionName;
        if (isActive !== undefined) updates.is_active = isActive;
        if (topicSummary !== undefined) updates.topic_summary = topicSummary;
        updates.updated_at = new Date().toISOString();

        const { data: session, error: updateError } = await supabase
          .from('conversation_sessions')
          .update(updates)
          .eq('id', sessionId)
          .eq('project_id', projectId) // Ensure user owns this session
          .select()
          .single();

        if (updateError) {
          console.error('Error updating session:', updateError);
          return json({ error: 'Failed to update session' }, { status: 500 });
        }

        return json({ session });
      }

      case 'delete': {
        if (!sessionId) {
          return json({ error: 'Session ID is required for delete' }, { status: 400 });
        }

        // Check if this is the only session for the project
        const { data: sessionCount } = await supabase
          .from('conversation_sessions')
          .select('id', { count: 'exact' })
          .eq('project_id', projectId);

        if (sessionCount && sessionCount.length <= 1) {
          return json({ error: 'Cannot delete the only session in a project' }, { status: 400 });
        }

        // Delete the session (cascading deletes will handle messages and branches)
        const { error: deleteError } = await supabase
          .from('conversation_sessions')
          .delete()
          .eq('id', sessionId)
          .eq('project_id', projectId); // Ensure user owns this session

        if (deleteError) {
          console.error('Error deleting session:', deleteError);
          return json({ error: 'Failed to delete session' }, { status: 500 });
        }

        return json({ success: true });
      }

      case 'activate': {
        if (!sessionId) {
          return json({ error: 'Session ID is required for activation' }, { status: 400 });
        }

        // Deactivate all other sessions in this project
        await supabase
          .from('conversation_sessions')
          .update({ is_active: false })
          .eq('project_id', projectId);

        // Activate the specified session
        const { data: session, error: activateError } = await supabase
          .from('conversation_sessions')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', sessionId)
          .eq('project_id', projectId)
          .select()
          .single();

        if (activateError) {
          console.error('Error activating session:', activateError);
          return json({ error: 'Failed to activate session' }, { status: 500 });
        }

        return json({ session });
      }

      case 'auto_create': {
        // Smart session creation based on conversation patterns
        // This will be called when the system detects a topic shift or daily boundary
        
        const lastMessage = await supabase
          .from('messages')
          .select('content, created_at, session_id')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!lastMessage.data) {
          return json({ error: 'No messages found to analyze' }, { status: 400 });
        }

        // Simple heuristic: Create new session if last message was more than 24 hours ago
        const lastMessageTime = new Date(lastMessage.data.created_at);
        const now = new Date();
        const hoursDiff = (now - lastMessageTime) / (1000 * 60 * 60);

        let shouldCreateNew = false;
        let suggestedName = '';

        if (hoursDiff > 24) {
          shouldCreateNew = true;
          suggestedName = `Session - ${now.toLocaleDateString()}`;
        } else {
          // For now, don't auto-create based on topic changes
          // This could be enhanced with AI topic detection
          return json({ 
            should_create: false, 
            reason: 'Recent activity in current session' 
          });
        }

        if (shouldCreateNew) {
          // Create the new session
          const { data: session, error: createError } = await supabase
            .from('conversation_sessions')
            .insert({
              project_id: projectId,
              session_name: suggestedName,
              session_date: now.toISOString().split('T')[0],
              is_active: true,
              topic_summary: 'Auto-created session'
            })
            .select()
            .single();

          if (createError) {
            console.error('Error auto-creating session:', createError);
            return json({ error: 'Failed to auto-create session' }, { status: 500 });
          }

          // Create default 'main' branch
          await supabase
            .from('conversation_branches')
            .insert({
              project_id: projectId,
              session_id: session.id,
              branch_id: 'main',
              branch_name: 'Main Branch',
              color_index: 0
            });

          // Deactivate previous sessions
          await supabase
            .from('conversation_sessions')
            .update({ is_active: false })
            .eq('project_id', projectId)
            .neq('id', session.id);

          return json({ 
            should_create: true, 
            session: session,
            reason: 'Time-based session boundary detected'
          });
        }

        return json({ should_create: false });
      }

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Sessions POST error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
