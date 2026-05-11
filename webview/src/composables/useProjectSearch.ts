/**
 * Composable for project-wide search functionality.
 * Handles searching across multiple HTML files in the workspace.
 */

import { ref, computed } from 'vue';
import type { SearchResult } from '../../../src/shared/types';
import { useVSCode } from './useVSCode';

export function useProjectSearch() {
  const { onMessage, postMessage } = useVSCode();

  // Search state
  const isSearching = ref(false);
  const query = ref('');
  const results = ref<SearchResult[]>([]);
  const currentResultIndex = ref(-1);
  const isRegex = ref(false);
  const error = ref<string | null>(null);

  // Computed properties
  const hasResults = computed(() => results.value.length > 0);
  const currentResult = computed(() => 
    currentResultIndex.value >= 0 && currentResultIndex.value < results.value.length
      ? results.value[currentResultIndex.value]
      : null
  );
  const resultsCount = computed(() => results.value.length);
  const matchLabel = computed(() => {
    if (!query.value) return '';
    if (error.value) return 'Error';
    if (!hasResults.value) return 'No results';
    return `${currentResultIndex.value + 1}/${results.value.length}`;
  });

  // Debounce timer
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Escape special regex characters in a string for literal matching
   */
  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Perform a project-wide search
   */
  function search(searchQuery: string, useRegex: boolean = false) {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    query.value = searchQuery;
    isRegex.value = useRegex;

    if (!searchQuery.trim()) {
      clearResults();
      return;
    }

    // Debounce search requests
    searchDebounceTimer = setTimeout(() => {
      isSearching.value = true;
      error.value = null;

      postMessage({
        type: 'projectSearch',
        query: searchQuery,
        isRegex: useRegex,
      });
    }, 300);
  }

  /**
   * Navigate to the next search result
   */
  function nextResult() {
    if (!hasResults.value) return;
    currentResultIndex.value = (currentResultIndex.value + 1) % results.value.length;
  }

  /**
   * Navigate to the previous search result
   */
  function previousResult() {
    if (!hasResults.value) return;
    currentResultIndex.value = (currentResultIndex.value - 1 + results.value.length) % results.value.length;
  }

  /**
   * Jump to a specific search result
   */
  function goToResult(index: number) {
    if (index >= 0 && index < results.value.length) {
      currentResultIndex.value = index;
      openCurrentResult();
    }
  }

  /**
   * Open the current search result in the editor
   */
  function openCurrentResult() {
    const result = currentResult.value;
    if (result) {
      postMessage({
        type: 'openFile',
        filePath: result.filePath,
        line: result.line,
        column: result.column,
      });
    }
  }

  /**
   * Clear all search results
   */
  function clearResults() {
    results.value = [];
    currentResultIndex.value = -1;
    error.value = null;
    isSearching.value = false;
    query.value = '';
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
  }

  /**
   * Toggle regex mode
   */
  function toggleRegex() {
    isRegex.value = !isRegex.value;
    if (query.value) {
      search(query.value, isRegex.value);
    }
  }

  /**
   * Get results grouped by file
   */
  const resultsByFile = computed(() => {
    const grouped = new Map<string, SearchResult[]>();
    for (const result of results.value) {
      const existing = grouped.get(result.filePath);
      if (existing) {
        existing.push(result);
      } else {
        grouped.set(result.filePath, [result]);
      }
    }
    return grouped;
  });

  // Register message handlers
  onMessage((msg) => {
    switch (msg.type) {
      case 'projectSearchResults':
        results.value = msg.results;
        currentResultIndex.value = msg.results.length > 0 ? 0 : -1;
        isSearching.value = false;
        break;

      case 'projectSearchError':
        error.value = msg.error;
        results.value = [];
        currentResultIndex.value = -1;
        isSearching.value = false;
        break;
    }
  });

  return {
    // State
    isSearching,
    query,
    results,
    currentResultIndex,
    isRegex,
    error,
    
    // Computed
    hasResults,
    currentResult,
    resultsCount,
    matchLabel,
    resultsByFile,
    
    // Methods
    search,
    nextResult,
    previousResult,
    goToResult,
    openCurrentResult,
    clearResults,
    toggleRegex,
  };
}
