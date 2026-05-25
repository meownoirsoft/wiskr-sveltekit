import { json } from '@sveltejs/kit';
import { BUNNY_STORAGE_ZONE, BUNNY_PASSWORD, BUNNY_PULL_ZONE, BUNNY_API_KEY } from '$env/static/private';
import { processCardArt, getImageMetadata } from '$lib/server/utils/imageProcessor.js';

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Get original image metadata
    const originalMetadata = await getImageMetadata(file);
    console.log('🔍 Original image metadata:', {
      width: originalMetadata.width,
      height: originalMetadata.height,
      format: originalMetadata.format
    });
    
    // Process image: resize to 230x230 and convert to WebP
    const processedImageBuffer = await processCardArt(file, {
      width: 230,
      height: 230,
      quality: 85,
      format: 'webp'
    });
    
    // Generate unique filename (always WebP now)
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const filename = `art-${timestamp}-${randomId}.webp`;
    
    console.log('🔍 Art upload processed:', { 
      originalName: file.name, 
      originalType: file.type,
      originalSize: file.size,
      processedSize: processedImageBuffer.length,
      filename 
    });
    
    // Upload processed image to BunnyCDN
    const bunnyUrl = await uploadToBunnyCDN(processedImageBuffer, filename);
    
    return json({ 
      url: bunnyUrl,
      filename: filename
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return json({ error: 'Upload failed' }, { status: 500 });
  }
}

async function uploadToBunnyCDN(imageData, filename) {
  // Use the same URL format as the working cURL command
  const uploadUrl = `https://la.storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filename}`;
  
  // Use the password (AccessKey) as shown in the working cURL
  const authHeader = BUNNY_PASSWORD;
  
  if (!authHeader) {
    throw new Error('No BunnyCDN authentication configured');
  }
  
  // Determine content type based on file extension
  const contentType = filename.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';
  
  console.log('🔍 BunnyCDN upload attempt:', {
    uploadUrl,
    storageZone: BUNNY_STORAGE_ZONE,
    hasPassword: !!BUNNY_PASSWORD,
    authMethod: 'PASSWORD',
    contentType
  });
  
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'AccessKey': authHeader,
      'Content-Type': contentType
    },
    body: imageData
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
