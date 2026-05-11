import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { useProjectSearch } from './useProjectSearch';

// Mock useVSCode
vi.mock('./useVSCode', () => ({
  useVSCode: () => ({
    onMessage: vi.fn((handler) => {
      // Store handler for later invocation
      mockMessageHandler = handler;
      return vi.fn();
    }),
    postMessage: vi.fn(),
  }),
}));

let mockMessageHandler: ((msg: any) => void) | null = null;

describe('useProjectSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessageHandler = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty state', () => {
    const {
      isSearching,
      query,
      results,
      currentResultIndex,
      isRegex,
      error,
      hasResults,
    } = useProjectSearch();

    expect(isSearching.value).toBe(false);
    expect(query.value).toBe('');
    expect(results.value).toEqual([]);
    expect(currentResultIndex.value).toBe(-1);
    expect(isRegex.value).toBe(false);
    expect(error.value).toBeNull();
    expect(hasResults.value).toBe(false);
  });

  it('should search with query', () => {
    const { search, query } = useProjectSearch();
    
    search('test query');
    
    // Query should be updated
    expect(query.value).toBe('test query');
  });

  it('should clear results when query is empty', () => {
    const {
      search,
      results,
      currentResultIndex,
      clearResults,
    } = useProjectSearch();

    // Set some results
    results.value = [{ filePath: '/test.html', fileName: 'test.html', line: 1, column: 1, matchText: 'test', contextBefore: '', contextAfter: '' }];
    currentResultIndex.value = 0;

    // Search with empty query should clear results
    search('');

    expect(results.value).toEqual([]);
    expect(currentResultIndex.value).toBe(-1);
  });

  it('should toggle regex mode', () => {
    const { isRegex, toggleRegex, search } = useProjectSearch();

    expect(isRegex.value).toBe(false);

    toggleRegex();
    expect(isRegex.value).toBe(true);

    toggleRegex();
    expect(isRegex.value).toBe(false);
  });

  it('should navigate to next result', () => {
    const {
      results,
      currentResultIndex,
      nextResult,
    } = useProjectSearch();

    results.value = [
      { filePath: '/a.html', fileName: 'a.html', line: 1, column: 1, matchText: 'a', contextBefore: '', contextAfter: '' },
      { filePath: '/b.html', fileName: 'b.html', line: 2, column: 1, matchText: 'b', contextBefore: '', contextAfter: '' },
      { filePath: '/c.html', fileName: 'c.html', line: 3, column: 1, matchText: 'c', contextBefore: '', contextAfter: '' },
    ];
    currentResultIndex.value = 0;

    nextResult();
    expect(currentResultIndex.value).toBe(1);

    nextResult();
    expect(currentResultIndex.value).toBe(2);

    // Should wrap around
    nextResult();
    expect(currentResultIndex.value).toBe(0);
  });

  it('should not navigate when no results', () => {
    const { results, currentResultIndex, nextResult } = useProjectSearch();

    expect(results.value.length).toBe(0);
    
    nextResult();
    
    // Should stay at -1
    expect(currentResultIndex.value).toBe(-1);
  });

  it('should navigate to previous result', () => {
    const {
      results,
      currentResultIndex,
      previousResult,
    } = useProjectSearch();

    results.value = [
      { filePath: '/a.html', fileName: 'a.html', line: 1, column: 1, matchText: 'a', contextBefore: '', contextAfter: '' },
      { filePath: '/b.html', fileName: 'b.html', line: 2, column: 1, matchText: 'b', contextBefore: '', contextAfter: '' },
    ];
    currentResultIndex.value = 1;

    previousResult();
    expect(currentResultIndex.value).toBe(0);

    // Should wrap around
    previousResult();
    expect(currentResultIndex.value).toBe(1);
  });

  it('should clear all results', () => {
    const {
      query,
      results,
      currentResultIndex,
      error,
      isRegex,
      clearResults,
    } = useProjectSearch();

    // Set some state
    query.value = 'test';
    results.value = [{ filePath: '/test.html', fileName: 'test.html', line: 1, column: 1, matchText: 'test', contextBefore: '', contextAfter: '' }];
    currentResultIndex.value = 0;
    error.value = 'some error';
    isRegex.value = true;

    clearResults();

    expect(query.value).toBe('');
    expect(results.value).toEqual([]);
    expect(currentResultIndex.value).toBe(-1);
    expect(error.value).toBeNull();
  });

  it('should compute matchLabel correctly', () => {
    const { matchLabel, query, results, currentResultIndex, error } = useProjectSearch();

    // No query
    expect(matchLabel.value).toBe('');

    // With query but no results
    query.value = 'test';
    results.value = [];
    currentResultIndex.value = -1;
    expect(matchLabel.value).toBe('No results');

    // With results
    results.value = [{ filePath: '/test.html', fileName: 'test.html', line: 1, column: 1, matchText: 'test', contextBefore: '', contextAfter: '' }];
    currentResultIndex.value = 0;
    expect(matchLabel.value).toBe('1/1');

    // With error
    error.value = 'some error';
    expect(matchLabel.value).toBe('Error');
  });

  it('should group results by file', () => {
    const { results, resultsByFile } = useProjectSearch();

    results.value = [
      { filePath: '/a.html', fileName: 'a.html', line: 1, column: 1, matchText: 'a', contextBefore: '', contextAfter: '' },
      { filePath: '/b.html', fileName: 'b.html', line: 1, column: 1, matchText: 'b', contextBefore: '', contextAfter: '' },
      { filePath: '/a.html', fileName: 'a.html', line: 5, column: 1, matchText: 'a', contextBefore: '', contextAfter: '' },
    ];

    expect(resultsByFile.value.size).toBe(2);
    expect(resultsByFile.value.get('/a.html')?.length).toBe(2);
    expect(resultsByFile.value.get('/b.html')?.length).toBe(1);
  });

  it('should handle projectSearchResults message', () => {
    const { results, currentResultIndex, isSearching } = useProjectSearch();

    // Simulate receiving projectSearchResults message
    if (mockMessageHandler) {
      mockMessageHandler({
        type: 'projectSearchResults',
        results: [
          { filePath: '/test.html', fileName: 'test.html', line: 10, column: 5, matchText: 'found', contextBefore: 'before ', contextAfter: ' after' },
        ],
      });
    }

    expect(results.value.length).toBe(1);
    expect(results.value[0].matchText).toBe('found');
    expect(currentResultIndex.value).toBe(0);
    expect(isSearching.value).toBe(false);
  });

  it('should handle projectSearchError message', () => {
    const { results, currentResultIndex, isSearching, error } = useProjectSearch();

    // Simulate receiving error message
    if (mockMessageHandler) {
      mockMessageHandler({
        type: 'projectSearchError',
        error: 'Search failed: invalid regex',
      });
    }

    expect(results.value).toEqual([]);
    expect(currentResultIndex.value).toBe(-1);
    expect(isSearching.value).toBe(false);
    expect(error.value).toBe('Search failed: invalid regex');
  });
});
