<script>
  import { 
    Users, 
    Upload, 
    BarChart3, 
    Database, 
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Activity
  } from 'lucide-svelte';

  export let data;

  // Quick action cards
  const quickActions = [
    {
      title: 'Import Project Data',
      description: 'Upload JSON or ZIP files to import project data',
      icon: Upload,
      href: '/admin/import',
      color: 'blue'
    },
    {
      title: 'Manage Users',
      description: 'View, edit, and manage user accounts',
      icon: Users,
      href: '/admin/users', 
      color: 'green'
    },
    {
      title: 'Context Dashboard',
      description: 'Monitor system performance and context quality',
      icon: BarChart3,
      href: '/admin/context',
      color: 'purple'
    },
    {
      title: 'Project Templates',
      description: 'Create and manage project templates for new users',
      icon: Database,
      href: '/admin/templates',
      color: 'orange'
    }
  ];

  // Get color classes for cards
  function getColorClasses(color) {
    const colors = {
      blue: 'border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700',
      green: 'border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700',
      purple: 'border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700',
      orange: 'border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700'
    };
    return colors[color] || colors.blue;
  }

  function getIconClasses(color) {
    const colors = {
      blue: 'text-blue-600 dark:text-blue-400',
      green: 'text-green-600 dark:text-green-400',
      purple: 'text-purple-600 dark:text-purple-400',
      orange: 'text-orange-600 dark:text-orange-400'
    };
    return colors[color] || colors.blue;
  }
</script>

<div>
  <!-- Dashboard Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Welcome to Admin Dashboard
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Manage your Wiskr instance, import data, and monitor system health.
    </p>
  </div>

  <!-- Stats Overview -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <Users class="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div class="ml-4">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</h3>
          <p class="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.stats?.users || 0}
          </p>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <Database class="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div class="ml-4">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Projects</h3>
          <p class="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.stats?.projects || 0}
          </p>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <Activity class="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <div class="ml-4">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Active Sessions</h3>
          <p class="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.stats?.sessions || 0}
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="mb-8">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
      Quick Actions
    </h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each quickActions as action}
        <a
          href={action.href}
          class="block bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 {getColorClasses(action.color)} p-6 transition-all hover:shadow-md"
        >
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svelte:component this={action.icon} class="h-8 w-8 {getIconClasses(action.color)}" />
            </div>
            <div class="ml-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                {action.title}
              </h3>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {action.description}
              </p>
            </div>
          </div>
        </a>
      {/each}
    </div>
  </div>

  <!-- System Status -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
      System Status
    </h2>
    
    <div class="space-y-4">
      <div class="flex items-center">
        <CheckCircle class="h-5 w-5 text-green-500 mr-3" />
        <span class="text-sm text-gray-600 dark:text-gray-400">Database Connection</span>
        <span class="ml-auto text-sm font-medium text-green-600 dark:text-green-400">Healthy</span>
      </div>
      
      <div class="flex items-center">
        <CheckCircle class="h-5 w-5 text-green-500 mr-3" />
        <span class="text-sm text-gray-600 dark:text-gray-400">Authentication Service</span>
        <span class="ml-auto text-sm font-medium text-green-600 dark:text-green-400">Operational</span>
      </div>
      
      <div class="flex items-center">
        <CheckCircle class="h-5 w-5 text-green-500 mr-3" />
        <span class="text-sm text-gray-600 dark:text-gray-400">Wiskr API</span>
        <span class="ml-auto text-sm font-medium text-green-600 dark:text-green-400">Running</span>
      </div>
    </div>
  </div>

  <!-- Getting Started -->
  <div class="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
    <h3 class="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
      Getting Started with Admin Dashboard
    </h3>
    <p class="text-sm text-blue-800 dark:text-blue-200 mb-4">
      Here are some common administrative tasks to get you started:
    </p>
    
    <ol class="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
      <li>Set up project templates for new users</li>
      <li>Import existing user data and projects</li>
      <li>Monitor context quality across projects</li>
      <li>Manage user permissions and beta access</li>
    </ol>
  </div>
</div>
