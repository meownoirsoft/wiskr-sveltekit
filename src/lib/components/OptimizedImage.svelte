<!-- OptimizedImage.svelte - WebP with PNG fallback for better performance -->
<script>
  export let src;
  export let alt;
  export let className = '';
  export let width;
  export let height;
  export let fetchpriority = 'auto';
  
  // Convert .png to .webp for modern browsers
  $: webpSrc = src.replace('.png', '.webp');
</script>

<picture>
  <source srcset={webpSrc} type="image/webp" />
  <img 
    {src} 
    {alt} 
    class={className}
    {width}
    {height}
    {fetchpriority}
    loading="lazy"
  />
</picture>
