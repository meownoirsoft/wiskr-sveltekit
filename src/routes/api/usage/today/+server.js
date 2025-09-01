export const GET = async ({ url, locals }) => {
  const projectId = url.searchParams.get('projectId');
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user || !projectId) return new Response('Bad Request', { status: 400 });

  // start of “today” in the user’s local time is tricky; use UTC midnight for now
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  const { data, error } = await locals.supabase
    .from('usage_logs')
    .select('tokens_in,tokens_out,cost_usd')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .gte('created_at', todayUTC.toISOString());

  if (error) return new Response('Error', { status: 500 });

  const totals = (data ?? []).reduce(
    (acc, r) => {
      acc.in += r.tokens_in || 0;
      acc.out += r.tokens_out || 0;
      acc.cost += Number(r.cost_usd || 0);
      return acc;
    },
    { in: 0, out: 0, cost: 0 }
  );

  return new Response(JSON.stringify(totals), {
    headers: { 'Content-Type': 'application/json' }
  });
};
