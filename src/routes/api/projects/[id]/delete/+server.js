import { json } from '@sveltejs/kit';

export const POST = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = params;

  const { error } = await locals.db
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return json({ message: error.message }, { status: 500 });
  return json({ ok: true });
};
