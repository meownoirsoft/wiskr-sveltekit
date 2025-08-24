import { json } from '@sveltejs/kit';
import { generateSessionTitle, autoUpdateSessionTitle } from '$lib/server/services/autoTitling.js';

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

    const { action, sessionId, projectId, customTitle, modelKey = 'speed' } = await request.json();

    if (!sessionId || !projectId) {
      return json({ error: 'Session ID and Project ID are required' }, { status: 400 });
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

    // Verify user has access to this session
    const { data: session, error: sessionError } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('project_id', projectId)
      .single();

    if (sessionError || !session) {
      return json({ error: 'Session not found or access denied' }, { status: 404 });
    }

    switch (action) {
      case 'generate': {
        // Auto-generate a title based on conversation content
        const newTitle = await autoUpdateSessionTitle(sessionId, projectId, supabase, modelKey);
        
        if (!newTitle) {
          return json({ 
            success: false, 
            message: 'Title generation not needed or failed',
            currentTitle: session.session_name 
          });
        }

        return json({ 
          success: true, 
          title: newTitle,
          message: 'Title generated successfully' 
        });
      }

      case 'regenerate': {
        // Force regenerate title even if it's already custom
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('role, content, created_at')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (messagesError) {
          return json({ error: 'Failed to fetch messages' }, { status: 500 });
        }

        const newTitle = await generateSessionTitle(messages || [], modelKey);
        
        // Update session with new title
        const { error: updateError } = await supabase
          .from('conversation_sessions')
          .update({ 
            session_name: newTitle,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (updateError) {
          return json({ error: 'Failed to update session title' }, { status: 500 });
        }

        return json({ 
          success: true, 
          title: newTitle,
          message: 'Title regenerated successfully' 
        });
      }

      case 'update': {
        // Manually update title to custom value
        if (!customTitle || customTitle.trim().length === 0) {
          return json({ error: 'Custom title is required' }, { status: 400 });
        }

        const trimmedTitle = customTitle.trim();
        if (trimmedTitle.length > 100) {
          return json({ error: 'Title too long (max 100 characters)' }, { status: 400 });
        }

        const { error: updateError } = await supabase
          .from('conversation_sessions')
          .update({ 
            session_name: trimmedTitle,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (updateError) {
          return json({ error: 'Failed to update session title' }, { status: 500 });
        }

        return json({ 
          success: true, 
          title: trimmedTitle,
          message: 'Title updated successfully' 
        });
      }

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Session title API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const sessionId = url.searchParams.get('sessionId');
    const projectId = url.searchParams.get('projectId');

    if (!sessionId || !projectId) {
      return json({ error: 'Session ID and Project ID are required' }, { status: 400 });
    }

    const { supabase } = locals;

    // Get session with title info
    const { data: session, error: sessionError } = await supabase
      .from('conversation_sessions')
      .select('id, session_name, created_at, updated_at, message_count')
      .eq('id', sessionId)
      .eq('project_id', projectId)
      .single();

    if (sessionError || !session) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if title appears to be auto-generated or custom
    const genericTitles = ['New Session', 'General Discussion', 'New Chat', 'First Chat'];
    const isGeneric = genericTitles.includes(session.session_name);

    return json({
      sessionId: session.id,
      title: session.session_name,
      isGeneric,
      messageCount: session.message_count,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    });
  } catch (error) {
    console.error('Session title GET error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
