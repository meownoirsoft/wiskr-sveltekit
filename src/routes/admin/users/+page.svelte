<script>
  import { onMount } from 'svelte';
  import { 
    Users, 
    Search, 
    Edit3, 
    Shield, 
    ShieldCheck, 
    Trash2, 
    Database,
    Calendar,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    CheckCircle,
    X,
    Crown,
    Gift,
    User as UserIcon
  } from 'lucide-svelte';
  import TierChangeModal from '$lib/components/modals/TierChangeModal.svelte';
  import { TIER_NAMES } from '$lib/config/tiers.js';

  let users = [];
  let loading = true;
  let searchTerm = '';
  let currentPage = 0;
  let pageSize = 20;
  let totalUsers = 0;
  let actionResult = null;

  // Edit modal state
  let showEditModal = false;
  let editingUser = null;
  let editForm = { full_name: '' };

  // Delete confirmation state  
  let showDeleteModal = false;
  let deletingUser = null;

  // Tier change modal state
  let showTierModal = false;
  let changingTierUser = null;
  let savingTierChange = false;

  $: totalPages = Math.ceil(totalUsers / pageSize);
  $: offset = currentPage * pageSize;

  onMount(() => {
    loadUsers();
  });

  async function loadUsers() {
    loading = true;
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString()
      });
      
      if (searchTerm) {
        params.set('search', searchTerm);
      }

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        users = data.users;
        totalUsers = data.total;
      } else {
        console.error('Failed to load users:', data.error);
        actionResult = { success: false, message: data.error };
      }
    } catch (error) {
      console.error('Error loading users:', error);
      actionResult = { success: false, message: 'Failed to load users' };
    } finally {
      loading = false;
    }
  }

  function handleSearch() {
    currentPage = 0;
    loadUsers();
  }

  function handleSearchKeydown(event) {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }

  function nextPage() {
    if (currentPage < totalPages - 1) {
      currentPage++;
      loadUsers();
    }
  }

  function prevPage() {
    if (currentPage > 0) {
      currentPage--;
      loadUsers();
    }
  }

  function openEditModal(user) {
    editingUser = user;
    editForm = {
      full_name: user.full_name || ''
    };
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    editingUser = null;
    editForm = { full_name: '' };
  }

  function openDeleteModal(user) {
    deletingUser = user;
    showDeleteModal = true;
  }

  function closeDeleteModal() {
    showDeleteModal = false;
    deletingUser = null;
  }

  function openTierModal(user) {
    changingTierUser = user;
    showTierModal = true;
  }

  function closeTierModal() {
    showTierModal = false;
    changingTierUser = null;
    savingTierChange = false;
  }

  async function handleUpdateUser() {
    if (!editingUser) return;
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: editingUser.id,
          action: 'update_profile',
          data: {
            ...editForm,
            currentMetadata: editingUser.user_metadata || {}
          }
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        actionResult = { success: true, message: result.message };
        closeEditModal();
        loadUsers(); // Refresh the list
      } else {
        actionResult = { success: false, message: result.error };
      }
    } catch (error) {
      actionResult = { success: false, message: 'Failed to update user' };
    }
  }

  async function handleToggleAdmin(user) {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          action: 'set_admin',
          data: {
            is_admin: !user.is_admin,
            currentMetadata: user.user_metadata || {}
          }
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        actionResult = { success: true, message: result.message };
        loadUsers(); // Refresh to show updated status
      } else {
        actionResult = { success: false, message: result.error };
      }
    } catch (error) {
      actionResult = { success: false, message: 'Failed to update admin status' };
    }
  }

  async function handleDeleteUser() {
    if (!deletingUser) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: deletingUser.id,
          action: 'delete_user'
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        actionResult = { success: true, message: result.message };
        closeDeleteModal();
        loadUsers(); // Refresh the list
      } else {
        actionResult = { success: false, message: result.error };
      }
    } catch (error) {
      actionResult = { success: false, message: 'Failed to delete user' };
    }
  }

  function closeActionResult() {
    actionResult = null;
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }

  function getTierDisplayInfo(tier, trialEndsAt) {
    const tierName = TIER_NAMES[tier] || 'Free';
    if (tier > 0 && trialEndsAt) {
      const trialEnd = new Date(trialEndsAt);
      const now = new Date();
      if (now < trialEnd) {
        return `${tierName} (Trial)`;
      } else {
        return `${tierName} (Expired)`;
      }
    }
    return tierName;
  }

  function getTierIcon(tier) {
    switch (tier) {
      case 1: return Crown;
      case 2: return Gift;
      default: return UserIcon;
    }
  }

  async function handleTierChange(event) {
    const { userId, tier, trial_ends_at } = event.detail;
    
    if (!changingTierUser) return;
    
    savingTierChange = true;
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          action: 'change_tier',
          data: {
            tier: tier,
            trial_ends_at: trial_ends_at,
            currentMetadata: changingTierUser.user_metadata || {}
          }
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        actionResult = { success: true, message: result.message };
        closeTierModal();
        loadUsers(); // Refresh to show updated tier
      } else {
        actionResult = { success: false, message: result.error };
      }
    } catch (error) {
      actionResult = { success: false, message: 'Failed to update user tier' };
    } finally {
      savingTierChange = false;
    }
  }
</script>

<svelte:head>
  <title>User Management - Admin - Wiskr</title>
</svelte:head>

<div>
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      User Management
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Manage user accounts, permissions, and beta access across your Wiskr instance.
    </p>
  </div>

  <!-- Action Result -->
  {#if actionResult}
    <div class="mb-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div class="flex items-start justify-between">
        <div class="flex items-start">
          {#if actionResult.success}
            <CheckCircle class="h-5 w-5 text-green-500 mr-3 mt-0.5" />
            <div>
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">Success</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{actionResult.message}</p>
            </div>
          {:else}
            <AlertCircle class="h-5 w-5 text-red-500 mr-3 mt-0.5" />
            <div>
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">Error</h3>
              <p class="text-sm text-red-600 dark:text-red-400 mt-1">{actionResult.message}</p>
            </div>
          {/if}
        </div>
        <button
          type="button"
          on:click={closeActionResult}
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>
  {/if}

  <!-- Search and Controls -->
  <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
    <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div class="flex-1 min-w-0">
        <div class="flex gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by email or name..."
              bind:value={searchTerm}
              on:keydown={handleSearchKeydown}
              class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
            />
          </div>
          <button
            on:click={handleSearch}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span>Total: {totalUsers} users</span>
      </div>
    </div>
  </div>

  <!-- Users Table -->
  <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    {#if loading}
      <div class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading users...</p>
      </div>
    {:else if users.length === 0}
      <div class="p-8 text-center">
        <Users class="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">No users found</h3>
        <p class="text-gray-600 dark:text-gray-400">
          {searchTerm ? 'No users match your search criteria.' : 'No users have been created yet.'}
        </p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Projects
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Tier
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
            {#each users as user}
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0">
                      <div class="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center">
                        <span class="text-sm font-medium text-blue-600 dark:text-blue-300">
                          {(user.full_name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {user.full_name || 'No name set'}
                      </div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                      <div class="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        ID: {user.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center text-sm text-gray-900 dark:text-gray-100">
                    <Database class="h-4 w-4 mr-2 text-gray-400" />
                    {user.project_count}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <svelte:component 
                      this={getTierIcon(user.tier)} 
                      class="h-4 w-4 mr-2 {user.tier > 0 ? 'text-amber-500' : 'text-gray-400'}" 
                    />
                    <span class="text-sm text-gray-900 dark:text-gray-100">
                      {getTierDisplayInfo(user.tier, user.trial_ends_at)}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    {#if user.is_admin}
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        <ShieldCheck class="h-3 w-3 mr-1" />
                        Admin
                      </span>
                    {:else}
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        User
                      </span>
                    {/if}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div class="flex items-center">
                    <Calendar class="h-4 w-4 mr-2" />
                    {formatDate(user.created_at)}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      on:click={() => openEditModal(user)}
                      class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded"
                      title="Edit user"
                    >
                      <Edit3 class="h-4 w-4" />
                    </button>
                    <button
                      on:click={() => openTierModal(user)}
                      class="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 p-1 rounded"
                      title="Change tier"
                    >
                      <Crown class="h-4 w-4" />
                    </button>
                    <button
                      on:click={() => handleToggleAdmin(user)}
                      class="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 p-1 rounded"
                      title={user.is_admin ? 'Remove admin' : 'Make admin'}
                    >
                      {#if user.is_admin}
                        <ShieldCheck class="h-4 w-4" />
                      {:else}
                        <Shield class="h-4 w-4" />
                      {/if}
                    </button>
                    <button
                      on:click={() => openDeleteModal(user)}
                      class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                      title="Delete user"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="bg-white dark:bg-slate-800 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700 dark:text-gray-300">
              Showing {offset + 1} to {Math.min(offset + pageSize, totalUsers)} of {totalUsers} results
            </div>
            <div class="flex items-center gap-2">
              <button
                on:click={prevPage}
                disabled={currentPage === 0}
                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <ChevronLeft class="h-4 w-4 mr-1" />
                Previous
              </button>
              <span class="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                on:click={nextPage}
                disabled={currentPage >= totalPages - 1}
                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                Next
                <ChevronRight class="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Edit User Modal -->
{#if showEditModal}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[99999]">
    <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-800">
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            Edit User
          </h3>
          <button
            on:click={closeEditModal}
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email (read-only)
            </label>
            <input
              type="email"
              value={editingUser?.email || ''}
              disabled
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
          
          <div>
            <label for="full_name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              id="full_name"
              type="text"
              bind:value={editForm.full_name}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter full name"
            />
          </div>
        </div>
        
        <div class="flex justify-end gap-3 mt-6">
          <button
            on:click={closeEditModal}
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            on:click={handleUpdateUser}
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[99999]">
    <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-800">
      <div class="mt-3">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            Delete User
          </h3>
          <button
            on:click={closeDeleteModal}
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        
        <div class="mb-4">
          <div class="flex items-center mb-2">
            <AlertCircle class="h-5 w-5 text-red-500 mr-2" />
            <span class="text-sm font-medium text-gray-900 dark:text-white">This action cannot be undone</span>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>{deletingUser?.full_name || deletingUser?.email}</strong>?
            This will permanently delete:
          </p>
          <ul class="mt-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
            <li>User account and profile</li>
            <li>All projects ({deletingUser?.project_count || 0})</li>
            <li>All contexts and data</li>
          </ul>
        </div>
        
        <div class="flex justify-end gap-3">
          <button
            on:click={closeDeleteModal}
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            on:click={handleDeleteUser}
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete User
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Tier Change Modal -->
<TierChangeModal 
  bind:show={showTierModal}
  bind:user={changingTierUser}
  bind:saving={savingTierChange}
  on:close={closeTierModal}
  on:save={handleTierChange}
/>
