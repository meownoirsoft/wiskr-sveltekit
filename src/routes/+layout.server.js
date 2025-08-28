// src/routes/+layout.server.js
export const load = async ({ locals }) => {
  return {
    user: locals.user,
    userTier: locals.userTier || 0,
    effectiveTier: locals.effectiveTier || 0,
    trialEndsAt: locals.trialEndsAt || null
  };
};
