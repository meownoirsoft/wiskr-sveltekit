<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { ChevronLeft, ChevronRight, X, Play, RotateCcw } from 'lucide-svelte';
  import { 
    tutorialActive, 
    currentStep, 
    tutorialProgress,
    nextTutorialStep,
    previousTutorialStep,
    skipTutorial,
    completeTutorial,
    getElementPosition,
    currentTutorialStep,
    TUTORIAL_STEPS
  } from '$lib/stores/tutorial.js';
  
  let mounted = false;
  let targetElement = null;
  let targetPosition = null;
  let tooltipElement = null;
  let tooltipPosition = { top: 0, left: 0 };
  
  // Reactive variables
  $: step = $currentStep;
  $: progress = $tutorialProgress;
  $: currentStepNum = $currentTutorialStep;
  
  // Update target element and position when step changes
  $: if (mounted && step?.target) {
    updateTargetPosition();
  }
  
  onMount(() => {
    mounted = true;
    if (step?.target) {
      updateTargetPosition();
    }
  });
  
  onDestroy(() => {
    mounted = false;
  });
  
  async function updateTargetPosition() {
    if (!step?.target) {
      targetElement = null;
      targetPosition = null;
      return;
    }
    
    await tick();
    
    // Wait a bit for the UI to settle
    setTimeout(() => {
      targetElement = document.querySelector(step.target);
      if (targetElement) {
        targetPosition = getElementPosition(step.target);
        positionTooltip();
        
        // Scroll target into view if needed
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }, 100);
  }
  
  function positionTooltip() {
    if (!targetPosition || !tooltipElement) return;
    
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 20;
    
    let top, left;
    
    switch (step.position) {
      case 'top':
        top = targetPosition.top - tooltipRect.height - margin;
        left = targetPosition.centerX - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = targetPosition.top + targetPosition.height + margin;
        left = targetPosition.centerX - tooltipRect.width / 2;
        break;
      case 'left':
        top = targetPosition.centerY - tooltipRect.height / 2;
        left = targetPosition.left - tooltipRect.width - margin;
        break;
      case 'right':
        top = targetPosition.centerY - tooltipRect.height / 2;
        left = targetPosition.left + targetPosition.width + margin;
        break;
      default: // center
        top = viewportHeight / 2 - tooltipRect.height / 2;
        left = viewportWidth / 2 - tooltipRect.width / 2;
    }
    
    // Keep tooltip within viewport bounds
    top = Math.max(margin, Math.min(top, viewportHeight - tooltipRect.height - margin));
    left = Math.max(margin, Math.min(left, viewportWidth - tooltipRect.width - margin));
    
    tooltipPosition = { top, left };
  }
  
  function handleNext() {
    nextTutorialStep();
  }
  
  function handlePrevious() {
    if (currentStepNum > 0) {
      previousTutorialStep();
    }
  }
  
  function handleSkip() {
    skipTutorial();
  }
  
  function handleComplete() {
    completeTutorial();
  }
  
  // Handle window resize
  function handleResize() {
    if (step?.target) {
      updateTargetPosition();
    }
  }
  
  // Handle escape key
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      skipTutorial();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleNext();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handlePrevious();
    }
  }
  
  // Setup event listeners when tutorial is active
  onMount(() => {
    if (browser) {
      const cleanupResize = () => {
        window.removeEventListener('resize', handleResize);
      };
      const cleanupKeydown = () => {
        window.removeEventListener('keydown', handleKeydown);
      };
      
      // Store cleanup functions
      window.tutorialCleanupResize = cleanupResize;
      window.tutorialCleanupKeydown = cleanupKeydown;
    }
  });
  
  onDestroy(() => {
    if (browser) {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeydown);
    }
  });
  
  // Add/remove event listeners based on tutorial state
  $: if (browser && $tutorialActive) {
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeydown);
  } else if (browser) {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('keydown', handleKeydown);
  }
</script>

{#if $tutorialActive && step}
  <!-- Overlay backdrop -->
  <div class="tutorial-overlay" class:has-target={!!targetPosition}>
    <!-- Spotlight hole -->
    {#if targetPosition}
      <div 
        class="spotlight-hole"
        style="
          top: {targetPosition.top - 10}px;
          left: {targetPosition.left - 10}px;
          width: {targetPosition.width + 20}px;
          height: {targetPosition.height + 20}px;
        "
      ></div>
    {/if}
    
    <!-- Tutorial tooltip -->
    <div 
      class="tutorial-tooltip"
      class:center={step.position === 'center'}
      style={step.position !== 'center' ? `top: ${tooltipPosition.top}px; left: ${tooltipPosition.left}px;` : ''}
      bind:this={tooltipElement}
      on:transitionend={positionTooltip}
    >
      <!-- Progress bar -->
      <div class="tutorial-progress">
        <div class="progress-bar" style="width: {progress}%"></div>
        <div class="progress-text">{currentStepNum + 1} of {TUTORIAL_STEPS.length}</div>
      </div>
      
      <!-- Tutorial content -->
      <div class="tutorial-content">
        <h3 class="tutorial-title">{step.title}</h3>
        <p class="tutorial-description">{step.description}</p>
        <p class="tutorial-text">{step.content}</p>
      </div>
      
      <!-- Tutorial controls -->
      <div class="tutorial-controls">
        <div class="controls-left">
          {#if currentStepNum > 0}
            <button 
              class="tutorial-btn tutorial-btn-secondary"
              on:click={handlePrevious}
              title="Previous step"
            >
              <ChevronLeft size="16" />
              Previous
            </button>
          {/if}
        </div>
        
        <div class="controls-right">
          {#if step.showSkip}
            <button 
              class="tutorial-btn tutorial-btn-ghost"
              on:click={handleSkip}
            >
              Skip tour
            </button>
          {/if}
          
          {#if step.showNext}
            <button 
              class="tutorial-btn tutorial-btn-primary"
              on:click={handleNext}
            >
              Next
              <ChevronRight size="16" />
            </button>
          {:else if step.showComplete}
            <button 
              class="tutorial-btn tutorial-btn-primary"
              on:click={handleComplete}
            >
              Get started
              <Play size="16" />
            </button>
          {/if}
        </div>
      </div>
      
      <!-- Close button -->
      <button 
        class="tutorial-close"
        on:click={handleSkip}
        title="Close tutorial (Esc)"
      >
        <X size="18" />
      </button>
      
      <!-- Pointer arrow for targeted steps -->
      {#if targetPosition && step.position !== 'center'}
        <div class="tutorial-arrow tutorial-arrow-{step.position}"></div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .tutorial-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(1px);
    z-index: 9999;
    transition: all 0.3s ease;
    animation: fadeIn 0.3s ease;
  }
  
  .tutorial-overlay.has-target {
    background: rgba(0, 0, 0, 0.3);
  }
  
  .spotlight-hole {
    position: absolute;
    border-radius: 8px;
    box-shadow: 
      0 0 0 9999px rgba(0, 0, 0, 0.6),
      0 0 20px rgba(59, 130, 246, 0.5),
      inset 0 0 20px rgba(59, 130, 246, 0.3);
    transition: all 0.4s ease;
    pointer-events: none;
    animation: spotlight 0.6s ease;
  }
  
  .tutorial-tooltip {
    position: absolute;
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 380px;
    min-width: 320px;
    border: 1px solid rgba(229, 231, 235, 0.8);
    transition: all 0.3s ease;
    animation: slideIn 0.4s ease;
  }
  
  .tutorial-tooltip.center {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  
  /* Dark mode support */
  :global(.dark) .tutorial-tooltip {
    background: #1f2937;
    border-color: rgba(75, 85, 99, 0.8);
    color: #f9fafb;
  }
  
  .tutorial-progress {
    position: relative;
    height: 4px;
    background: rgba(229, 231, 235, 0.5);
    border-radius: 2px 2px 0 0;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    transition: width 0.5s ease;
    border-radius: 2px;
  }
  
  .progress-text {
    position: absolute;
    top: 12px;
    right: 20px;
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
  }
  
  :global(.dark) .progress-text {
    color: #9ca3af;
  }
  
  .tutorial-content {
    padding: 20px;
    padding-top: 24px;
  }
  
  .tutorial-title {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0 0 8px 0;
  }
  
  :global(.dark) .tutorial-title {
    color: #f9fafb;
  }
  
  .tutorial-description {
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 12px 0;
    font-weight: 500;
  }
  
  :global(.dark) .tutorial-description {
    color: #9ca3af;
  }
  
  .tutorial-text {
    font-size: 14px;
    color: #374151;
    margin: 0;
    line-height: 1.5;
  }
  
  :global(.dark) .tutorial-text {
    color: #d1d5db;
  }
  
  .tutorial-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-top: 1px solid rgba(229, 231, 235, 0.5);
    gap: 12px;
  }
  
  :global(.dark) .tutorial-controls {
    border-top-color: rgba(75, 85, 99, 0.5);
  }
  
  .controls-left,
  .controls-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  .tutorial-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
    outline: none;
  }
  
  .tutorial-btn-primary {
    background: #3b82f6;
    color: white;
  }
  
  .tutorial-btn-primary:hover {
    background: #2563eb;
  }
  
  .tutorial-btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }
  
  .tutorial-btn-secondary:hover {
    background: #e5e7eb;
  }
  
  :global(.dark) .tutorial-btn-secondary {
    background: #374151;
    color: #d1d5db;
    border-color: #4b5563;
  }
  
  :global(.dark) .tutorial-btn-secondary:hover {
    background: #4b5563;
  }
  
  .tutorial-btn-ghost {
    background: transparent;
    color: #6b7280;
  }
  
  .tutorial-btn-ghost:hover {
    color: #374151;
    background: rgba(243, 244, 246, 0.5);
  }
  
  :global(.dark) .tutorial-btn-ghost {
    color: #9ca3af;
  }
  
  :global(.dark) .tutorial-btn-ghost:hover {
    color: #d1d5db;
    background: rgba(55, 65, 81, 0.5);
  }
  
  .tutorial-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }
  
  .tutorial-close:hover {
    color: #374151;
    background: rgba(243, 244, 246, 0.8);
  }
  
  :global(.dark) .tutorial-close {
    color: #9ca3af;
  }
  
  :global(.dark) .tutorial-close:hover {
    color: #d1d5db;
    background: rgba(55, 65, 81, 0.8);
  }
  
  /* Tutorial arrows */
  .tutorial-arrow {
    position: absolute;
    width: 0;
    height: 0;
    border: 8px solid transparent;
  }
  
  .tutorial-arrow-top {
    bottom: -16px;
    left: 50%;
    transform: translateX(-50%);
    border-top-color: white;
  }
  
  .tutorial-arrow-bottom {
    top: -16px;
    left: 50%;
    transform: translateX(-50%);
    border-bottom-color: white;
  }
  
  .tutorial-arrow-left {
    right: -16px;
    top: 50%;
    transform: translateY(-50%);
    border-left-color: white;
  }
  
  .tutorial-arrow-right {
    left: -16px;
    top: 50%;
    transform: translateY(-50%);
    border-right-color: white;
  }
  
  :global(.dark) .tutorial-arrow-top {
    border-top-color: #1f2937;
  }
  
  :global(.dark) .tutorial-arrow-bottom {
    border-bottom-color: #1f2937;
  }
  
  :global(.dark) .tutorial-arrow-left {
    border-left-color: #1f2937;
  }
  
  :global(.dark) .tutorial-arrow-right {
    border-right-color: #1f2937;
  }
  
  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @keyframes spotlight {
    from {
      box-shadow: 
        0 0 0 9999px rgba(0, 0, 0, 0.8),
        0 0 0 rgba(59, 130, 246, 0.5),
        inset 0 0 0 rgba(59, 130, 246, 0.3);
    }
    to {
      box-shadow: 
        0 0 0 9999px rgba(0, 0, 0, 0.6),
        0 0 20px rgba(59, 130, 246, 0.5),
        inset 0 0 20px rgba(59, 130, 246, 0.3);
    }
  }
  
  /* Mobile responsive */
  @media (max-width: 640px) {
    .tutorial-tooltip {
      position: fixed !important;
      top: auto !important;
      left: 20px !important;
      right: 20px !important;
      bottom: 20px;
      max-width: none;
      min-width: 0;
      transform: none;
    }
    
    .tutorial-tooltip.center {
      top: 50% !important;
      bottom: auto;
      transform: translateY(-50%);
    }
    
    .tutorial-content {
      padding: 16px;
      padding-top: 20px;
    }
    
    .tutorial-title {
      font-size: 16px;
    }
    
    .tutorial-controls {
      padding: 12px 16px;
      flex-wrap: wrap;
    }
    
    .tutorial-btn {
      font-size: 13px;
      padding: 6px 12px;
    }
    
    .tutorial-arrow {
      display: none;
    }
    
    .spotlight-hole {
      border-radius: 12px;
    }
  }
</style>
