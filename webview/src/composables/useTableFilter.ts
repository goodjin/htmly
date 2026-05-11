/**
 * useTableFilter Composable
 * 
 * Manages filter state and logic for table row filtering.
 * Supports multiple filter criteria with case-insensitive matching.
 */

import { ref, computed } from 'vue';

export interface TableFilterState {
  /** Filter search terms (split by commas or spaces) */
  terms: string[];
  /** Whether filtering is active */
  isActive: boolean;
  /** The original unparsed filter string */
  rawFilter: string;
}

export interface FilteredRowInfo {
  /** Row index in the original table */
  originalIndex: number;
  /** Whether this row matches all filter criteria */
  isVisible: boolean;
}

/**
 * Composable for managing table row filtering
 */
export function useTableFilter() {
  // Filter state
  const filterTerms = ref<string[]>([]);
  const rawFilter = ref('');

  /**
   * Check if any filters are active
   */
  const isActive = computed(() => filterTerms.value.length > 0);

  /**
   * Update filter from user input
   * Supports multiple criteria separated by commas or spaces
   * Multiple criteria use AND logic (row must match all terms)
   */
  function setFilter(input: string) {
    rawFilter.value = input;
    
    if (!input.trim()) {
      filterTerms.value = [];
      return;
    }

    // Split by commas or spaces and filter out empty strings
    const terms = input
      .split(/[,\s]+/)
      .map(term => term.trim())
      .filter(term => term.length > 0);
    
    filterTerms.value = terms;
  }

  /**
   * Clear all filters
   */
  function clearFilter() {
    filterTerms.value = [];
    rawFilter.value = '';
  }

  /**
   * Check if a row matches the current filter criteria
   * Uses case-insensitive matching and AND logic for multiple terms
   * 
   * @param rowCells - Array of cell text content from the row
   * @returns true if row matches all filter criteria, false otherwise
   */
  function matchesFilter(rowCells: string[]): boolean {
    if (filterTerms.value.length === 0) {
      return true; // No filters = show all
    }

    // All terms must be found in at least one cell (case-insensitive)
    return filterTerms.value.every(term => {
      const lowerTerm = term.toLowerCase();
      return rowCells.some(cell => {
        const cellText = extractCellText(cell);
        return cellText.toLowerCase().includes(lowerTerm);
      });
    });
  }

  /**
   * Extract text content from a cell (handles HTML content)
   */
  function extractCellText(cell: string): string {
    // Create a temporary element to strip HTML tags
    const temp = document.createElement('div');
    temp.innerHTML = cell;
    return temp.textContent || temp.innerText || '';
  }

  /**
   * Filter table rows and return visibility information
   * 
   * @param tableElement - The table HTML element to filter
   * @returns Array of FilteredRowInfo for tbody rows
   */
  function filterTableRows(tableElement: HTMLElement): FilteredRowInfo[] {
    const tbody = tableElement.querySelector('tbody');
    if (!tbody) return [];

    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    return rows.map((row, index) => {
      const cells = Array.from(row.querySelectorAll('td'));
      const cellTexts = cells.map(cell => cell.innerHTML);
      const isVisible = matchesFilter(cellTexts);
      
      return {
        originalIndex: index,
        isVisible,
      };
    });
  }

  /**
   * Apply filter visibility to table rows
   * Modifies the DOM directly to show/hide rows
   * 
   * @param tableElement - The table HTML element to filter
   */
  function applyFilterToTable(tableElement: HTMLElement): void {
    const tbody = tableElement.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const cellTexts = cells.map(cell => cell.innerHTML);
      const shouldShow = matchesFilter(cellTexts);
      
      // Use CSS display property for filtering
      (row as HTMLElement).style.display = shouldShow ? '' : 'none';
    });
  }

  /**
   * Highlight matching text in cells
   * 
   * @param tableElement - The table HTML element
   * @param highlightClass - CSS class to apply for highlighting
   */
  function highlightMatches(tableElement: HTMLElement, highlightClass: string = 'table-filter-highlight'): void {
    if (filterTerms.value.length === 0) {
      // Remove all highlights when no filter
      const highlights = tableElement.querySelectorAll(`.${highlightClass}`);
      highlights.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        }
      });
      return;
    }

    const cells = tableElement.querySelectorAll('td, th');
    
    cells.forEach(cell => {
      const cellElement = cell as HTMLElement;
      let cellHtml = cellElement.innerHTML;
      
      // Skip if already contains highlight
      if (cellHtml.includes(`class="${highlightClass}"`)) return;
      
      // Apply highlighting for each term
      filterTerms.value.forEach(term => {
        const escapedTerm = escapeRegex(term);
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        cellHtml = cellHtml.replace(regex, `<span class="${highlightClass}">$1</span>`);
      });
      
      cellElement.innerHTML = cellHtml;
    });
  }

  /**
   * Escape special regex characters in a string
   */
  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get count of visible rows after filtering
   * 
   * @param tableElement - The table HTML element
   * @returns Number of visible rows
   */
  function getVisibleRowCount(tableElement: HTMLElement): number {
    const tbody = tableElement.querySelector('tbody');
    if (!tbody) return 0;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    return rows.filter(row => (row as HTMLElement).style.display !== 'none').length;
  }

  /**
   * Get total row count
   * 
   * @param tableElement - The table HTML element
   * @returns Total number of rows in tbody
   */
  function getTotalRowCount(tableElement: HTMLElement): number {
    const tbody = tableElement.querySelector('tbody');
    if (!tbody) return 0;
    
    return tbody.querySelectorAll('tr').length;
  }

  return {
    // State
    filterTerms,
    rawFilter,
    isActive,
    
    // Actions
    setFilter,
    clearFilter,
    
    // Table operations
    filterTableRows,
    applyFilterToTable,
    highlightMatches,
    matchesFilter,
    
    // Utilities
    getVisibleRowCount,
    getTotalRowCount,
    extractCellText,
  };
}

export type UseTableFilter = ReturnType<typeof useTableFilter>;
