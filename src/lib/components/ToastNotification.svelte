<!-- ToastNotification.svelte - Toast notification system for user feedback -->
<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { AlertCircle, CheckCircle, Info, Wifi, WifiOff, Clock } from 'lucide-svelte';

  // Toast store
  const toasts = writable([]);

  let toastContainer;
  
  // Toast types and their configurations
  const toastConfig = {
    success: { icon: CheckCircle, class: 'bg-green-50 border-green-200 text-green-800', duration: 4000 },
    error: { icon: AlertCircle, class: 'bg-red-50 border-red-200 text-red-800', duration: 6000 },
    warning: { icon: AlertCircle, class: 'bg-yellow-50 border-yellow-200 text-yellow-800', duration: 5000 },
    info: { icon: Info, class: 'bg-blue-50 border-blue-200 text-blue-800', duration: 4000 },
    offline: { icon: WifiOff, class: 'bg-gray-50 border-gray-200 text-gray-800', duration: 0 }, // Persistent
    online: { icon: Wifi, class: 'bg-green-50 border-green-200 text-green-800', duration: 3000 },
    network_slow: { icon: Clock, class: 'bg-orange-50 border-orange-200 text-orange-800', duration: 5000 }
  };

  // Add toast function
  function addToast(message, type = 'info', options = {}) {
    const config = toastConfig[type] || toastConfig.info;
    const id = Date.now() + Math.random();
    
    const toast = {
      id,
      message,
      type,
      ...config,
      ...options,
      createdAt: Date.now()
    };

    toasts.update(current => [toast, ...current]);

    // Auto remove toast after duration (unless duration is 0)
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }

  // Remove toast function
  function removeToast(id) {
    toasts.update(current => current.filter(toast => toast.id !== id));
  }

  // Clear all toasts
  function clearAllToasts() {
    toasts.set([]);
  }

  // Global toast API
  if (typeof window !== 'undefined') {
    window.showToast = addToast;
    window.clearAllToasts = clearAllToasts;
    
    // Network status specific toasts
    window.showNetworkToast = {
      offline: (message = 'You are offline. Some features may be limited.') => 
        addToast(message, 'offline', { id: 'offline-status' }),
      online: (message = 'Connection restored. Syncing data...') => 
        addToast(message, 'online'),
      slow: (message = 'Network connection is slow. Please be patient.') => 
        addToast(message, 'network_slow'),
      error: (message = 'Network error occurred. Please try again.') => 
        addToast(message, 'error'),
      retry: (message, attempt, maxAttempts) => 
        addToast(`${message} (Attempt ${attempt}/${maxAttempts})`, 'warning')
    };
  }

  onMount(() => {
    // Set up global error handler for network errors
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      if (error?.message?.includes('Network connection failed') || 
          error?.message?.includes('Failed to fetch')) {
        addToast('Network error: ' + error.message, 'error');
      }
    });
  });
</script>

<!-- Toast Container -->
<div 
  bind:this={toastContainer}
  class="fixed top-20 right-4 z-[99999] flex flex-col gap-2 max-w-sm w-full"
  role="region" 
  aria-label="Notifications"
>
  {#each $toasts as toast (toast.id)}
    <div 
      class="toast-item flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 ease-in-out {toast.class}"
      role="alert"
      aria-live="polite"
    >
      <!-- Icon -->
      <div class="flex-shrink-0 mt-0.5">
        <svelte:component this={toast.icon} size="20" />
      </div>
      
      <!-- Content -->
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium break-words">
          {toast.message}
        </p>
        {#if toast.type === 'offline'}
          <p class="text-xs mt-1 opacity-75">
            Changes will be saved when you reconnect.
          </p>
        {/if}
      </div>
      
      <!-- Close button -->
      <button
        class="flex-shrink-0 ml-2 p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors"
        on:click={() => removeToast(toast.id)}
        aria-label="Close notification"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-item {
    animation: slideIn 0.3s ease-out;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
