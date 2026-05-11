import { ref, computed, type Ref } from 'vue';
import type { Editor } from '@tiptap/core';
import type { SortState } from '../extensions/TableSort';

/**
 * Sort direction for table columns
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * Table sorting state
 */
export interface TableSortState {
  /** The column index that is currently sorted (0-based) */
  columnIndex: number;
  /** Sort direction */
  direction: SortDirection;
  /** Sort priority (for multi-sort) */
  priority?: number;
  /** Whether the header row should be excluded from sorting */
  excludeHeader: boolean;
}

/**
 * Composable for managing table column sorting state and actions
 */
export function useTableSort(editor: Ref<Editor | undefined>) {
  /** Currently sorted column index, or null if no column is sorted */
  const sortedColumn = ref<number | null>(null);
  
  /** Current sort direction */
  const sortDirection = ref<SortDirection>(null);

  /** Multiple sort columns (for multi-sort) */
  const multiSortColumns = ref<SortState[]>([]);

  /** Whether the header row should be excluded from sorting */
  const excludeHeader = ref(true);

  /** Computed: whether a column is currently sorted */
  const isSorted = computed(() => sortedColumn.value !== null);

  /** Computed: whether multi-sort is active */
  const isMultiSortActive = computed(() => multiSortColumns.value.length > 1);

  /**
   * Get the current sort state for a given column index
   */
  function getSortState(columnIndex: number): SortDirection {
    if (sortedColumn.value === columnIndex) {
      return sortDirection.value;
    }
    return null;
  }

  /**
   * Get the sort priority for a column (for multi-sort display)
   */
  function getSortPriority(columnIndex: number): number | null {
    const sort = multiSortColumns.value.find(s => s.columnIndex === columnIndex);
    return sort?.priority ?? null;
  }

  /**
   * Check if a column has a secondary sort (for multi-sort display)
   */
  function isSecondarySort(columnIndex: number): boolean {
    return multiSortColumns.value.some(s => s.columnIndex === columnIndex && s.priority && s.priority > 1);
  }

  /**
   * Sort the table by the specified column
   * @param columnIndex 0-based column index to sort by
   * @param direction Sort direction ('asc' for ascending, 'desc' for descending)
   * @param addToMultiSort Whether to add to existing sorts (for Shift+click)
   */
  function sortByColumn(columnIndex: number, direction: 'asc' | 'desc', addToMultiSort = false) {
    if (!editor.value) return;

    // Execute the sort command
    editor.value.chain().focus().sortTableByColumn({
      columnIndex,
      direction,
      excludeHeader: excludeHeader.value,
      addToMultiSort,
    }).run();

    // Update the local state
    sortedColumn.value = columnIndex;
    sortDirection.value = direction;
    
    // Update multi-sort state from editor storage
    updateMultiSortState();
  }

  /**
   * Toggle sort direction for a column
   * If clicking on a different column, starts with ascending
   * If clicking on the same column, toggles between asc and desc
   * @param columnIndex The column to toggle sort
   * @param addToMultiSort Whether to add to existing sorts (for Shift+click)
   */
  function toggleSort(columnIndex: number, addToMultiSort = false) {
    if (sortedColumn.value === columnIndex && !addToMultiSort) {
      // Toggle direction on same column (only for single sort)
      const newDirection = sortDirection.value === 'asc' ? 'desc' : 'asc';
      sortByColumn(columnIndex, newDirection, false);
    } else {
      // Start with ascending for new column
      sortByColumn(columnIndex, 'asc', addToMultiSort);
    }
  }

  /**
   * Sort by multiple columns
   * @param sorts Array of sort states, applied in order
   */
  function sortByColumns(sorts: SortState[]) {
    if (!editor.value) return;

    editor.value.chain().focus().sortTableMultiColumn({
      sorts,
      excludeHeader: excludeHeader.value,
    }).run();

    // Update local state
    if (sorts.length > 0) {
      sortedColumn.value = sorts[0].columnIndex;
      sortDirection.value = sorts[0].direction;
    }
    multiSortColumns.value = sorts;
  }

  /**
   * Clear sorting state
   */
  function clearSort() {
    sortedColumn.value = null;
    sortDirection.value = null;
    multiSortColumns.value = [];
    
    editor.value?.chain().focus().clearTableSort().run();
  }

  /**
   * Update multi-sort state from editor storage
   */
  function updateMultiSortState() {
    if (!editor.value) return;
    
    const tableSort = editor.value.extensionManager.extensions.find(
      ext => ext.name === 'tableSort'
    );
    
    if (tableSort?.storage?.sortStates) {
      // Get sort states for all tables - for now just use the first one
      const states = Object.values(tableSort.storage.sortStates) as SortState[][];
      if (states.length > 0) {
        multiSortColumns.value = states[0];
      }
    }
  }

  /**
   * Set whether to exclude header row from sorting
   */
  function setExcludeHeader(exclude: boolean) {
    excludeHeader.value = exclude;
  }

  /**
   * Check if cursor is inside a table
   */
  function isInsideTable(): boolean {
    return editor.value?.isActive('table') ?? false;
  }

  /**
   * Check if cursor is inside a table header cell
   */
  function isInsideHeader(): boolean {
    return editor.value?.isActive('tableHeader') ?? false;
  }

  /**
   * Get the column index of the current cursor position (inside a table)
   */
  function getCurrentColumnIndex(): number | null {
    if (!editor.value) return null;
    
    const { selection } = editor.value.state;
    const { $from } = selection;
    
    // Walk up to find the table cell
    for (let depth = $from.depth; depth >= 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        // Get the column index by walking through siblings
        const tableRow = $from.node(depth - 1);
        if (tableRow && tableRow.type.name === 'tableRow') {
          for (let i = 0; i < tableRow.childCount; i++) {
            if (tableRow.child(i).type.name === node.type.name &&
                tableRow.child(i).nodeSize > $from.depth - depth) {
              // Check if this is our cell by content position
              let pos = $from.before(depth);
              for (let j = 0; j < i; j++) {
                pos += tableRow.child(j).nodeSize;
              }
              if (pos <= $from.pos && $from.pos < pos + node.nodeSize) {
                return i;
              }
            }
          }
        }
        break;
      }
    }
    
    return null;
  }

  return {
    sortedColumn,
    sortDirection,
    multiSortColumns,
    excludeHeader,
    isSorted,
    isMultiSortActive,
    getSortState,
    getSortPriority,
    isSecondarySort,
    sortByColumn,
    sortByColumns,
    toggleSort,
    clearSort,
    setExcludeHeader,
    isInsideTable,
    isInsideHeader,
    getCurrentColumnIndex,
    updateMultiSortState,
  };
}
