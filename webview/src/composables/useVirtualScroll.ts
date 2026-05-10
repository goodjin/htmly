/**
 * useVirtualScroll Composable
 * 
 * Implements virtual scrolling for large documents using Intersection Observer.
 * Renders only visible blocks + buffer zone for optimal performance.
 */

import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import type { Editor } from '@tiptap/vue-3';

interface VirtualScrollOptions {
  /** Buffer size: number of extra blocks to render above/below visible area */
  bufferSize?: number;
  /** Root margin for Intersection Observer */
  rootMargin?: string;
  /** Callback when visible blocks change */
  onVisibleBlocksChange?: (visibleBlockIds: Set<string>) => void;
  /** Minimum block height for calculation */
  estimatedBlockHeight?: number;
}

interface BlockInfo {
  id: string;
  index: number;
  pos: number;
  isVisible: boolean;
  element: HTMLElement | null;
}

const DEFAULT_OPTIONS: Required<VirtualScrollOptions> = {
  bufferSize: 5,
  rootMargin: '200px 0px',
  onVisibleBlocksChange: () => {},
  estimatedBlockHeight: 50,
};

/**
 * Composable for managing virtual scrolling
 */
export function useVirtualScroll(
  editor: () => Editor | null | undefined,
  options: VirtualScrollOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State
  const isActive = ref(false);
  const visibleBlockIds = ref<Set<string>>(new Set());
  const totalBlocks = ref(0);
  const documentSize = ref(0);
  const visibleCount = ref(0);
  
  // Intersection Observer instance
  let intersectionObserver: IntersectionObserver | null = null;
  
  // Block tracking
  const blocks = ref<Map<string, BlockInfo>>(new Map());
  const blockElements = ref<Map<HTMLElement, string>>(new Map());
  
  // Scroll container reference
  let scrollContainer: HTMLElement | null = null;
  
  /**
   * Calculate block statistics from editor content
   */
  function calculateStats(): { size: number; blockCount: number } {
    const ed = editor();
    if (!ed) return { size: 0, blockCount: 0 };
    
    const html = ed.getHTML();
    const size = new Blob([html]).size;
    
    // Count block elements
    const editorDom = ed.view.dom as HTMLElement;
    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table, [data-node-type]';
    const blockElements = editorDom.querySelectorAll(blockSelector);
    
    return { size, blockCount: blockElements.length };
  }
  
  /**
   * Initialize block tracking for the editor
   */
  function initializeBlocks() {
    const ed = editor();
    if (!ed) return;
    
    const editorDom = ed.view.dom as HTMLElement;
    scrollContainer = editorDom.closest('.tiptap-editor') as HTMLElement;
    
    // Clear existing tracking
    blocks.value.clear();
    blockElements.value.clear();
    
    // Find all block elements
    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table, [data-node-type]';
    const blockEls = editorDom.querySelectorAll(blockSelector);
    
    blockEls.forEach((el, index) => {
      const id = `block-${index}`;
      const blockInfo: BlockInfo = {
        id,
        index,
        pos: index,
        isVisible: false,
        element: el as HTMLElement,
      };
      blocks.value.set(id, blockInfo);
      blockElements.value.set(el as HTMLElement, id);
    });
    
    totalBlocks.value = blocks.value.size;
    
    // Set up Intersection Observer
    setupIntersectionObserver();
  }
  
  /**
   * Set up Intersection Observer for visibility tracking
   */
  function setupIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }
    
    if (!scrollContainer) return;
    
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        const newVisibleIds = new Set<string>();
        
        entries.forEach((entry) => {
          const id = blockElements.value.get(entry.target as HTMLElement);
          if (id) {
            const blockInfo = blocks.value.get(id);
            if (blockInfo) {
              blockInfo.isVisible = entry.isIntersecting;
              blocks.value.set(id, blockInfo);
              
              if (entry.isIntersecting) {
                newVisibleIds.add(id);
              }
            }
          }
        });
        
        // Also add buffer blocks around visible ones
        const bufferIds = expandWithBuffer(newVisibleIds, opts.bufferSize);
        
        visibleBlockIds.value = bufferIds;
        visibleCount.value = bufferIds.size;
        
        // Apply/remove virtualization classes
        applyVirtualizationClasses(bufferIds);
        
        // Notify callback
        opts.onVisibleBlocksChange(bufferIds);
      },
      {
        root: scrollContainer,
        rootMargin: opts.rootMargin,
        threshold: 0,
      }
    );
    
    // Observe all block elements
    blocks.value.forEach((block) => {
      if (block.element) {
        intersectionObserver?.observe(block.element);
      }
    });
  }
  
  /**
   * Expand visible blocks with buffer zone
   */
  function expandWithBuffer(visibleIds: Set<string>, buffer: number): Set<string> {
    const result = new Set(visibleIds);
    
    visibleIds.forEach((id) => {
      const block = blocks.value.get(id);
      if (!block) return;
      
      // Add blocks before
      for (let i = 1; i <= buffer; i++) {
        const beforeIndex = block.index - i;
        const beforeId = findBlockByIndex(beforeIndex);
        if (beforeId) result.add(beforeId);
      }
      
      // Add blocks after
      for (let i = 1; i <= buffer; i++) {
        const afterIndex = block.index + i;
        const afterId = findBlockByIndex(afterIndex);
        if (afterId) result.add(afterId);
      }
    });
    
    return result;
  }
  
  /**
   * Find block by index
   */
  function findBlockByIndex(index: number): string | null {
    for (const [id, block] of blocks.value) {
      if (block.index === index) return id;
    }
    return null;
  }
  
  /**
   * Apply virtualization CSS classes to blocks
   * Uses CSS clip/transform approach instead of display:none to preserve layout flow
   */
  function applyVirtualizationClasses(visibleIds: Set<string>) {
    blocks.value.forEach((block, id) => {
      if (!block.element) return;
      
      const shouldBeVisible = visibleIds.has(id);
      const isCurrentlyHidden = block.element.classList.contains('virtualized-hidden');
      const isCurrentlyVisible = block.element.classList.contains('virtualized-visible');
      
      if (shouldBeVisible && (isCurrentlyHidden || !isCurrentlyVisible)) {
        // Make visible - remove hidden class, add visible class
        // CSS handles the actual visibility (clip approach)
        block.element.classList.remove('virtualized-hidden');
        block.element.classList.add('virtualized-visible');
        // Clear any inline styles that might conflict
        block.element.style.removeProperty('display');
      } else if (!shouldBeVisible && !isCurrentlyHidden) {
        // Make invisible using CSS clip approach
        // This preserves layout flow while hiding visually
        block.element.classList.add('virtualized-hidden');
        block.element.classList.remove('virtualized-visible');
      }
    });
  }
  
  /**
   * Update block tracking when editor content changes
   */
  function updateBlocks() {
    nextTick(() => {
      const stats = calculateStats();
      documentSize.value = stats.size;
      totalBlocks.value = stats.blockCount;
      
      // Re-initialize blocks
      initializeBlocks();
    });
  }
  
  /**
   * Activate virtual scrolling for large documents
   */
  function activate() {
    const stats = calculateStats();
    
    // Activate if document exceeds 100KB
    const shouldActivate = stats.size >= 100 * 1024;
    
    if (shouldActivate !== isActive.value) {
      isActive.value = shouldActivate;
      
      if (shouldActivate) {
        console.log(`[VirtualScroll] Activated: ${(stats.size / 1024).toFixed(1)}KB, ${stats.blockCount} blocks`);
        updateBlocks();
      } else {
        console.log('[VirtualScroll] Deactivated');
        // Remove all virtualization classes and reset inline styles
        blocks.value.forEach((block) => {
          if (block.element) {
            block.element.classList.remove('virtualized-hidden', 'virtualized-visible');
            block.element.style.removeProperty('display');
            block.element.style.removeProperty('position');
            block.element.style.removeProperty('clip');
            block.element.style.removeProperty('width');
            block.element.style.removeProperty('height');
            block.element.style.removeProperty('padding');
            block.element.style.removeProperty('margin');
            block.element.style.removeProperty('overflow');
            block.element.style.removeProperty('white-space');
            block.element.style.removeProperty('border');
            block.element.style.removeProperty('pointer-events');
            block.element.style.removeProperty('opacity');
          }
        });
      }
    }
  }
  
  /**
   * Cleanup on unmount
   */
  function cleanup() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
    
    blocks.value.clear();
    blockElements.value.clear();
  }
  
  // Watch for editor changes
  watch(editor, (newEditor, oldEditor) => {
    if (oldEditor) {
      cleanup();
    }
    if (newEditor) {
      // Editor is ready
      nextTick(() => {
        const stats = calculateStats();
        documentSize.value = stats.size;
        totalBlocks.value = stats.blockCount;
        
        // Check if should activate
        if (stats.size >= 100 * 1024) {
          initializeBlocks();
          isActive.value = true;
        }
      });
    }
  });
  
  onBeforeUnmount(() => {
    cleanup();
  });
  
  return {
    isActive,
    visibleBlockIds,
    visibleCount,
    totalBlocks,
    documentSize,
    activate,
    updateBlocks,
    cleanup,
    calculateStats,
  };
}
