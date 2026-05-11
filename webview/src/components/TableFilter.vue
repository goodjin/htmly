<script setup lang="ts">
/**
 * TableFilter Component
 * 
 * Provides a filter input for filtering table rows by cell content.
 * Supports multiple filter criteria (comma or space separated).
 */

import { ref, watch, computed } from 'vue';
import { useTableFilter } from '../composables/useTableFilter';

const props = defineProps<{
  /** The table element to filter */
  tableElement: HTMLElement | null;
  /** Whether to show the highlight on matches */
  highlightEnabled?: boolean;
  /** CSS class for highlights */
  highlightClass?: string;
}>();

const emit = defineEmits<{
  /** Emitted when filter changes with visible/total row count */
  filterChange: [visible: number, total: number];
  /** Emitted when user clears the filter */
  filterClear: [];
}>();

const {
  filterTerms,
  rawFilter,
  isActive,
  setFilter,
  clearFilter,
  applyFilterToTable,
  highlightMatches,
  getVisibleRowCount,
  getTotalRowCount,
} = useTableFilter();

const inputRef = ref<HTMLInputElement | null>(null);
const inputValue = ref('');

/**
 * Count of visible rows
 */
const visibleCount = ref(0);

/**
 * Total row count
 */
const totalCount = ref(0);

/**
 * Display label for row counts
 */
const countLabel = computed(() => {
  if (!isActive.value) {
    return `${totalCount.value} row${totalCount.value !== 1 ? 's' : ''}`;
  }
  return `${visibleCount.value} of ${totalCount.value}`;
});

/**
 * Update counts after filter application
 */
function updateCounts() {
  if (props.tableElement) {
    visibleCount.value = getVisibleRowCount(props.tableElement);
    totalCount.value = getTotalRowCount(props.tableElement);
    emit('filterChange', visibleCount.value, totalCount.value);
  }
}

/**
 * Apply filter to the table
 */
function applyFilter() {
  if (!props.tableElement) return;
  
  setFilter(inputValue.value);
  
  // Apply row visibility
  applyFilterToTable(props.tableElement);
  
  // Apply highlighting if enabled
  if (props.highlightEnabled !== false) {
    highlightMatches(props.tableElement, props.highlightClass || 'table-filter-highlight');
  }
  
  updateCounts();
}

/**
 * Clear the filter and show all rows
 */
function handleClear() {
  inputValue.value = '';
  clearFilter();
  
  if (props.tableElement) {
    // Show all rows
    const rows = props.tableElement.querySelectorAll('tbody tr');
    rows.forEach(row => {
      (row as HTMLElement).style.display = '';
    });
    
    // Remove highlights
    if (props.highlightEnabled !== false) {
      highlightMatches(props.tableElement, props.highlightClass || 'table-filter-highlight');
    }
    
    updateCounts();
  }
  
  emit('filterClear');
}

/**
 * Handle input changes with debounce
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function handleInput() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilter, 150);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeydown(e: KeyboardEvent) {
  // Escape clears the filter
  if (e.key === 'Escape') {
    handleClear();
    inputRef.value?.blur();
  }
}

/**
 * Focus the filter input
 */
function focus() {
  inputRef.value?.focus();
}

/**
 * Initialize counts on mount
 */
watch(() => props.tableElement, (table) => {
  if (table) {
    totalCount.value = getTotalRowCount(table);
    visibleCount.value = totalCount.value;
    emit('filterChange', visibleCount.value, totalCount.value);
  }
}, { immediate: true });

// Expose methods for parent components
defineExpose({
  focus,
  clear: handleClear,
  applyFilter,
});
</script>

<template>
  <div class="table-filter">
    <div class="filter-input-wrapper">
      <svg class="search-icon" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
      </svg>
      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        class="filter-input"
        placeholder="Filter rows..."
        @input="handleInput"
        @keydown="handleKeydown"
      />
      <span v-if="isActive" class="filter-active-indicator" title="Filter active"></span>
      <button
        v-if="inputValue"
        class="clear-button"
        title="Clear filter (Escape)"
        @click="handleClear"
      >
        <svg viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>
    </div>
    <div class="filter-info">
      <span class="row-count" :class="{ filtered: isActive }">
        {{ countLabel }}
      </span>
      <span v-if="isActive && filterTerms.length > 0" class="filter-terms">
        {{ filterTerms.join(', ') }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.table-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--vscode-editorWidget-background, #252526);
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
  font-size: 12px;
}

.filter-input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  max-width: 300px;
  position: relative;
}

.search-icon {
  width: 14px;
  height: 14px;
  color: var(--vscode-descriptionForeground, #858585);
  flex-shrink: 0;
}

.filter-input {
  flex: 1;
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #cccccc);
  border: 1px solid var(--vscode-input-border, #555);
  border-radius: 4px;
  padding: 4px 28px 4px 8px;
  font-size: 12px;
  outline: none;
  font-family: inherit;
}

.filter-input:focus {
  border-color: var(--vscode-focusBorder, #007acc);
}

.filter-input::placeholder {
  color: var(--vscode-placeholderForeground, #6e6e6e);
}

.filter-active-indicator {
  position: absolute;
  right: 28px;
  width: 6px;
  height: 6px;
  background: var(--vscode-button-background, #0e639c);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.clear-button {
  position: absolute;
  right: 4px;
  background: transparent;
  border: none;
  color: var(--vscode-descriptionForeground, #858585);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
}

.clear-button:hover {
  background: var(--vscode-toolbar-hoverBackground, #2d2d2e);
  color: var(--vscode-editor-foreground, #cccccc);
}

.clear-button svg {
  width: 12px;
  height: 12px;
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--vscode-descriptionForeground, #858585);
}

.row-count {
  font-size: 11px;
}

.row-count.filtered {
  color: var(--vscode-button-background, #0e639c);
}

.filter-terms {
  font-size: 11px;
  color: var(--vscode-textLink-foreground, #007acc);
  background: rgba(0, 122, 204, 0.15);
  padding: 2px 6px;
  border-radius: 3px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
