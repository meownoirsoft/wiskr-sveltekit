<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    // Redirect to admin dashboard when accessing admin server root
    goto('/admin', { replaceState: true });
  });
</script>

<div class="flex items-center justify-center min-h-screen">
  <div class="text-center">
    <h1 class="font-logo text-2xl font-bold mb-4">Wiskr Admin Server</h1>
    <p class="text-gray-600">Redirecting to admin dashboard...</p>
  </div>
</div>
