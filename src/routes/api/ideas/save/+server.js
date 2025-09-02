// src/routes/api/ideas/save/+server.js
import { json } from '@sveltejs/kit';

export const POST = async ({ request, locals }) => {
  try {
    // Verify user is authenticated
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, ideas } = await request.json();
    
    if (!projectId || !ideas || !Array.isArray(ideas)) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { supabase } = locals;
    const savedIdeas = [];

    // Save each idea to the database
    for (const idea of ideas) {
      const { data: savedIdea, error } = await supabase
        .from('ideas')
        .insert({
          project_id: projectId,
          title: idea.title || idea.text || 'Untitled Idea',
          description: idea.description || idea.text || '',
          text: idea.text || idea.title || idea.description || '',
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving idea:', error);
        continue; // Skip this idea but continue with others
      }

      savedIdeas.push(savedIdea);
    }

    console.log(`🔍 Ideas API: Saved ${savedIdeas.length} ideas to database for project ${projectId}`);

    return json({ 
      success: true, 
      savedIdeas,
      count: savedIdeas.length 
    });

  } catch (error) {
    console.error('Ideas API error:', error);
    return json({ error: 'Failed to save ideas' }, { status: 500 });
  }
};
