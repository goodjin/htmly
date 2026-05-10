/**
 * useLazyExtensionLoader Composable
 * 
 * Implements lazy loading for non-critical Tiptap extensions.
 * Extensions are loaded on first use, not at startup.
 * 
 * Non-critical extensions:
 * - Footnote
 * - Embed
 * - LinkPreview
 */

import { ref, computed } from 'vue';
import type { Editor } from '@tiptap/vue-3';

// Extension type identifiers
export type LazyExtensionType = 'footnote' | 'embed' | 'linkPreview';

interface LazyExtensionConfig {
  type: LazyExtensionType;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

// Extension import paths (for dynamic imports)
const EXTENSION_PATHS: Record<LazyExtensionType, () => Promise<any>> = {
  footnote: () => import('../extensions/Footnote').then(m => ({ Footnote: m.Footnote, Footnotes: m.Footnotes, FootnotePlugin: m.FootnotePlugin })),
  embed: () => import('../extensions/Embed').then(m => ({ Embed: m.Embed, toEmbedUrl: m.toEmbedUrl })),
  linkPreview: () => import('../extensions/LinkPreview').then(m => ({ LinkPreview: m.LinkPreview })),
};

/**
 * Composable for lazy loading extensions
 */
export function useLazyExtensionLoader(editor: () => Editor | null | undefined) {
  // Extension state tracking
  const extensions = ref<Map<LazyExtensionType, LazyExtensionConfig>>(new Map([
    ['footnote', { type: 'footnote', loaded: false, loading: false, error: null }],
    ['embed', { type: 'embed', loaded: false, loading: false, error: null }],
    ['linkPreview', { type: 'linkPreview', loaded: false, loading: false, error: null }],
  ]));
  
  // Loaded extension instances
  const loadedExtensions = ref<Map<LazyExtensionType, any>>(new Map());
  
  // Loading state
  const isLoading = computed(() => {
    for (const ext of extensions.value.values()) {
      if (ext.loading) return true;
    }
    return false;
  });
  
  // All extensions loaded?
  const allLoaded = computed(() => {
    for (const ext of extensions.value.values()) {
      if (!ext.loaded) return false;
    }
    return true;
  });
  
  // Loading progress
  const loadingProgress = computed(() => {
    let loaded = 0;
    let total = 0;
    for (const ext of extensions.value.values()) {
      total++;
      if (ext.loaded) loaded++;
    }
    return { loaded, total };
  });
  
  /**
   * Load a specific extension
   */
  async function loadExtension(type: LazyExtensionType): Promise<boolean> {
    const ed = editor();
    if (!ed) return false;
    
    const ext = extensions.value.get(type);
    if (!ext) {
      console.warn(`[LazyLoader] Unknown extension type: ${type}`);
      return false;
    }
    
    // Already loaded
    if (ext.loaded) {
      return true;
    }
    
    // Already loading
    if (ext.loading) {
      return false;
    }
    
    // Mark as loading
    ext.loading = true;
    ext.error = null;
    extensions.value.set(type, { ...ext });
    
    try {
      console.log(`[LazyLoader] Loading extension: ${type}`);
      
      const loadFn = EXTENSION_PATHS[type];
      const modules = await loadFn();
      
      // Store loaded extension
      loadedExtensions.value.set(type, modules);
      
      // Mark as loaded
      ext.loaded = true;
      ext.loading = false;
      extensions.value.set(type, { ...ext });
      
      console.log(`[LazyLoader] Successfully loaded: ${type}`);
      return true;
    } catch (error) {
      console.error(`[LazyLoader] Failed to load extension: ${type}`, error);
      
      ext.loading = false;
      ext.error = error instanceof Error ? error.message : 'Unknown error';
      extensions.value.set(type, { ...ext });
      
      return false;
    }
  }
  
  /**
   * Load extension and register with editor
   * Uses editor.extend() to create a new editor instance with the additional extension
   */
  async function loadAndRegister(type: LazyExtensionType): Promise<boolean> {
    const ed = editor();
    if (!ed) return false;
    
    const success = await loadExtension(type);
    if (!success) return false;
    
    // Get the loaded extension module
    const modules = loadedExtensions.value.get(type);
    if (!modules) return false;
    
    // Extract the extension from the modules based on type
    let extensionToRegister: any = null;
    
    switch (type) {
      case 'footnote':
        // Footnote extension includes Footnote and Footnotes node/extension
        extensionToRegister = modules.Footnote || modules.Footnotes;
        break;
      case 'embed':
        extensionToRegister = modules.Embed;
        break;
      case 'linkPreview':
        extensionToRegister = modules.LinkPreview;
        break;
    }
    
    if (!extensionToRegister) {
      console.warn(`[LazyLoader] Could not find extension for type: ${type}`);
      return false;
    }
    
    try {
      // Use editor.extend() to create a new editor with the additional extension
      // This preserves all existing editor state and options
      const newEditor = ed.extend({
        extensions: [extensionToRegister],
      });
      
      // Replace the current editor reference
      // Note: The actual replacement needs to be handled by the caller
      // since we can't mutate the editor reference directly
      console.log(`[LazyLoader] Successfully registered extension: ${type}`);
      
      // Store the extended editor for reference
      // The caller should update the editor reference
      loadedExtensions.value.set(type, { ...modules, editor: newEditor });
      
      return true;
    } catch (error) {
      console.error(`[LazyLoader] Failed to register extension: ${type}`, error);
      const ext = extensions.value.get(type);
      if (ext) {
        ext.error = error instanceof Error ? error.message : 'Failed to register extension';
        extensions.value.set(type, { ...ext });
      }
      return false;
    }
  }
  
  /**
   * Check if extension is loaded
   */
  function isLoaded(type: LazyExtensionType): boolean {
    return extensions.value.get(type)?.loaded ?? false;
  }
  
  /**
   * Check if extension is loading
   */
  function isExtensionLoading(type: LazyExtensionType): boolean {
    return extensions.value.get(type)?.loading ?? false;
  }
  
  /**
   * Get extension error
   */
  function getError(type: LazyExtensionType): string | null {
    return extensions.value.get(type)?.error ?? null;
  }
  
  /**
   * Preload all lazy extensions (call on idle)
   */
  async function preloadAll(): Promise<void> {
    const types: LazyExtensionType[] = ['footnote', 'embed', 'linkPreview'];
    await Promise.all(types.map(type => loadExtension(type)));
  }
  
  /**
   * Get loaded extension module
   */
  function getExtension(type: LazyExtensionType): any | null {
    return loadedExtensions.value.get(type) ?? null;
  }
  
  /**
   * Detect if user is about to use an extension (heuristic)
   * Returns the extension type that should be loaded
   */
  function detectExtensionUse(content: string): LazyExtensionType | null {
    // Check for footnote indicators
    if (/\[\^/.test(content)) {
      return 'footnote';
    }
    
    // Check for embed URLs
    if (/\b(youtube\.com|vimeo\.com|codepen\.io|github\.com)/i.test(content)) {
      return 'embed';
    }
    
    // Check for potential link preview patterns
    if (/https?:\/\/[^\s]+/i.test(content)) {
      return 'linkPreview';
    }
    
    return null;
  }
  
  return {
    extensions,
    loadedExtensions,
    isLoading,
    allLoaded,
    loadingProgress,
    loadExtension,
    loadAndRegister,
    isLoaded,
    isExtensionLoading,
    getError,
    preloadAll,
    getExtension,
    detectExtensionUse,
  };
}
