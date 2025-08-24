// src/routes/api/upload-avatar/+server.js
import { json } from '@sveltejs/kit';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  // Check authentication
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('avatar');

    if (!file || !(file instanceof File)) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      return json({ error: 'File size must be less than 2MB' }, { status: 400 });
    }

    // Create unique filename
    const extension = path.extname(file.name) || '.png';
    const filename = `${user.id}-${crypto.randomUUID()}${extension}`;
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'static', 'avatars', 'uploads');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file
    const filepath = path.join(uploadsDir, filename);
    const buffer = await file.arrayBuffer();
    await writeFile(filepath, new Uint8Array(buffer));

    // Return the URL path (relative to static folder)
    const url = `/avatars/uploads/${filename}`;
    
    return json({ 
      success: true, 
      url: url,
      filename: filename 
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    return json({ error: 'Upload failed' }, { status: 500 });
  }
}
