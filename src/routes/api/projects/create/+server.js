// src/routes/api/projects/create/+server.js
import { json } from '@sveltejs/kit';

export const POST = async ({ request, locals }) => {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) return json({ message: 'Unauthorized' }, { status: 401 });

    const { name, icon = '📁', color = '#6366f1', brief_text = '', description = '' } = await request.json();
    if (!name?.trim()) return json({ message: 'Name required' }, { status: 400 });

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
