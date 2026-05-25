import sharp from 'sharp';

/**
 * Process and optimize an image for card art
 * @param {Buffer|Blob} imageData - The image data to process
 * @param {Object} options - Processing options
 * @param {number} options.width - Target width (default: 230)
 * @param {number} options.height - Target height (default: 230)
 * @param {number} options.quality - WebP quality (default: 85)
 * @param {string} options.format - Output format (default: 'webp')
 * @returns {Promise<Buffer>} Processed image buffer
 */
export async function processCardArt(imageData, options = {}) {
  const {
    width = 230,
    height = 230,
    quality = 85,
    format = 'webp'
  } = options;

  try {
    // Convert Blob to Buffer if needed
    let imageBuffer;
    if (imageData instanceof Blob) {
      const arrayBuffer = await imageData.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      imageBuffer = imageData;
    }

    // Process the image with Sharp
    const processedImage = await sharp(imageBuffer)
      .resize(width, height, {
        fit: 'cover', // Crop to fit dimensions while maintaining aspect ratio
        position: 'center' // Center the crop
      })
      .webp({
        quality: quality,
        effort: 6 // Higher effort for better compression
      })
      .toBuffer();

    console.log(`🖼️ Processed image: ${width}x${height} WebP, ${processedImage.length} bytes`);
    
    return processedImage;
  } catch (error) {
    console.error('❌ Image processing failed:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * Get image metadata
 * @param {Buffer|Blob} imageData - The image data
 * @returns {Promise<Object>} Image metadata
 */
export async function getImageMetadata(imageData) {
  try {
    let imageBuffer;
    if (imageData instanceof Blob) {
      const arrayBuffer = await imageData.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      imageBuffer = imageData;
    }

    const metadata = await sharp(imageBuffer).metadata();
    return metadata;
  } catch (error) {
    console.error('❌ Failed to get image metadata:', error);
    throw new Error(`Failed to get image metadata: ${error.message}`);
  }
}
