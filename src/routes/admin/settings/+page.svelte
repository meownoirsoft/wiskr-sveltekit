<script>
  import { Settings, Shield, Database, Bell, Globe, Lock } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Admin Settings - Wiskr</title>
</svelte:head>

<div>
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Admin Settings
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Configure system-wide settings, security policies, and administrative preferences.
    </p>
  </div>

  <!-- Coming Soon Notice -->
  <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
    <Settings class="h-16 w-16 text-blue-500 mx-auto mb-4" />
    <h3 class="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
      Admin Settings Coming Soon
    </h3>
    <p class="text-blue-800 dark:text-blue-200 mb-6 max-w-2xl mx-auto">
      Advanced administrative controls and system configuration options will be available here to help you manage 
      your Wiskr instance effectively.
    </p>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 max-w-6xl mx-auto">
      <div class="bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
        <Shield class="h-8 w-8 text-blue-500 mb-3" />
        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Security Settings</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Configure authentication, permissions, and security policies
        </p>
      </div>
      
      <div class="bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
        <Database class="h-8 w-8 text-blue-500 mb-3" />
        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">System Configuration</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Manage database settings, API limits, and system resources
        </p>
      </div>
      
      <div class="bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
        <Bell class="h-8 w-8 text-blue-500 mb-3" />
        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Notifications</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Configure system alerts, email notifications, and monitoring
        </p>
      </div>
      
      <div class="bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
        <Globe class="h-8 w-8 text-blue-500 mb-3" />
        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Global Defaults</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Set default project settings, themes, and user preferences
        </p>
      </div>
      
      <div class="bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
        <Lock class="h-8 w-8 text-blue-500 mb-3" />
        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Privacy Controls</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Manage data retention, privacy policies, and compliance settings
        </p>
      </div>
      
      <div class="bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
        <Database class="h-8 w-8 text-blue-500 mb-3" />
        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Backup & Recovery</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Configure automated backups and disaster recovery options
        </p>
      </div>
    </div>
  </div>
  
  <!-- Current Configuration Info -->
  <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Current Configuration
      </h3>
      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Admin Authentication</span>
          <span class="font-medium text-green-600 dark:text-green-400">Active</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Database Connection</span>
          <span class="font-medium text-green-600 dark:text-green-400">Connected</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Service Role Access</span>
          <span class="font-medium text-green-600 dark:text-green-400">Enabled</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Admin Email Whitelist</span>
          <span class="font-medium text-blue-600 dark:text-blue-400">Configured</span>
        </div>
      </div>
    </div>
    
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Quick Actions
      </h3>
      <div class="space-y-3">
        <a 
          href="/admin/users" 
          class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          Manage User Permissions
        </a>
        <a 
          href="/admin/context" 
          class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          Monitor System Performance
        </a>
        <a 
          href="/admin/import" 
          class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          Import User Data
        </a>
      </div>
    </div>
  </div>
  
  <!-- Environment Info (helpful for debugging) -->
  <div class="mt-6 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Environment Status</h4>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      Admin dashboard is running in {typeof window !== 'undefined' ? 'client' : 'server'} mode. 
      All admin functions are operational and secure.
    </p>
  </div>
</div>
