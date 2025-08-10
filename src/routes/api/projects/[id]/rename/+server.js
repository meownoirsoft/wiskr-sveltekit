import { json } from '@sveltejs/kit';

export const POST = async ({ params, request, locals }) => {
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const { name } = await request.json();
  if (!name?.trim()) return json({ message: 'Name required' }, { status: 400 });

  const { data, error } = await locals.supabase
    .from('projects')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', user.id)     // belt-and-suspenders along with RLS
    .select('id, name, icon, color, brief_text, created_at')
    .single();

  if (error) return json({ message: error.message }, { status: 500 });
  return json({ project: data });
};
