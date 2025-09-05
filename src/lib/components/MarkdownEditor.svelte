<!-- MarkdownEditor.svelte - A markdown editor with toggle/split view and full-screen support -->
<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { markdown } from '@codemirror/lang-markdown';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { EditorState } from '@codemirror/state';
  import { placeholder as cmPlaceholder } from '@codemirror/view';
  import { 
    Bold, 
    Italic, 
    Code, 
    Link, 
    List, 
    ListOrdered, 
    Quote, 
    Heading1, 
    Heading2, 
    Heading3,
    Maximize2,
    Minimize2,
    Eye,
    Edit3,
    Split
  } from 'lucide-svelte';

  export let content = '';
  export let placeholder = 'Enter your markdown content...';
  export let isFullScreen = false;
  export let showPreview = false;
  export let showSplitView = false;

  const dispatch = createEventDispatcher();

  let editorElement;
  let previewElement;
  let editorView;
  let isDarkMode = false;

  // Check for dark mode
  $: isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  // Update editor content when prop changes
  $: if (editorView && content !== editorView.state.doc.toString()) {
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: content
      }
    });
  }

  // Re-initialize editor when switching to markdown mode or when content changes significantly
  $: if (editorElement && typeof window !== 'undefined') {
    if (!editorView) {
      setTimeout(() => {
        initializeEditor();
      }, 50);
    }
  }

  // Force re-initialization when content changes significantly (like switching modes)
  $: if (editorElement && editorView && content && content !== editorView.state.doc.toString()) {
    // If content is very different, re-initialize the editor
    if (Math.abs(content.length - editorView.state.doc.length) > 10) {
      setTimeout(() => {
        initializeEditor();
      }, 10);
    } else {
      // Small changes, just update the content
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: content
        }
      });
    }
  }

  // Handle initial content loading
  $: if (editorElement && content && !editorView) {
    setTimeout(() => {
      initializeEditor();
    }, 50);
  }

  // Force re-initialization when content changes from empty to having content
  $: if (editorElement && content && content.trim() && editorView && editorView.state.doc.toString().trim() === '') {
    setTimeout(() => {
      initializeEditor();
    }, 50);
  }

  // Force re-initialization when content changes significantly
  $: if (editorElement && content && editorView) {
    const currentContent = editorView.state.doc.toString();
    if (content !== currentContent && content.trim() !== currentContent.trim()) {
      setTimeout(() => {
        initializeEditor();
      }, 50);
    }
  }

  onMount(() => {
    if (editorElement) {
      // Small delay to ensure content is properly set
      setTimeout(() => {
        initializeEditor();
      }, 100);
    }
  });

  onDestroy(() => {
    if (editorView) {
      // Clean up event listener
      if (editorView._inputHandler && editorElement) {
        editorElement.removeEventListener('input', editorView._inputHandler);
      }
      editorView.destroy();
    }
  });

  function initializeEditor() {
    if (editorView) {
      editorView.destroy();
    }


    editorView = new EditorView({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        isDarkMode ? oneDark : [],
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
            maxWidth: '100%',
            width: '100%',
            overflow: 'hidden'
          },
          '.cm-editor': {
            height: '100%',
            maxWidth: '100%',
            width: '100%'
          },
          '.cm-scroller': {
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            overflow: 'auto',
            overflowX: 'hidden',
            maxWidth: '100%',
            width: '100%'
          },
          '.cm-content': {
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
            width: '100%',
            overflow: 'hidden'
          },
          '.cm-line': {
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
            width: '100%'
          },
          '.cm-placeholder': {
            color: 'var(--tw-placeholder-opacity, 1)',
            opacity: 'var(--tw-placeholder-opacity, 0.5)'
          }
        }),
        cmPlaceholder(placeholder)
      ],
      parent: editorElement
    });

    // Focus the editor after initialization
    setTimeout(() => {
      editorView.focus();
    }, 100);

    // Add manual content change detection
    if (editorElement) {
      const handleInput = () => {
        if (editorView) {
          const newContent = editorView.state.doc.toString();
          dispatch('content-change', { content: newContent });
        }
      };
      
      editorElement.addEventListener('input', handleInput);
      
      // Store the handler for cleanup
      editorView._inputHandler = handleInput;
    }
  }

  function togglePreview() {
    showPreview = !showPreview;
    dispatch('preview-toggle', { showPreview });
  }

  function toggleSplitView() {
    showSplitView = !showSplitView;
    dispatch('split-toggle', { showSplitView });
  }

  function toggleFullScreen() {
    isFullScreen = !isFullScreen;
    dispatch('fullscreen-toggle', { isFullScreen });
  }

  function insertMarkdown(syntax) {
    if (!editorView) return;
    
    const { from, to } = editorView.state.selection.main;
    const selectedText = editorView.state.sliceDoc(from, to);
    
    let newText = '';
    let newFrom = from;
    let newTo = to;

    switch (syntax) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        break;
      case 'code':
        newText = `\`${selectedText || 'code'}\``;
        break;
      case 'link':
        newText = `[${selectedText || 'link text'}](url)`;
        break;
      case 'h1':
        newText = `# ${selectedText || 'Heading 1'}`;
        break;
      case 'h2':
        newText = `## ${selectedText || 'Heading 2'}`;
        break;
      case 'h3':
        newText = `### ${selectedText || 'Heading 3'}`;
        break;
      case 'quote':
        newText = `> ${selectedText || 'Quote text'}`;
        break;
      case 'ul':
        newText = `- ${selectedText || 'List item'}`;
        break;
      case 'ol':
        newText = `1. ${selectedText || 'List item'}`;
        break;
    }

    editorView.dispatch({
      changes: {
        from,
        to,
        insert: newText
      },
      selection: {
        anchor: from + newText.length
      }
    });

    editorView.focus();
  }

  function renderMarkdown(text) {
    // Simple markdown rendering - you could replace this with a proper markdown parser
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*)`/gim, '<code>$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n/gim, '<br>');
  }
</script>

  <div class="markdown-editor-container flex flex-col h-full min-h-0 w-full max-w-full" class:fullscreen={isFullScreen}>
  <!-- Toolbar -->
  <div class="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
    <div class="flex items-center gap-1 flex-wrap">
      <!-- Formatting buttons -->
      <button
        on:click={() => insertMarkdown('bold')}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Bold (Ctrl+B)"
      >
        <Bold size="16" />
      </button>
      <button
        on:click={() => insertMarkdown('italic')}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Italic (Ctrl+I)"
      >
        <Italic size="16" />
      </button>
      <button
        on:click={() => insertMarkdown('code')}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Code"
      >
        <Code size="16" />
      </button>
      <button
        on:click={() => insertMarkdown('link')}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Link"
      >
        <Link size="16" />
      </button>
      
      <div class="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
      
      <button
        on:click={() => insertMarkdown('h1')}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Heading 1"
      >
        <Heading1 size="16" />
      </button>
      <button
        on:click={() => insertMarkdown('h2')}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Heading 2"
      >
        <Heading2 size="16" />
      </button>
      <button
        on:click={() => insertMarkdown('h3')}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Heading 3"
      >
        <Heading3 size="16" />
      </button>
      
      <div class="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
      
      <button
        on:click={() => insertMarkdown('quote')}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Quote"
      >
        <Quote size="16" />
      </button>
      <button
        on:click={() => insertMarkdown('ul')}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Unordered List"
      >
        <List size="16" />
      </button>
      <button
        on:click={() => insertMarkdown('ol')}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title="Ordered List"
      >
        <ListOrdered size="16" />
      </button>
    </div>

    <div class="flex items-center gap-1 flex-wrap">
      <!-- View mode buttons -->
      <button
        on:click={togglePreview}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        class:bg-blue-100={showPreview}
        class:dark:bg-blue-900={showPreview}
        title="Toggle Preview"
      >
        <Eye size="16" />
      </button>
      
      {#if !isFullScreen}
        <button
          on:click={toggleSplitView}
          class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          class:bg-blue-100={showSplitView}
          class:dark:bg-blue-900={showSplitView}
          title="Split View"
        >
          <Split size="16" />
        </button>
      {/if}
      
      <button
        on:click={toggleFullScreen}
        class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
      >
        {#if isFullScreen}
          <Minimize2 size="16" />
        {:else}
          <Maximize2 size="16" />
        {/if}
      </button>
    </div>
  </div>

  <!-- Editor and Preview Area -->
  <div class="flex-1 flex overflow-hidden min-h-0 w-full max-w-full">
    <!-- Editor -->
    <div 
      class="flex-1 {showSplitView && !isFullScreen ? 'w-1/2' : ''} {showPreview && !showSplitView ? 'hidden' : ''} min-h-0 min-w-0 overflow-hidden"
      bind:this={editorElement}
      on:click={() => editorView?.focus()}
      on:keydown={(e) => e.key === 'Enter' && editorView?.focus()}
      role="textbox"
      tabindex="0"
      aria-label="Markdown editor"
    ></div>

    <!-- Preview -->
    {#if showPreview || (showSplitView && !isFullScreen)}
      <div 
        class="flex-1 {showSplitView && !isFullScreen ? 'w-1/2 border-l border-gray-200 dark:border-gray-700' : ''} p-4 overflow-y-auto prose prose-sm max-w-none dark:prose-invert"
        bind:this={previewElement}
      >
        {#if content.trim()}
          {@html renderMarkdown(content)}
        {:else}
          <p class="text-gray-500 dark:text-gray-400 italic">Preview will appear here...</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .markdown-editor-container {
    height: 100%;
  }
  
  .markdown-editor-container.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 99999;
    background: var(--bg-primary);
  }
  
  .markdown-editor-container :global(.cm-editor) {
    height: 100%;
  }
  
  .markdown-editor-container :global(.cm-focused) {
    outline: none;
  }
</style>
