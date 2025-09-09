<!-- PackOpener.svelte - MTG-style pack opening experience -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Sparkles, Package, Star, Zap, Crown, Gem, X } from 'lucide-svelte';
  import Card from './Card.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  export let worldId = null;
  export const user = null; // For external reference only
  export let selectedCard = null; // Card to use as prompt (optional)

  let prompt = '';
  let isGenerating = false;
  let generatedPack = [];
  let showPack = false;
  let revealedCards = [];
  let currentRevealIndex = 0;
  let packAnimation = 'closed';
  let wiskrDialogue = '';
  let dialogueIndex = 0;

  // Rarity icons and colors
  const rarityConfig = {
    common: { icon: Package, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    special: { icon: Star, color: 'text-blue-600 dark:text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    rare: { icon: Gem, color: 'text-purple-600 dark:text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    legendary: { icon: Crown, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' }
  };

  // Mr. Wiskr's dialogue system
  const wiskrDialogues = {
    greeting: [
      "Ah, a seeker of ideas approaches...",
      "The void whispers your name, creative one...",
      "Welcome, dreamer. What mysteries shall we uncover?",
      "The cards await your touch, mortal...",
      "Another soul drawn to the realm of infinite possibilities..."
    ],
    generating: [
      "The void stirs... ancient knowledge awakens...",
      "Patience, seeker. The cards are being drawn from the cosmic deck...",
      "The ethereal realm responds to your request...",
      "Mystical forces align to craft your pack...",
      "The cosmic dice roll in your favor..."
    ],
    opening: [
      "Behold! The void reveals its secrets...",
      "The cards emerge from the swirling mists...",
      "Ancient wisdom manifests before your eyes...",
      "The cosmic deck deals its hand...",
      "Revelations unfold from the infinite void..."
    ],
    legendary: [
      "By the cosmic claws! A legendary revelation!",
      "The void itself trembles at this discovery!",
      "Such power! Such insight! The universe itself speaks through this card!",
      "Magnificent! A true gem from the depths of creation!",
      "The ancient ones smile upon you this day!"
    ],
    complete: [
      "Your pack is complete, seeker. May these ideas serve you well.",
      "The void has spoken. Use these gifts wisely...",
      "A fine collection indeed. The cosmic forces favor you.",
      "Your creative journey continues with these new tools...",
      "The cards have chosen you. Now choose your path..."
    ]
  };

  // Reset state when modal opens/closes
  $: if (isOpen) {
    resetState();
  }

  function resetState() {
    prompt = '';
    isGenerating = false;
    generatedPack = [];
    showPack = false;
    revealedCards = [];
    currentRevealIndex = 0;
    packAnimation = 'closed';
    wiskrDialogue = '';
    dialogueIndex = 0;
    setWiskrDialogue('greeting');
  }

  function setWiskrDialogue(type) {
    const dialogues = wiskrDialogues[type];
    if (dialogues && dialogues.length > 0) {
      const randomIndex = Math.floor(Math.random() * dialogues.length);
      wiskrDialogue = dialogues[randomIndex];
    }
  }

  function getWiskrDialogueForRarity(rarity) {
    if (rarity === 'legendary') {
      setWiskrDialogue('legendary');
    } else {
      setWiskrDialogue('opening');
    }
  }

  async function generatePack() {
    if (!prompt.trim() && !selectedCard) {
      return;
    }

    isGenerating = true;
    packAnimation = 'generating';
    setWiskrDialogue('generating');

    try {
      const response = await fetch('/api/packs/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          worldId,
          cardId: selectedCard?.id
        })
      });

      const data = await response.json();

      if (data.success) {
        generatedPack = data.pack;
        packAnimation = 'opening';
        showPack = true;
        
        // Start card reveal sequence
        setTimeout(() => {
          revealCards();
        }, 1000);
      } else {
        throw new Error(data.error || 'Failed to generate pack');
      }
    } catch (error) {
      console.error('Error generating pack:', error);
      alert('Failed to generate pack. Please try again.');
    } finally {
      isGenerating = false;
    }
  }

  function revealCards() {
    if (currentRevealIndex < generatedPack.length) {
      const card = generatedPack[currentRevealIndex];
      revealedCards.push(card);
      
      // Mr. Wiskr reacts to the card rarity
      getWiskrDialogueForRarity(card.rarity);
      
      currentRevealIndex++;
      
      // Add delay between reveals for dramatic effect
      setTimeout(() => {
        revealCards();
      }, 1200); // Slightly longer delay to read dialogue
    } else {
      packAnimation = 'complete';
      setWiskrDialogue('complete');
    }
  }

  function closePack() {
    dispatch('pack-complete', { cards: generatedPack });
    resetState();
  }

  function getRarityIcon(rarity) {
    const config = rarityConfig[rarity] || rarityConfig.common;
    return config.icon;
  }

  function getRarityColor(rarity) {
    const config = rarityConfig[rarity] || rarityConfig.common;
    return config.color;
  }

  function getRarityBg(rarity) {
    const config = rarityConfig[rarity] || rarityConfig.common;
    return config.bg;
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
      
      <!-- Header -->
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
              <img src="/mr-wiskr-emoji.png" alt="Mr. Wiskr" class="w-12 h-12" />
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">Mr. Wiskr's Pack Emporium</h2>
              <p class="text-sm text-gray-600 dark:text-gray-400">Mysterious card dealer from the void</p>
            </div>
          </div>
          <button 
            on:click={closePack}
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size="24" />
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        {#if !showPack}
          <!-- Pack Generation Form -->
          <div class="space-y-6">
            <!-- Mr. Wiskr's Dialogue -->
            {#if wiskrDialogue}
              <div class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <img src="/mr-wiskr-emoji.png" alt="Mr. Wiskr" class="w-10 h-10 flex-shrink-0" />
                  <div>
                    <p class="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">Mr. Wiskr says:</p>
                    <p class="text-gray-700 dark:text-gray-300 italic">"{wiskrDialogue}"</p>
                  </div>
                </div>
              </div>
            {/if}
            {#if selectedCard}
              <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 class="font-semibold text-blue-900 dark:text-blue-100 mb-2">Using Card as Prompt</h3>
                <div class="text-sm text-blue-700 dark:text-blue-400">
                  <strong>{selectedCard.title}</strong>
                  <p class="mt-1">{selectedCard.content}</p>
                </div>
              </div>
            {/if}

            <div>
              <label for="pack-prompt" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {selectedCard ? 'Additional Context (Optional)' : 'What ideas do you seek?'}
              </label>
              <textarea
                id="pack-prompt"
                bind:value={prompt}
                placeholder={selectedCard ? 'Add any additional context or specific directions...' : 'Describe what kind of ideas you want to generate...'}
                class="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isGenerating}
              ></textarea>
            </div>

            <div class="flex justify-center">
              <button
                on:click={generatePack}
                disabled={isGenerating || (!prompt.trim() && !selectedCard)}
                class="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {#if isGenerating}
                  <LoadingSpinner size="sm" class="mr-2" />
                  Mr. Wiskr is summoning...
                {:else}
                  <Sparkles size="20" class="mr-2" />
                  Ask Mr. Wiskr for a Pack
                {/if}
              </button>
            </div>
          </div>
        {:else}
          <!-- Pack Opening Animation -->
          <div class="text-center">
            <!-- Mr. Wiskr's Dialogue During Opening -->
            {#if wiskrDialogue}
              <div class="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <img src="/mr-wiskr-emoji.png" alt="Mr. Wiskr" class="w-10 h-10 flex-shrink-0" />
                  <div>
                    <p class="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">Mr. Wiskr says:</p>
                    <p class="text-gray-700 dark:text-gray-300 italic">"{wiskrDialogue}"</p>
                  </div>
                </div>
              </div>
            {/if}

            {#if packAnimation === 'opening'}
              <div class="mb-8">
                <div class="w-32 h-32 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                  <Package size="48" class="text-white" />
                </div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white mt-4">Opening Pack...</h3>
                <p class="text-gray-600 dark:text-gray-400">The void reveals its secrets</p>
              </div>
            {/if}

            <!-- Revealed Cards -->
            {#if revealedCards.length > 0}
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {#each revealedCards as card, index (card.id)}
                  <div class="relative">
                    <div class="transform transition-all duration-500 {index === revealedCards.length - 1 ? 'scale-110' : 'scale-100'}">
                      <Card {card} showActions={false} />
                    </div>
                    
                    <!-- Rarity Badge -->
                    <div class="absolute -top-2 -right-2 w-8 h-8 {getRarityBg(card.rarity)} rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                      <svelte:component this={getRarityIcon(card.rarity)} size="16" class={getRarityColor(card.rarity)} />
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Pack Complete -->
            {#if packAnimation === 'complete'}
              <div class="space-y-4">
                <!-- Mr. Wiskr's Final Dialogue -->
                {#if wiskrDialogue}
                  <div class="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                    <div class="flex items-start gap-3">
                      <img src="/mr-wiskr-emoji.png" alt="Mr. Wiskr" class="w-10 h-10 flex-shrink-0" />
                      <div>
                        <p class="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">Mr. Wiskr says:</p>
                        <p class="text-gray-700 dark:text-gray-300 italic">"{wiskrDialogue}"</p>
                      </div>
                    </div>
                  </div>
                {/if}

                <div class="text-center">
                  <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pack Complete!</h3>
                  <p class="text-gray-600 dark:text-gray-400">You received {generatedPack.length} cards</p>
                </div>

                <!-- Rarity Summary -->
                <div class="flex justify-center gap-4 text-sm">
                  {#each Object.entries(rarityConfig) as [rarity, config]}
                    {@const count = generatedPack.filter(card => card.rarity === rarity).length}
                    {#if count > 0}
                      <div class="flex items-center gap-1 {config.color}">
                        <svelte:component this={config.icon} size="16" />
                        <span>{count} {rarity}</span>
                      </div>
                    {/if}
                  {/each}
                </div>

                <button
                  on:click={closePack}
                  class="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Add to Collection
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes packGlow {
    0%, 100% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.3); }
    50% { box-shadow: 0 0 40px rgba(147, 51, 234, 0.6); }
  }
  
  .pack-glow {
    animation: packGlow 2s ease-in-out infinite;
  }
</style>
