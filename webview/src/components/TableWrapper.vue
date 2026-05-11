<script setup lang="ts">
/**
 * TableWrapper Component
 * 
 * Wraps a table element and provides filtering functionality.
 * Adds a filter input above the table and handles row filtering.
 */

import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import TableFilter from './TableFilter.vue';

const props = withDefaults(defineProps<{
  /** Whether the filter is enabled */
  filterEnabled?: boolean;
  /** Whether to highlight matching text */
  highlightEnabled?: boolean;
  /** CSS class for highlights */
  highlightClass?: string;
}>(), {
  filterEnabled: true,
  highlightEnabled: true,
  highlightClass: 'table-filter-highlight',
});

const emit = defineEmits<{
  /** Emitted when filter changes with visible/total row count */
  filterChange: [visible: number, total: number];
}>();

/**
 * Reference to the table wrapper container
 */
const wrapperRef = ref<HTMLElement | null>(null);

/**
 * Reference to the actual table element
 */
const tableRef = ref<HTMLElement | null>(null);

/**
 * Reference to the filter component
 */
const filterRef = ref<InstanceType<typeof TableFilter> | null>(null);

/**
 * Whether the filter is visible
 */
const showFilter = ref(true);

/**
 * Find and wrap the table inside the wrapper element
 */
function findTable(): HTMLElement | null {
  if (!wrapperRef.value) return null;
  
  // Look for a table element inside
  const table = wrapperRef.value.querySelector('table');
  return table as HTMLElement;
}

/**
 * Toggle filter visibility
 */
function toggleFilter() {
  showFilter.value = !showFilter.value;
}

/**
 * Handle filter changes
 */
function handleFilterChange(visible: number, total: number) {
  emit('filterChange', visible, total);
}

/**
 * Apply filter to the table programmatically
 */
function applyFilter(searchTerm: string) {
  if (filterRef.value) {
    filterRef.value.clear();
    // Set the value directly and trigger filter
    const input = wrapperRef.value?.querySelector('.filter-input') as HTMLInputElement;
    if (input) {
      input.value = searchTerm;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

/**
 * Clear the filter programmatically
 */
function clearFilter() {
  filterRef.value?.clear();
}

/**
 * Focus the filter input
 */
function focusFilter() {
  filterRef.value?.focus();
}

/**
 * Initialize on mount
 */
onMounted(() => {
  nextTick(() => {
    tableRef.value = findTable();
  });
});

// Watch for table element changes
watch(wrapperRef, () => {
  tableRef.value = findTable();
});

defineExpose({
  applyFilter,
  clearFilter,
  focusFilter,
  toggleFilter,
});
</script>

<template>
  <div ref="wrapperRef" class="table-wrapper">
    <TableFilter
      v-if="filterEnabled && showFilter"
      ref="filterRef"
      :table-element="tableRef"
      :highlight-enabled="highlightEnabled"
      :highlight-class="highlightClass"
      @filter-change="handleFilterChange"
    />
    <div class="table-container">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.table-wrapper {
  display: flex;
  flex-direction: column;
  margin: 8px 0;
}

.table-container {
  overflow-x: auto;
}

.table-container :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

/* Highlight style for matched text */
.table-container :deep(.table-filter-highlight) {
  background: rgba(255, 213, 0, 0.4);
  border-radius: 2px;
  padding: 0 2px;
}
</style>
