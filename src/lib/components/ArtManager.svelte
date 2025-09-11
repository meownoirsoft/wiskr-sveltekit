<!-- ArtManager.svelte - Handles art upload, cropping, and AI generation -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { Upload, Wand2, X, Crop, Download, RotateCw, Flag } from 'lucide-svelte';
  import ArtFeedbackModal from './modals/ArtFeedbackModal.svelte';

  export let isOpen = false;
  export let card = null;
  export let currentArtUrl = '';

  const dispatch = createEventDispatcher();

  let selectedFile = null;
  let previewUrl = '';
  let isGenerating = false;
  let isUploading = false;
  let cropMode = false;
  let cropData = { x: 0, y: 0, width: 100, height: 100 };
  let generatedArtUrl = '';
  let showFeedbackModal = false;
  let feedbackArtUrl = '';

  // Reset state when modal opens
  $: if (isOpen) {
    selectedFile = null;
    previewUrl = '';
    isGenerating = false;
    isUploading = false;
    cropMode = false;
    generatedArtUrl = '';
  }

  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      selectedFile = file;
      previewUrl = URL.createObjectURL(file);
      cropMode = true;
    }
  }

  function handleCrop() {
    // For now, we'll use the full image
    // In a real implementation, you'd use a cropping library like react-image-crop
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 400; // Card art width
      canvas.height = 240; // Card art height (16:10 ratio)
      
      // Calculate crop area
      const scaleX = img.width / 100;
      const scaleY = img.height / 100;
      const sourceX = cropData.x * scaleX;
      const sourceY = cropData.y * scaleY;
      const sourceWidth = cropData.width * scaleX;
      const sourceHeight = cropData.height * scaleY;
      
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, 400, 240
      );
      
      canvas.toBlob((blob) => {
        // Create a proper filename with .jpg extension
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const filename = `art-${timestamp}-${randomId}.jpg`;
        uploadArt(blob, filename);
      }, 'image/jpeg', 0.9);
    };
    
    img.src = previewUrl;
  }

  async function uploadArt(blob, filename = null) {
    isUploading = true;
    try {
      // Upload to BunnyCDN
      const formData = new FormData();
      
      // If we have a filename, create a File object with proper name
      if (filename) {
        const file = new File([blob], filename, { type: 'image/jpeg' });
        formData.append('file', file);
      } else {
        formData.append('file', blob);
      }
      
      const response = await fetch('/api/art/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const { url } = await response.json();
      console.log('🔍 ArtManager dispatching art-selected for upload:', url);
      dispatch('art-selected', { artUrl: url, source: 'upload' });
      closeModal();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      isUploading = false;
    }
  }

  async function generateAIArt() {
    if (!card) return;
    
    isGenerating = true;
    try {
      const response = await fetch('/api/art/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardTitle: card.title,
          cardContent: card.content,
          cardTags: card.tags || [],
          rarity: card.rarity
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate art');
      }

      const data = await response.json();
      generatedArtUrl = data.artUrl;
      
      console.log('🔍 ArtManager dispatching art-selected for AI:', data.artUrl, 'model:', data.model);
      // Auto-apply the generated art
      dispatch('art-selected', { artUrl: data.artUrl, source: 'ai', model: data.model });
      closeModal();
    } catch (error) {
      console.error('AI art generation failed:', error);
      alert('AI art generation failed. Please try again.');
    } finally {
      isGenerating = false;
    }
  }

  function closeModal() {
    dispatch('close');
  }

  function removeArt() {
    dispatch('art-selected', { artUrl: null, source: 'remove' });
    closeModal();
  }

  function reportBadArt(artUrl) {
    feedbackArtUrl = artUrl;
    showFeedbackModal = true;
  }

  async function handleFeedbackSubmit(event) {
    const { artUrl, cardId, reason, details } = event.detail;
    
    try {
      const response = await fetch('/api/art/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artUrl,
          cardId,
          reason,
          details
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      alert('Thank you for your feedback! This helps us improve art generation.');
      showFeedbackModal = false;
    } catch (error) {
      console.error('Feedback submission failed:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  }

  function closeFeedbackModal() {
    showFeedbackModal = false;
    feedbackArtUrl = '';
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
      
      <!-- Header -->
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Card Art Manager</h2>
          <button 
            on:click={closeModal}
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size="24" />
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        
        <!-- Current Art Preview -->
        {#if currentArtUrl}
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Art</h3>
            <div class="relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img src={currentArtUrl} alt="Current art" class="w-full h-full object-cover" />
            </div>
            <div class="flex gap-2 mt-2">
              <button
                on:click={removeArt}
                class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove Art
              </button>
              <button
                on:click={() => reportBadArt(currentArtUrl)}
                class="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1"
              >
                <Flag size="12" />
                Report Issue
              </button>
            </div>
          </div>
        {/if}

        <!-- Upload and AI Generation Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          <!-- Upload Section -->
          <div>
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Upload Your Own Art</h3>
            
            <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                on:change={handleFileSelect}
                class="hidden"
                id="art-upload"
              />
              <label for="art-upload" class="cursor-pointer">
                <Upload size="24" class="mx-auto text-gray-400 mb-2" />
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Click to upload an image
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  PNG, JPG, GIF up to 10MB
                </p>
              </label>
            </div>

            <!-- Crop Preview -->
            {#if cropMode && previewUrl}
              <div class="mt-4">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Crop Your Image</h4>
                <div class="relative w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <img src={previewUrl} alt="Crop preview" class="w-full h-full object-contain" />
                </div>
                <div class="flex gap-2 mt-3">
                  <button
                    on:click={handleCrop}
                    disabled={isUploading}
                    class="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
                  >
                    <Crop size="14" />
                    {isUploading ? 'Uploading...' : 'Apply Crop'}
                  </button>
                  <button
                    on:click={() => { cropMode = false; previewUrl = ''; selectedFile = null; }}
                    class="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            {/if}
          </div>

          <!-- AI Generation Section -->
          <div>
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">AI Generated Art</h3>
            
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Wand2 size="16" class="text-white" />
                </div>
                <div>
                  <h4 class="font-medium text-gray-900 dark:text-white text-sm">Generate with AI</h4>
                  <p class="text-xs text-gray-600 dark:text-gray-400">
                    Based on card content and rarity
                  </p>
                </div>
              </div>
              
              <button
                on:click={generateAIArt}
                disabled={isGenerating}
                class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all text-sm"
              >
                {#if isGenerating}
                  <RotateCw size="14" class="animate-spin" />
                  Generating...
                {:else}
                  <Wand2 size="14" />
                  Generate AI Art
                {/if}
              </button>
            </div>

            <!-- Generated Art Preview -->
            {#if generatedArtUrl}
              <div class="mt-4">
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Generated Art</h4>
                <div class="relative w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <img src={generatedArtUrl} alt="Generated art" class="w-full h-full object-cover" />
                </div>
                <button
                  on:click={() => reportBadArt(generatedArtUrl)}
                  class="mt-2 text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1"
                >
                  <Flag size="10" />
                  Report Issue
                </button>
              </div>
            {/if}
          </div>
        </div>

        <!-- Art Tips -->
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Art Tips</h4>
          <ul class="text-xs text-gray-700 dark:text-gray-300 space-y-1">
            <li>• Card art works best with a 16:10 aspect ratio (400x240px)</li>
            <li>• High contrast images look great on cards</li>
            <li>• AI art is generated in MTG-style fantasy art without text or borders</li>
            <li>• Report art issues using the flag button to help improve generation</li>
            <li>• You can always change or remove art later</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Art Feedback Modal -->
<ArtFeedbackModal
  bind:isOpen={showFeedbackModal}
  artUrl={feedbackArtUrl}
  cardId={card?.id}
  cardTitle={card?.title}
  on:submit={handleFeedbackSubmit}
  on:close={closeFeedbackModal}
/>
