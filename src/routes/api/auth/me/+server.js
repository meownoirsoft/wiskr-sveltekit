import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
  const user = locals.user;
  if (!user) {
    return json({ user: null }, { status: 401 });
  }
  return json({
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    }
  });
}
