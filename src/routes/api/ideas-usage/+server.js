// src/routes/api/ideas-usage/+server.js
import { json } from '@sveltejs/kit';
import { DateTime } from 'luxon';
import { getRelatedIdeasLimit, canGenerateIdeas, getRemainingIdeas } from '$lib/config/tiers.js';
import { getUserTier } from '$lib/utils/tiers.js';

export const GET = async ({ url, locals }) => {
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // Get timezone from query parameter, default to UTC
  const tz = url.searchParams.get('tz') || 'UTC';

  // Get user tier for rate limiting
  const userTier = getUserTier({
    tier: locals.userTier || 0,
    trial_ends_at: locals.trialEndsAt
  });
  const ideasLimit = getRelatedIdeasLimit(userTier);
  
  // Check daily Related Ideas usage - use user's timezone for proper day boundary
  const startOfToday = DateTime.now().setZone(tz).startOf('day').toUTC().toISO();
  const { data: todayIdeas } = await locals.supabase
    .from('usage_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('model', 'related-ideas')
    .gte('created_at', startOfToday);
    
  const ideasUsedToday = todayIdeas?.length || 0;
  
  return json({
    used: ideasUsedToday,
    limit: ideasLimit,
    remaining: getRemainingIdeas(userTier, ideasUsedToday),
    canGenerate: canGenerateIdeas(userTier, ideasUsedToday),
    tier: userTier
  });
};
