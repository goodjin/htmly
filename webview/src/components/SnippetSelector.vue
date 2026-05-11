<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Snippet, SnippetCategory } from '../core/types';
import { SNIPPET_CATEGORIES, filterSnippetsByCategory, searchSnippets } from '../core/snippet';
import { getBuiltInSnippets } from '../core/snippets/registry';

const props = defineProps<{
  visible: boolean;
  /** Current editor content to save as snippet */
  currentContent?: string;
}>();

const emit = defineEmits<{
  select: [snippet: Snippet];
  cancel: [];
  saveAsSnippet: [options: { name: string; category: SnippetCategory; description?: string }];
}>();

// Get all built-in snippets
const builtInSnippets = getBuiltInSnippets();

// State
const selectedCategory = ref<SnippetCategory | null>(null);
const searchQuery = ref('');
const hoveredIndex = ref(-1);
const previewSnippet = ref<Snippet | null>(null);

// Filtered snippets based on category and search
const filteredSnippets = computed(() => {
  let result: Snippet[] = builtInSnippets;
  
  // Apply category filter
  if (selectedCategory.value) {
    result = filterSnippetsByCategory(result, selectedCategory.value);
  }
  
  // Apply search filter
  if (searchQuery.value.trim()) {
    result = searchSnippets(result, searchQuery.value.trim());
  }
  
  return result;
});

// Category options for filter tabs
const categoryOptions: { value: SnippetCategory | null; label: string }[] = [
  { value: null, label: 'All' },
  ...Object.entries(SNIPPET_CATEGORIES).map(([value, label]) => ({
    value: value as SnippetCategory,
    label
  }))
];

// Reset state when dialog opens
watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    selectedCategory.value = null;
    searchQuery.value = '';
    hoveredIndex.value = -1;
    previewSnippet.value = null;
  }
});

// Handle category selection
function selectCategory(category: SnippetCategory | null) {
  selectedCategory.value = category;
  hoveredIndex.value = -1;
}

// Handle search input
function onSearchInput(e: Event) {
  searchQuery.value = (e.target as HTMLInputElement).value;
  hoveredIndex.value = -1;
}

// Handle snippet selection
function onSelectSnippet(snippet: Snippet) {
  emit('select', snippet);
}

// Handle snippet hover for preview
function onHoverSnippet(snippet: Snippet | null) {
  if (!snippet) {
    previewSnippet.value = null;
    return;
  }
  previewSnippet.value = snippet;
  hoveredIndex.value = filteredSnippets.value.findIndex(s => s.id === snippet.id);
}

// Handle save as snippet request
function handleSaveAsSnippet() {
  emit('saveAsSnippet', {
    name: 'New Snippet',
    category: 'cards',
    description: '',
  });
}

// Keyboard navigation
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('cancel');
    return;
  }
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const newIndex = Math.min(hoveredIndex.value + 1, filteredSnippets.value.length - 1);
    hoveredIndex.value = newIndex;
    if (filteredSnippets.value[newIndex]) {
      previewSnippet.value = filteredSnippets.value[newIndex];
    }
    return;
  }
  
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const newIndex = Math.max(hoveredIndex.value - 1, 0);
    hoveredIndex.value = newIndex;
    if (filteredSnippets.value[newIndex]) {
      previewSnippet.value = filteredSnippets.value[newIndex];
    }
    return;
  }
  
  if (e.key === 'Enter' && hoveredIndex.value >= 0) {
    e.preventDefault();
    const snippet = filteredSnippets.value[hoveredIndex.value];
    if (snippet) {
      onSelectSnippet(snippet);
    }
    return;
  }
  
  // Arrow left/right for category navigation
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    const currentIndex = categoryOptions.findIndex(c => c.value === selectedCategory.value);
    const nextIndex = Math.min(currentIndex + 1, categoryOptions.length - 1);
    selectCategory(categoryOptions[nextIndex].value);
    return;
  }
  
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const currentIndex = categoryOptions.findIndex(c => c.value === selectedCategory.value);
    const prevIndex = Math.max(currentIndex - 1, 0);
    selectCategory(categoryOptions[prevIndex].value);
    return;
  }
}
</script>

<template>
  <div v-if="visible" class="snippet-selector-backdrop" @mousedown.self="emit('cancel')">
    <div class="snippet-selector" @keydown="onKeydown" tabindex="-1">
      <!-- Header with search -->
      <div class="selector-header">
        <span class="selector-title">Snippets</span>
        <div class="search-container">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Search snippets..."
            :value="searchQuery"
            @input="onSearchInput"
            autofocus
          />
        </div>
      </div>
      
      <!-- Category filters -->
      <div class="category-tabs" role="tablist">
        <button
          v-for="cat in categoryOptions"
          :key="cat.value ?? 'all'"
          class="category-tab"
          :class="{ active: selectedCategory === cat.value }"
          role="tab"
          :aria-selected="selectedCategory === cat.value"
          @click="selectCategory(cat.value)"
        >
          {{ cat.label }}
        </button>
      </div>
      
      <!-- Content area with snippet grid and preview -->
      <div class="selector-content">
        <!-- Snippet grid -->
        <div class="snippet-grid-container">
          <div v-if="filteredSnippets.length === 0" class="no-results">
            No snippets found
          </div>
          <div v-else class="snippet-grid" role="listbox">
            <button
              v-for="(snippet, index) in filteredSnippets"
              :key="snippet.id"
              class="snippet-item"
              :class="{ hovered: hoveredIndex === index }"
              role="option"
              :aria-selected="hoveredIndex === index"
              @click="onSelectSnippet(snippet)"
              @mouseenter="onHoverSnippet(snippet)"
              @mouseleave="onHoverSnippet(null)"
            >
              <div class="snippet-thumbnail">
                <img v-if="snippet.preview" :src="snippet.preview" :alt="snippet.name" />
                <div v-else class="thumbnail-placeholder">
                  <span>📦</span>
                </div>
              </div>
              <div class="snippet-info">
                <span class="snippet-name">{{ snippet.name }}</span>
                <span class="snippet-category">{{ SNIPPET_CATEGORIES[snippet.category] }}</span>
              </div>
            </button>
          </div>
        </div>
        
        <!-- Preview panel -->
        <div class="preview-panel" v-if="previewSnippet">
          <div class="preview-header">
            <span class="preview-title">{{ previewSnippet.name }}</span>
            <span class="preview-category">{{ SNIPPET_CATEGORIES[previewSnippet.category] }}</span>
          </div>
          <div class="preview-description" v-if="previewSnippet.description">
            {{ previewSnippet.description }}
          </div>
          <div class="preview-content" v-if="previewSnippet.html">
            <div class="preview-html" v-html="previewSnippet.html"></div>
          </div>
          <div v-else class="preview-content empty">
            <span class="preview-empty-icon">📦</span>
            <span>Preview not available</span>
          </div>
        </div>
        
        <!-- Empty preview state -->
        <div class="preview-panel empty" v-else>
          <div class="preview-empty">
            <span class="preview-empty-icon">📋</span>
            <span>Hover over a snippet to preview</span>
          </div>
        </div>
      </div>
      
      <!-- Footer with hint -->
      <div class="selector-footer">
        <span class="hint">
          <kbd>↑</kbd><kbd>↓</kbd> Navigate
          <kbd>Enter</kbd> Select
          <kbd>Esc</kbd> Close
        </span>
        <span class="snippet-count">
          {{ filteredSnippets.length }} snippet{{ filteredSnippets.length !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.snippet-selector-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: rgba(0, 0, 0, 0.5);
}

.snippet-selector {
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 8px;
  width: 800px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  outline: none;
}

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
  flex-shrink: 0;
}

.selector-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--vscode-input-background, #3c3c3c);
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  border-radius: 4px;
  padding: 4px 10px;
  min-width: 200px;
}

.search-container:focus-within {
  border-color: var(--vscode-focusBorder, #007acc);
}

.search-icon {
  font-size: 12px;
  opacity: 0.7;
}

.search-input {
  background: transparent;
  border: none;
  color: var(--vscode-input-foreground, #cccccc);
  font-size: 13px;
  outline: none;
  width: 100%;
}

.search-input::placeholder {
  color: var(--vscode-input-placeholderForeground, #888888);
}

.category-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
  flex-shrink: 0;
  overflow-x: auto;
}

.category-tab {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--vscode-editor-foreground, #cccccc);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 100ms ease;
  font-family: inherit;
}

.category-tab:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.category-tab.active {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
}

.selector-content {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.snippet-grid-container {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 12px;
}

.no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vscode-descriptionForeground, #888888);
  font-size: 13px;
}

.snippet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.snippet-item {
  display: flex;
  flex-direction: column;
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 150ms ease;
  padding: 0;
  font-family: inherit;
}

.snippet-item:hover,
.snippet-item.hovered {
  border-color: var(--vscode-focusBorder, #007acc);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.snippet-item:focus {
  outline: none;
}

.snippet-item:focus-visible {
  outline: 2px solid var(--vscode-focusBorder, #007acc);
  outline-offset: 2px;
}

.snippet-thumbnail {
  aspect-ratio: 16/10;
  background: var(--vscode-editor-background, #1e1e1e);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.snippet-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  font-size: 32px;
  opacity: 0.5;
}

.snippet-info {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.snippet-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--vscode-editor-foreground, #cccccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.snippet-category {
  font-size: 10px;
  color: var(--vscode-descriptionForeground, #888888);
}

.preview-panel {
  width: 280px;
  border-left: 1px solid var(--vscode-panel-border, #3c3c3c);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.preview-panel.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--vscode-descriptionForeground, #888888);
  font-size: 12px;
  text-align: center;
  padding: 20px;
}

.preview-empty-icon {
  font-size: 32px;
  opacity: 0.5;
}

.preview-header {
  padding: 12px;
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.preview-category {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #888888);
}

.preview-description {
  padding: 10px 12px;
  font-size: 11px;
  color: var(--vscode-editor-foreground, #cccccc);
  line-height: 1.5;
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
}

.preview-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
}

.preview-html {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 4px;
  padding: 8px;
  transform: scale(0.5);
  transform-origin: top left;
  width: 200%;
  height: 200%;
  overflow: hidden;
}

.preview-content.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--vscode-descriptionForeground, #888888);
  font-size: 12px;
  text-align: center;
  padding: 20px;
}

.selector-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--vscode-panel-border, #3c3c3c);
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hint {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #888888);
  display: flex;
  align-items: center;
  gap: 6px;
}

.hint kbd {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  border-radius: 3px;
  padding: 2px 5px;
  font-family: inherit;
  font-size: 10px;
}

.snippet-count {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #888888);
}
</style>
