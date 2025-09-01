<script>
  import { page } from '$app/stores';
  import { Settings, Users, Upload, BarChart3, Database, LogOut } from 'lucide-svelte';
  
  export let data;
  
  const adminNavigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: BarChart3,
      current: false
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      current: false
    },
    {
      name: 'Context Dashboard',
      href: '/admin/context',
      icon: Database,
      current: false
    },
    {
      name: 'Import Data',
      href: '/admin/import',
      icon: Upload,
      current: false
    },
    {
      name: 'Templates',
      href: '/admin/templates',
      icon: Settings,
      current: false
    }
  ];
  
  // Update current navigation item based on current path
  $: {
    adminNavigation.forEach(item => {
      item.current = $page.url.pathname === item.href;
    });
  }
  
  async function handleLogout() {
    const { supabase } = await import('$lib/supabase.js');
    await supabase.auth.signOut();
    window.location.href = '/login';
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Admin Navigation -->
  <nav class="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 justify-between">
        <div class="flex">
          <!-- Logo -->
          <div class="flex flex-shrink-0 items-center">
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              Wiskr Admin
            </h1>
            <span class="ml-2 inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-600/10 dark:ring-blue-300/10">
              Port 5174
            </span>
          </div>
          
          <!-- Navigation -->
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            {#each adminNavigation as item}
              <a
                href={item.href}
                class="inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium {
                  item.current
                    ? 'border-blue-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }"
              >
                <svelte:component this={item.icon} class="mr-2 h-4 w-4" />
                {item.name}
              </a>
            {/each}
          </div>
        </div>
        
        <!-- User menu -->
        <div class="flex items-center">
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-700 dark:text-gray-300">
              {data?.user?.email || 'Admin User'}
            </span>
            <button
              on:click={handleLogout}
              class="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <LogOut class="mr-2 h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Mobile menu -->
    <div class="sm:hidden">
      <div class="space-y-1 pb-3 pt-2">
        {#each adminNavigation as item}
          <a
            href={item.href}
            class="block border-l-4 py-2 pl-3 pr-4 text-base font-medium {
              item.current
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300'
            }"
          >
            <div class="flex items-center">
              <svelte:component this={item.icon} class="mr-2 h-4 w-4" />
              {item.name}
            </div>
          </a>
        {/each}
      </div>
    </div>
  </nav>
  
  <!-- Content -->
  <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
    <slot />
  </main>
</div>
