import { DateTime } from 'luxon';

export const GET = async ({ url, locals }) => {
  const projectId = url.searchParams.get('projectId');
  const tz = url.searchParams.get('tz') || 'UTC';

  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user || !projectId) return new Response('Bad Request', { status: 400 });

  // Get today's boundary
  const now = DateTime.now().setZone(tz);
  const startOfToday = now.startOf('day').toUTC().toISO();

  console.log('Debug info:', {
    userId: user.id,
    projectId,
    tz,
    startOfToday,
    nowISO: now.toISO()
  });

  // Get all usage logs for today
  const { data: todayLogs, error } = await locals.supabase
    .from('usage_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .gte('created_at', startOfToday)
    .order('created_at', { ascending: false });

  console.log('Today logs:', { count: todayLogs?.length, error, logs: todayLogs });

  // Calculate totals
  const totals = (todayLogs ?? []).reduce(
    (acc, r) => {
      acc.in += r.tokens_in || 0;
      acc.out += r.tokens_out || 0;
      acc.cost += Number(r.cost_usd || 0);
      return acc;
    },
    { in: 0, out: 0, cost: 0 }
  );

  return new Response(JSON.stringify({
    debug: {
      userId: user.id,
      projectId,
      tz,
      startOfToday,
      nowISO: now.toISO()
    },
    logsCount: todayLogs?.length || 0,
    error,
    totals,
    logs: todayLogs
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
};
