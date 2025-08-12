import { DateTime } from 'luxon';

export const GET = async ({ url, locals }) => {
  const projectId = url.searchParams.get('projectId');
  const tz = url.searchParams.get('tz') || 'UTC';

  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Bad Request', { status: 400 });

  // Boundaries in the user's timezone, then converted to UTC for querying
  const now = DateTime.now().setZone(tz);

  const startOfToday  = now.startOf('day').toUTC().toISO();
  const startOfWeek   = now.startOf('day').minus({ days: 6 }).toUTC().toISO();   // last 7 days incl. today
  const startOfMonth  = now.startOf('month').toUTC().toISO();

  const sumRows = (rows) => (rows ?? []).reduce(
    (acc, r) => {
      acc.in   += r.tokens_in  || 0;
      acc.out  += r.tokens_out || 0;
      acc.cost += Number(r.cost_usd || 0);
      return acc;
    },
    { in: 0, out: 0, cost: 0 }
  );

  const [todayRes, weekRes, monthRes] = await Promise.all([
    locals.supabase.from('usage_logs')
      .select('tokens_in,tokens_out,cost_usd,created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfToday),

    locals.supabase.from('usage_logs')
      .select('tokens_in,tokens_out,cost_usd,created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfWeek),

    locals.supabase.from('usage_logs')
      .select('tokens_in,tokens_out,cost_usd,created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth)
  ]);

  // Debug logging
  // console.log('Usage Summary Debug:', {
  //   projectId,
  //   userId: user.id,
  //   tz,
  //   startOfToday,
  //   todayRowsCount: todayRes.data?.length || 0,
  //   todayRawData: todayRes.data,
  //   todayError: todayRes.error
  // });

  const today = sumRows(todayRes.data);
  const week  = sumRows(weekRes.data);
  const month = sumRows(monthRes.data);

  // console.log('Usage Summary Totals:', { today, week, month });

  return new Response(JSON.stringify({ today, week, month, tz }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
