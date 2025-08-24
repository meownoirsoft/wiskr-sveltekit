// src/lib/utils/avatars.js

/**
 * Get the avatar URL for a user based on their preferences
 * @param {Object} userPreferences - User preferences object
 * @param {string} userPreferences.avatar_type - Type: 'default', 'premade', 'custom'
 * @param {string|null} userPreferences.avatar_value - Avatar value (filename for premade, URL for custom)
 * @returns {string} - Avatar URL
 */
export function getUserAvatarUrl(userPreferences) {
  if (!userPreferences) {
    return '/avatars/default-ai.png'; // Fallback
  }

  const { avatar_type, avatar_value } = userPreferences;

  switch (avatar_type) {
    case 'premade':
      return avatar_value ? `/avatars/users/${avatar_value}` : '/avatars/default-ai.png';
    case 'custom':
      return avatar_value || '/avatars/default-ai.png';
    case 'default':
    default:
      return '/avatars/default-ai.png'; // Default user icon
  }
}
