import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
  try {
    // Get all PNG files from the avatars directory
    const avatarsDir = path.join(process.cwd(), 'static', 'avatars', 'users');
    const files = fs.readdirSync(avatarsDir)
      .filter(file => file.endsWith('.png'))
      .map(file => ({
        file,
        name: fileToDisplayName(file)
      }));

    return json(files);
  } catch (error) {
    console.error('Error listing avatars:', error);
    return json({ error: 'Failed to list avatars' }, { status: 500 });
  }
}

// Helper function to convert filename to display name
function fileToDisplayName(filename) {
  // Remove extension
  const nameWithoutExt = filename.replace('.png', '');
  
  // Split on dashes/underscores and capitalize each word
  return nameWithoutExt
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
