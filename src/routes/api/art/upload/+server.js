import { json } from '@sveltejs/kit';
import { BUNNY_STORAGE_ZONE, BUNNY_PASSWORD, BUNNY_PULL_ZONE, BUNNY_API_KEY } from '$env/static/private';

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    
    // Get extension from file name or default to jpg
    let extension = 'jpg'; // Default to jpg
    if (file.name && file.name.includes('.')) {
      extension = file.name.split('.').pop().toLowerCase();
    } else if (file.type) {
      // Fallback to MIME type
      if (file.type.includes('png')) extension = 'png';
      else if (file.type.includes('gif')) extension = 'gif';
      else if (file.type.includes('webp')) extension = 'webp';
      // Default to jpg for jpeg and other types
    }
    
    const filename = `art-${timestamp}-${randomId}.${extension}`;
    
    console.log('🔍 Art upload:', { 
      originalName: file.name, 
      fileType: file.type, 
      extension, 
      filename 
    });
    
    // Upload to BunnyCDN
    const bunnyUrl = await uploadToBunnyCDN(file, filename);
    
    return json({ 
      url: bunnyUrl,
      filename: filename
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return json({ error: 'Upload failed' }, { status: 500 });
  }
}

async function uploadToBunnyCDN(file, filename) {
  // Use the same URL format as the working cURL command
  const uploadUrl = `https://la.storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filename}`;
  
  // Use the password (AccessKey) as shown in the working cURL
  const authHeader = BUNNY_PASSWORD;
  
  if (!authHeader) {
    throw new Error('No BunnyCDN authentication configured');
  }
  
  console.log('🔍 BunnyCDN upload attempt:', {
    uploadUrl,
    storageZone: BUNNY_STORAGE_ZONE,
    hasPassword: !!BUNNY_PASSWORD,
    authMethod: 'PASSWORD'
  });
  
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'AccessKey': authHeader,
      'Content-Type': 'application/octet-stream'
    },
    body: file
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('BunnyCDN upload failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      storageZone: BUNNY_STORAGE_ZONE,
      hasPassword: !!BUNNY_PASSWORD,
      authMethod: 'PASSWORD'
    });
    throw new Error(`BunnyCDN upload failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  // Return the CDN URL
  // If BUNNY_PULL_ZONE is already a full URL, use it as-is
  // Otherwise, construct the CDN URL
  if (BUNNY_PULL_ZONE.startsWith('http')) {
    return `${BUNNY_PULL_ZONE}/${filename}`;
  } else {
    return `https://${BUNNY_PULL_ZONE}.b-cdn.net/${filename}`;
  }
}
