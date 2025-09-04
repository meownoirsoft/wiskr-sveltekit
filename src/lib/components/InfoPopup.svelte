<script>
  import { Info, X } from 'lucide-svelte';
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { computePosition, autoPlacement, offset, flip, shift, arrow, hide } from '@floating-ui/dom';

  export let title = '';
  export let content = '';
  export let isOpen = false;
  export let buttonTitle = 'Learn more';

  const dispatch = createEventDispatcher();
  let buttonElement;
  let popupElement;
  let arrowElement;
  let portalContainer;
  
  // Portal action to render popup at document body
  function createPortal(node) {
    // Create portal container if it doesn't exist
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = 'info-popup-portal';
      portalContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 99999;';
      document.body.appendChild(portalContainer);
    }

    // Move the node to the portal container
    portalContainer.appendChild(node);
    
    // Enable pointer events on the popup itself
    node.style.pointerEvents = 'auto';
    
    return {
      destroy() {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
    };
  }
  
  async function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      await tick(); // Wait for popup to render
      updatePosition();
    }
    dispatch('toggle', { isOpen });
  }

  function close() {
    isOpen = false;
    dispatch('close');
  }

  // Update popup position using Floating UI
  async function updatePosition() {
    if (!buttonElement || !popupElement || !isOpen) return;
    
    try {
      // Determine optimal initial placement based on button position and screen size
      const buttonRect = buttonElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isMobile = window.innerWidth <= 768;
      
      // If button is in lower half of screen, prefer top placement
      const isInLowerHalf = buttonRect.top > viewportHeight / 2;
      
      let initialPlacement = 'bottom-end'; // Default
      let fallbackPlacements;
      
      if (isMobile) {
        if (isInLowerHalf) {
          // Mobile + lower half: FORCE top placement
          initialPlacement = 'top';
          fallbackPlacements = ['top-start', 'top-end', 'bottom']; // Very limited fallbacks
        } else {
          // Mobile + upper half: prefer bottom placements
          initialPlacement = 'bottom';
          fallbackPlacements = ['bottom-start', 'bottom-end', 'top'];
        }
      } else {
        // Desktop: more flexible, but still consider vertical position
        if (isInLowerHalf) {
          initialPlacement = 'top-end';
          fallbackPlacements = ['left', 'top-start', 'bottom-end', 'bottom-start', 'right'];
        } else {
          initialPlacement = 'bottom-end';
          fallbackPlacements = ['left', 'top-end', 'bottom-start', 'top-start', 'right'];
        }
      }
      
      const { x, y, placement, middlewareData } = await computePosition(buttonElement, popupElement, {
        placement: initialPlacement,
        middleware: [
          offset(8), // 8px gap between button and popup
          flip({
            fallbackPlacements: fallbackPlacements
          }),
          shift({ padding: isMobile ? 16 : 8 }), // More padding on mobile
          arrow({ element: arrowElement }), // Position arrow
          hide() // Hide popup if reference element is not visible
        ]
      });

      // Apply position
      Object.assign(popupElement.style, {
        left: `${x}px`,
        top: `${y}px`,
        visibility: middlewareData.hide?.referenceHidden ? 'hidden' : 'visible'
      });

      // Position arrow if it exists
      if (arrowElement && middlewareData.arrow) {
        const { x: arrowX, y: arrowY } = middlewareData.arrow;
        const side = placement.split('-')[0];
        
        const staticSide = {
          top: 'bottom',
          right: 'left', 
          bottom: 'top',
          left: 'right'
        }[side];

        Object.assign(arrowElement.style, {
          left: arrowX != null ? `${arrowX}px` : '',
          top: arrowY != null ? `${arrowY}px` : '',
          right: '',
          bottom: '',
          [staticSide]: '-4px'
        });
        
        // Update arrow classes based on placement
        updateArrowClasses(side);
      }
    } catch (error) {
      console.warn('Failed to update popup position:', error);
    }
  }

  function updateArrowClasses(side) {
    if (!arrowElement) return;
    
    // Remove all existing arrow classes
    arrowElement.className = arrowElement.className
      .split(' ')
      .filter(cls => !cls.includes('border-'))
      .join(' ');
    
    // Add appropriate border classes based on side - we need to hide the borders that would be inside the popup
    const borderClasses = {
      top: 'border-l-0 border-t-0 border-r border-b border-gray-300 dark:border-gray-600',
      right: 'border-t-0 border-r-0 border-b border-l border-gray-300 dark:border-gray-600', 
      bottom: 'border-r-0 border-b-0 border-t border-l border-gray-300 dark:border-gray-600',
      left: 'border-b-0 border-l-0 border-t border-r border-gray-300 dark:border-gray-600'
    };
    
    arrowElement.className += ` ${borderClasses[side] || borderClasses.bottom}`;
  }

  // Close on escape key
  function handleKeydown(event) {
    if (event.key === 'Escape' && isOpen) {
      close();
    }
  }

  // Close when clicking outside
  function handleClickOutside(event) {
    if (isOpen && !event.target.closest('.info-popup-content')) {
      close();
    }
  }

  // Listen for window resize to update position
  function handleResize() {
    if (isOpen) {
      updatePosition();
    }
  }

  // Listen for scroll events to update position
  function handleScroll() {
    if (isOpen) {
      updatePosition();
    }
  }

  onMount(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  });
</script>

<svelte:window on:keydown={handleKeydown} on:click={handleClickOutside} />

<div class="relative inline-block">
  <!-- Info Icon Button -->
  <button 
    bind:this={buttonElement}
    class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" 
    title={buttonTitle}
    on:click|stopPropagation={toggle}
  >
    <Info size="20" />
  </button>

  <!-- Popup Content -->
  {#if isOpen}
    <div use:createPortal>
      <div 
        bind:this={popupElement}
        class="info-popup-content fixed z-[99999] w-80 sm:w-96 md:w-128 rounded-lg shadow-xl border border-gray-300 dark:border-gray-600 bg-white"
        style="max-height: calc(100vh - 32px); max-width: calc(100vw - 32px); background-color: var(--bg-primary);"
      >
      <!-- Header with close button -->
      <div class="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 pb-2">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white pr-2">{title}</h3>
        <button 
          class="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white transition-colors flex-shrink-0"
          on:click|stopPropagation={close}
          title="Close"
        >
          <X size="16" />
        </button>
      </div>
      
      <!-- Content with scrolling -->
      <div class="flex-1 px-3 sm:px-4 pb-3 sm:pb-4 text-sm text-gray-700 dark:text-gray-200 leading-relaxed overflow-y-auto" style="max-height: calc(100vh - 120px);">
        {@html content}
      </div>
      
      <!-- Arrow pointing to button -->
      <div 
        bind:this={arrowElement}
        class="absolute w-4 h-4 transform rotate-45 border border-gray-300 dark:border-gray-600 bg-white" style="background-color: var(--bg-primary); z-index: -1;"
      ></div>
      </div>
    </div>
  {/if}
</div>
