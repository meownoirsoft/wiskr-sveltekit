<script>
  import '../../app.css';
  import AdminLayout from '$lib/components/AdminLayout.svelte';
  
  export let data;
</script>

<svelte:head>
  <title>Admin Dashboard - Wiskr</title>
</svelte:head>

<AdminLayout {data}>
  <slot />
</AdminLayout>

