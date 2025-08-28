// src/routes/api/projects/create/+server.js
import { json } from '@sveltejs/kit';
import { canCreateProject, getTierConfig } from '$lib/tiers.js';

export const POST = async ({ request, locals }) => {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ message: 'Unauthorized' }, { status: 401 });

    const { name, icon = '📁', color = '#6366f1', brief_text = '', description = '' } = await request.json();
    if (!name?.trim()) return json({ message: 'Name required' }, { status: 400 });

    // Get user tier info from locals (set in hooks.server.js)
    const effectiveTier = locals.effectiveTier || 0;
    
    // Check current project count
    const { count: projectCount, error: countError } = await locals.supabase
      .from('projects')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id);
      
    if (countError) {
      console.error('Error counting projects:', countError);
      return json({ message: 'Failed to check project limits' }, { status: 500 });
    }
    
    // Check if user can create another project
    const projectCheck = canCreateProject(effectiveTier, projectCount);
    if (!projectCheck.canCreate) {
      const tierConfig = getTierConfig(effectiveTier);
      return json({
        message: projectCheck.reason,
        error: 'PROJECT_LIMIT_EXCEEDED',
        tierName: tierConfig.name,
        maxProjects: tierConfig.maxProjects,
        currentProjects: projectCount
      }, { status: 403 });
    }

    // persona: get or create
    let { data: persona } = await locals.supabase
      .from('personas').select('*')
      .eq('user_id', user.id).limit(1);
    persona = persona?.[0];
    if (!persona) {
      const style_json = {
        tone: 'chaotic-hype', emoji_level: 'med', sentence_length: 'short',
        do: ['celebrate small wins', 'offer 3 options'], dont: ['guilt', 'walls of text']
      };
      const ret = await locals.supabase
        .from('personas')
        .insert({ user_id: user.id, name: 'Default', style_json })
        .select('*').single();
      if (ret.error) return json({ message: ret.error.message }, { status: 500 });
      persona = ret.data;
    }

    const { data: project, error: pErr } = await locals.supabase
      .from('projects')
      .insert({ user_id: user.id, persona_id: persona.id, name: name.trim(), icon, color, brief_text, description: description.trim() })
      .select('id, name, icon, color, brief_text, description, created_at')
      .single();

    if (pErr) return json({ message: pErr.message }, { status: 500 });

    return json({ project });
  } catch (e) {
    console.error(e);
    return json({ message: 'Unexpected error' }, { status: 500 });
  }
};
