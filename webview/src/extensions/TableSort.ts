import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface TableSortOptions {
  /**
   * Whether to show sort indicators in header cells
   */
  showIndicators: boolean;
  /**
   * CSS class for ascending sort indicator
   */
  ascIndicatorClass: string;
  /**
   * CSS class for descending sort indicator
   */
  descIndicatorClass: string;
  /**
   * Callback when a header cell is clicked
   */
  onHeaderClick?: (event: MouseEvent, columnIndex: number, tablePos: number) => void;
}

export interface SortState {
  columnIndex: number;
  direction: 'asc' | 'desc';
  priority?: number;
}

export interface MultiSortState {
  sorts: SortState[];
  tablePos: number;
}

export const tableSortPluginKey = new PluginKey('tableSort');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableSort: {
      /**
       * Sort table rows by a specific column
       */
      sortTableByColumn: (options: {
        columnIndex: number;
        direction: 'asc' | 'desc';
        excludeHeader: boolean;
        addToMultiSort?: boolean;
      }) => ReturnType;
      /**
       * Clear sort state
       */
      clearTableSort: () => ReturnType;
      /**
       * Sort table by multiple columns (for multi-sort)
       */
      sortTableMultiColumn: (options: {
        sorts: SortState[];
        excludeHeader: boolean;
      }) => ReturnType;
    };
  }
}

/**
 * Compare two cell values for sorting
 * Returns -1, 0, or 1 for ascending, descending, or equal
 */
function compareCells(a: string, b: string, direction: 'asc' | 'desc'): number {
  // Try numeric comparison first
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  
  if (!isNaN(numA) && !isNaN(numB)) {
    const diff = numA - numB;
    return direction === 'asc' ? diff : -diff;
  }
  
  // Fall back to string comparison (case-insensitive)
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  
  if (lowerA < lowerB) return direction === 'asc' ? -1 : 1;
  if (lowerA > lowerB) return direction === 'asc' ? 1 : -1;
  return 0;
}

/**
 * Get text content from a cell node
 * Also handles special cell types like checkbox cells that store sort values in attrs
 */
function getCellText(cell: any): string {
  let text = '';
  
  if (cell.isText) {
    text = cell.text || '';
  } else if (cell.content) {
    cell.forEach((child: any) => {
      text += getCellText(child) + ' ';
    });
  } else if (cell.type?.name === 'checkboxCell' || cell.type?.name === 'datePickerCell') {
    // For special cell types, try to get the sort value from attrs
    // CheckboxCell: data-sort-value is "1" (checked) or "0" (unchecked)
    // DatePickerCell: data-sort-value is the date string
    const attrs = cell.attrs || {};
    if (attrs['data-sort-value']) {
      return attrs['data-sort-value'];
    }
    // Fallback to other known attribute names
    if (attrs.sortValue) {
      return attrs.sortValue;
    }
  }
  
  return text.trim();
}

/**
 * TableSort extension for Tiptap
 * 
 * Provides table sorting functionality:
 * - Sort rows by clicking column headers
 * - Toggle between ascending and descending
 * - Multi-sort support with Shift+click
 * - Visual indicators for sort direction
 */
export const TableSort = Extension.create<TableSortOptions>({
  name: 'tableSort',

  addOptions() {
    return {
      showIndicators: true,
      ascIndicatorClass: 'sort-indicator-asc',
      descIndicatorClass: 'sort-indicator-desc',
      onHeaderClick: undefined,
    };
  },

  addStorage() {
    return {
      // Store current sort state per table (keyed by table position)
      sortStates: {} as Record<number, SortState[]>,
      // Track current sort column and direction
      currentSort: null as { columnIndex: number; direction: 'asc' | 'desc' } | null,
    };
  },

  addCommands() {
    return {
      sortTableByColumn:
        (options) =>
        ({ tr, state, dispatch, editor }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the table containing the selection
          let table: any = null;
          let tablePos: number = -1;
          
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'table') {
              table = node;
              tablePos = $from.before(depth);
              break;
            }
          }
          
          if (!table || tablePos === -1) {
            return false;
          }
          
          const { columnIndex, direction, excludeHeader, addToMultiSort } = options;
          const rows = table.content.content;
          
          if (rows.length < 2) {
            return false; // Need at least 2 rows to sort
          }
          
          if (columnIndex < 0 || columnIndex >= rows[0].childCount) {
            return false; // Invalid column index
          }
          
          // Get current multi-sort state for this table
          const existingSorts = this.storage.sortStates[tablePos] || [];
          
          // Determine new sort state
          let newSorts: SortState[];
          
          if (addToMultiSort) {
            // Add to existing sorts or update if same column
            const existingIndex = existingSorts.findIndex(s => s.columnIndex === columnIndex);
            if (existingIndex >= 0) {
              // Toggle direction of existing sort
              newSorts = [...existingSorts];
              newSorts[existingIndex] = {
                ...newSorts[existingIndex],
                direction: newSorts[existingIndex].direction === 'asc' ? 'desc' : 'asc',
              };
            } else {
              // Add new sort with next priority
              newSorts = [...existingSorts, {
                columnIndex,
                direction,
                priority: existingSorts.length + 1,
              }];
            }
          } else {
            // Single column sort - replace all existing sorts
            newSorts = [{ columnIndex, direction }];
          }
          
          // Store the new sort state
          this.storage.sortStates[tablePos] = newSorts;
          this.storage.currentSort = { columnIndex, direction };
          
          // Separate header row from data rows
          const headerRow = excludeHeader ? rows[0] : null;
          const dataRows = excludeHeader ? rows.slice(1) : rows.slice(0);
          
          if (dataRows.length === 0) {
            return true; // Nothing to sort
          }
          
          // Sort data rows by all active sort columns (in order)
          const sortedRows = [...dataRows].sort((rowA, rowB) => {
            for (const sort of newSorts) {
              const valueA = getCellText(rowA.child(sort.columnIndex));
              const valueB = getCellText(rowB.child(sort.columnIndex));
              const result = compareCells(valueA, valueB, sort.direction);
              if (result !== 0) {
                return result;
              }
            }
            return 0; // All columns equal
          });
          
          // Rebuild the table content
          const newTableContent: any[] = [];
          
          if (headerRow) {
            newTableContent.push(headerRow);
          }
          
          newTableContent.push(...sortedRows);
          
          // Create a new table node with sorted content
          const newTable = table.type.create(
            table.attrs,
            newTableContent.map(row => row.copy(row.content))
          );
          
          // Replace the old table with the new one
          if (dispatch) {
            // Store sort state in transaction metadata
            tr.setMeta(tableSortPluginKey, {
              sortState: newSorts,
              tablePos,
            });
            tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
            dispatch(tr);
          }
          
          return true;
        },
      
      sortTableMultiColumn:
        (options) =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Find the table containing the selection
          let table: any = null;
          let tablePos: number = -1;
          
          for (let depth = $from.depth; depth >= 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === 'table') {
              table = node;
              tablePos = $from.before(depth);
              break;
            }
          }
          
          if (!table || tablePos === -1) {
            return false;
          }
          
          const { sorts, excludeHeader } = options;
          const rows = table.content.content;
          
          if (rows.length < 2) {
            return false;
          }
          
          // Store the sort state
          this.storage.sortStates[tablePos] = sorts;
          if (sorts.length > 0) {
            this.storage.currentSort = {
              columnIndex: sorts[0].columnIndex,
              direction: sorts[0].direction,
            };
          }
          
          // Separate header row from data rows
          const headerRow = excludeHeader ? rows[0] : null;
          const dataRows = excludeHeader ? rows.slice(1) : rows.slice(0);
          
          if (dataRows.length === 0) {
            return true;
          }
          
          // Sort data rows
          const sortedRows = [...dataRows].sort((rowA, rowB) => {
            for (const sort of sorts) {
              const valueA = getCellText(rowA.child(sort.columnIndex));
              const valueB = getCellText(rowB.child(sort.columnIndex));
              const result = compareCells(valueA, valueB, sort.direction);
              if (result !== 0) {
                return result;
              }
            }
            return 0;
          });
          
          // Rebuild the table content
          const newTableContent: any[] = [];
          
          if (headerRow) {
            newTableContent.push(headerRow);
          }
          
          newTableContent.push(...sortedRows);
          
          // Create a new table node
          const newTable = table.type.create(
            table.attrs,
            newTableContent.map(row => row.copy(row.content))
          );
          
          if (dispatch) {
            tr.setMeta(tableSortPluginKey, {
              sortState: sorts,
              tablePos,
            });
            tr.replaceWith(tablePos, tablePos + table.nodeSize, newTable);
            dispatch(tr);
          }
          
          return true;
        },
      
      clearTableSort:
        () =>
        ({ tr, dispatch }) => {
          // Clear sort state
          this.storage.sortStates = {};
          this.storage.currentSort = null;
          
          if (dispatch) {
            tr.setMeta(tableSortPluginKey, { clear: true });
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    
    return [
      new Plugin({
        key: tableSortPluginKey,
        
        state: {
          init() {
            return DecorationSet.empty;
          },
          
          apply(tr, decorationSet, oldState, newState) {
            // Handle metadata from commands
            const meta = tr.getMeta(tableSortPluginKey);
            
            if (meta?.clear) {
              return DecorationSet.empty;
            }
            
            if (meta?.sortState) {
              // Sort state was updated - clear old decorations for this table
              // Decorations will be re-rendered on next render
              return DecorationSet.empty;
            }
            
            // If the document changed, clear decorations (table content changed)
            if (tr.docChanged) {
              return DecorationSet.empty;
            }
            
            return decorationSet.map(tr.mapping, tr.doc);
          },
        },
        
        props: {
          decorations(state) {
            const pluginState = tableSortPluginKey.getState(state);
            if (pluginState && extension.options.showIndicators) {
              return this.getState(state);
            }
            return DecorationSet.empty;
          },
          
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement;
              // Check if clicked on a table header cell
              const th = target.closest('th');
              
              if (th) {
                // Check if this th is inside a table
                const table = th.closest('table');
                if (table) {
                  // Get the column index
                  const cells = Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td'));
                  const columnIndex = cells.indexOf(th);
                  
                  if (columnIndex >= 0) {
                    // Get table position in document
                    const pos = view.posAtDOM(table, 0);
                    
                    // Call the onHeaderClick callback if provided
                    if (extension.options.onHeaderClick) {
                      extension.options.onHeaderClick(event, columnIndex, pos);
                    }
                    
                    // Determine sort direction
                    const currentSort = extension.storage.currentSort;
                    let direction: 'asc' | 'desc' = 'asc';
                    
                    // If clicking same column, toggle direction
                    if (currentSort && currentSort.columnIndex === columnIndex) {
                      direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                    }
                    
                    // Check for Shift key for multi-sort
                    const addToMultiSort = event.shiftKey;
                    
                    // Execute sort command
                    view.dispatch(
                      view.state.tr.setMeta('addToHistory', false)
                    );
                    
                    view.state.commandManager.commands.sortTableByColumn({
                      columnIndex,
                      direction,
                      excludeHeader: true,
                      addToMultiSort,
                    })(view.state, view.dispatch);
                    
                    return true; // Event handled
                  }
                }
              }
              return false; // Event not handled
            },
          },
        },
      }),
    ];
  },
});

/**
 * CSS styles for table sorting indicators
 * Add these to your editor stylesheet
 */
export const tableSortStyles = `
/* Table sort indicators */
.table-header-cell {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.table-header-cell:hover {
  background-color: rgba(128, 128, 128, 0.1);
}

.sort-indicator {
  display: inline-flex;
  margin-left: 4px;
  font-size: 10px;
  opacity: 0.6;
  vertical-align: middle;
}

.sort-indicator-asc::after {
  content: "▲";
}

.sort-indicator-desc::after {
  content: "▼";
}

.sort-indicator-active {
  opacity: 1;
  color: var(--vscode-button-background, #0e639c);
}

/* Applied sort indicator on header */
[data-sorted="asc"] .sort-indicator,
[data-sorted="desc"] .sort-indicator {
  opacity: 1;
}

[data-sorted="asc"] .sort-indicator::after {
  content: "▲";
}

[data-sorted="desc"] .sort-indicator::after {
  content: "▼";
}
`;
