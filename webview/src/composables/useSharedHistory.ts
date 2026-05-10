/**
 * Shared History Composable
 * 
 * Provides unified undo/redo history that can be shared between
 * TiptapEditor (Visual mode) and CodeEditor (Source mode).
 * 
 * This allows undo in Visual mode to revert Source changes and vice versa.
 */
import { ref, shallowRef, computed, markRaw, readonly } from 'vue';

export interface HistoryEntry {
  /** The HTML content at this point in history */
  content: string;
  /** Timestamp when this entry was created */
  timestamp: number;
  /** Cursor position in the editor (0-1 percentage) */
  cursorPosition?: number;
}

const MAX_HISTORY_ENTRIES = 100;

// Module-level state for shared history
const historyStack = shallowRef<readonly HistoryEntry[]>([]);
const currentIndex = ref(-1);
const maxEntries = ref(MAX_HISTORY_ENTRIES);
const isUndoing = ref(false);
const isRedoing = ref(false);
const lastContent = ref('');

/**
 * Shared history composable for cross-editor undo/redo
 * Uses module-level state to be accessible across components
 */
export function useSharedHistory() {
  /**
   * Check if undo is available
   */
  const canUndo = computed(() => currentIndex.value > 0);

  /**
   * Check if redo is available
   */
  const canRedo = computed(() => currentIndex.value < historyStack.value.length - 1);

  /**
   * Push a new entry to history
   * Only adds if content differs from last entry
   */
  function push(content: string, cursorPosition?: number): void {
    // Don't push during undo/redo operations
    if (isUndoing.value || isRedoing.value) return;
    
    // Don't push if content hasn't changed
    if (content === lastContent.value) return;
    
    lastContent.value = content;

    // Clear any redo history when new entry is pushed
    let newStack: readonly HistoryEntry[] = historyStack.value;
    if (currentIndex.value < historyStack.value.length - 1) {
      newStack = historyStack.value.slice(0, currentIndex.value + 1) as readonly HistoryEntry[];
    }

    // Create new entry
    const entry: HistoryEntry = {
      content,
      timestamp: Date.now(),
      cursorPosition,
    };

    // Add to history
    newStack = [...newStack, markRaw(entry)];
    historyStack.value = newStack;
    currentIndex.value = historyStack.value.length - 1;

    // Trim history if it exceeds max entries
    if (historyStack.value.length > maxEntries.value) {
      const overflow = historyStack.value.length - maxEntries.value;
      historyStack.value = historyStack.value.slice(overflow) as readonly HistoryEntry[];
      currentIndex.value = Math.max(0, currentIndex.value - overflow);
    }
  }

  /**
   * Undo to previous state
   * Returns the content at the previous position, or null if can't undo
   */
  function undo(currentContent: string): string | null {
    if (!canUndo.value) return null;

    isUndoing.value = true;
    try {
      // Save current content before moving back (for potential redo)
      const currentEntry = historyStack.value[currentIndex.value];
      if (currentEntry && currentEntry.content !== currentContent) {
        // We've made changes since the last history entry
        // Insert current content as a new entry for redo
        const newStack = [
          ...historyStack.value.slice(0, currentIndex.value + 1),
          { content: currentContent, timestamp: Date.now() } as HistoryEntry,
          ...historyStack.value.slice(currentIndex.value + 1),
        ];
        historyStack.value = newStack as readonly HistoryEntry[];
      }

      currentIndex.value--;
      const entry = historyStack.value[currentIndex.value];
      if (entry) {
        lastContent.value = entry.content;
        return entry.content;
      }
      return null;
    } finally {
      isUndoing.value = false;
    }
  }

  /**
   * Redo to next state
   * Returns the content at the next position, or null if can't redo
   */
  function redo(currentContent: string): string | null {
    if (!canRedo.value) return null;

    isRedoing.value = true;
    try {
      currentIndex.value++;
      const entry = historyStack.value[currentIndex.value];
      if (entry) {
        lastContent.value = entry.content;
        return entry.content;
      }
      return null;
    } finally {
      isRedoing.value = false;
    }
  }

  /**
   * Initialize history with content
   * Sets up the initial state
   */
  function initialize(content: string): void {
    historyStack.value = [{
      content,
      timestamp: Date.now(),
    }] as readonly HistoryEntry[];
    currentIndex.value = 0;
    lastContent.value = content;
  }

  /**
   * Clear all history
   */
  function clear(): void {
    historyStack.value = [];
    currentIndex.value = -1;
    lastContent.value = '';
  }

  /**
   * Get the current history entry
   */
  const currentEntry = computed(() => {
    if (currentIndex.value >= 0 && currentIndex.value < historyStack.value.length) {
      return historyStack.value[currentIndex.value];
    }
    return null;
  });

  /**
   * Get history size
   */
  const historySize = computed(() => historyStack.value.length);

  /**
   * Get current position in history
   */
  const position = computed(() => currentIndex.value);

  /**
   * Get cursor position from current history entry
   */
  const cursorPosition = computed(() => {
    const entry = currentEntry.value;
    return entry?.cursorPosition;
  });

  return {
    // State
    canUndo,
    canRedo,
    currentEntry,
    historySize,
    position,
    historyStack: readonly(historyStack),
    cursorPosition,
    
    // Actions
    push,
    undo,
    redo,
    initialize,
    clear,
  };
}
