// src/routes/projects/+page.server.js
export const load = async ({ locals }) => {
  // locals.supabase + locals.user should be set in your hooks.server.js (@supabase/ssr)
  const { data: { user } } = await locals.supabase.auth.getUser();

  if (!user) {
    // Not signed in — render page with empty list (or redirect if you prefer)
    return { projects: [] };
    // or: throw redirect(302, '/login')
  }

  const { data: projects, error } = await locals.supabase
    .from('projects')
    .select('id, name, icon, color, brief_text, created_at')
    .order('created_at');

  if (error) {
    console.error('projects load error', error);
    return { projects: [] };
  }

  return { projects: projects ?? [] };
};
