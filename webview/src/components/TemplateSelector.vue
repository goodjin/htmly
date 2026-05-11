<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Template, TemplateCategory } from '../core/types';
import { TEMPLATE_CATEGORIES, filterByCategory, searchTemplates } from '../core/template';
import { getBuiltInTemplates } from '../core/templates/registry';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  select: [template: Template];
  cancel: [];
}>();

// Get all built-in templates
const allTemplates = getBuiltInTemplates();

// State
const selectedCategory = ref<TemplateCategory | null>(null);
const searchQuery = ref('');
const hoveredIndex = ref(-1);
const previewTemplate = ref<Template | null>(null);

// Filtered templates based on category and search
const filteredTemplates = computed(() => {
  let result = allTemplates;
  
  // Apply category filter
  if (selectedCategory.value) {
    result = filterByCategory(result, selectedCategory.value);
  }
  
  // Apply search filter
  if (searchQuery.value.trim()) {
    result = searchTemplates(result, searchQuery.value.trim());
  }
  
  return result;
});

// Category options for filter tabs
const categoryOptions: { value: TemplateCategory | null; label: string }[] = [
  { value: null, label: 'All' },
  ...Object.entries(TEMPLATE_CATEGORIES).map(([value, label]) => ({
    value: value as TemplateCategory,
    label
  }))
];

// Reset state when dialog opens
watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    selectedCategory.value = null;
    searchQuery.value = '';
    hoveredIndex.value = -1;
    previewTemplate.value = null;
  }
});

// Handle category selection
function selectCategory(category: TemplateCategory | null) {
  selectedCategory.value = category;
  hoveredIndex.value = -1;
}

// Handle search input
function onSearchInput(e: Event) {
  searchQuery.value = (e.target as HTMLInputElement).value;
  hoveredIndex.value = -1;
}

// Handle template selection
function onSelectTemplate(template: Template) {
  emit('select', template);
}

// Handle template hover for preview
function onHoverTemplate(template: Template | null) {
  previewTemplate.value = template;
  if (template) {
    hoveredIndex.value = filteredTemplates.value.findIndex(t => t.id === template.id);
  }
}

// Keyboard navigation
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('cancel');
    return;
  }
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const newIndex = Math.min(hoveredIndex.value + 1, filteredTemplates.value.length - 1);
    hoveredIndex.value = newIndex;
    if (filteredTemplates.value[newIndex]) {
      previewTemplate.value = filteredTemplates.value[newIndex];
    }
    return;
  }
  
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const newIndex = Math.max(hoveredIndex.value - 1, 0);
    hoveredIndex.value = newIndex;
    if (filteredTemplates.value[newIndex]) {
      previewTemplate.value = filteredTemplates.value[newIndex];
    }
    return;
  }
  
  if (e.key === 'Enter' && hoveredIndex.value >= 0) {
    e.preventDefault();
    const template = filteredTemplates.value[hoveredIndex.value];
    if (template) {
      onSelectTemplate(template);
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
  <div v-if="visible" class="template-selector-backdrop" @mousedown.self="emit('cancel')">
    <div class="template-selector" @keydown="onKeydown" tabindex="-1">
      <!-- Header with search -->
      <div class="selector-header">
        <span class="selector-title">Templates</span>
        <div class="search-container">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Search templates..."
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
      
      <!-- Content area with template grid and preview -->
      <div class="selector-content">
        <!-- Template grid -->
        <div class="template-grid-container">
          <div v-if="filteredTemplates.length === 0" class="no-results">
            <span>No templates found</span>
          </div>
          <div v-else class="template-grid" role="listbox">
            <button
              v-for="(template, index) in filteredTemplates"
              :key="template.id"
              class="template-item"
              :class="{ hovered: hoveredIndex === index }"
              role="option"
              :aria-selected="hoveredIndex === index"
              @click="onSelectTemplate(template)"
              @mouseenter="onHoverTemplate(template)"
              @mouseleave="onHoverTemplate(null)"
            >
              <div class="template-thumbnail">
                <img v-if="template.thumbnail" :src="template.thumbnail" :alt="template.name" />
                <div v-else class="thumbnail-placeholder">
                  <span>📄</span>
                </div>
              </div>
              <div class="template-info">
                <span class="template-name">{{ template.name }}</span>
                <span class="template-category">{{ TEMPLATE_CATEGORIES[template.category] }}</span>
              </div>
            </button>
          </div>
        </div>
        
        <!-- Preview panel -->
        <div class="preview-panel" v-if="previewTemplate">
          <div class="preview-header">
            <span class="preview-title">{{ previewTemplate.name }}</span>
            <span class="preview-category">{{ TEMPLATE_CATEGORIES[previewTemplate.category] }}</span>
          </div>
          <div class="preview-description" v-if="previewTemplate.description">
            {{ previewTemplate.description }}
          </div>
          <div class="preview-content">
            <iframe
              :srcdoc="previewTemplate.content"
              class="preview-iframe"
              sandbox="allow-same-origin"
            ></iframe>
          </div>
        </div>
        
        <!-- Empty preview state -->
        <div class="preview-panel empty" v-else>
          <div class="preview-empty">
            <span class="preview-empty-icon">📋</span>
            <span>Hover over a template to preview</span>
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-selector-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: rgba(0, 0, 0, 0.5);
}

.template-selector {
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

.template-grid-container {
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

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.template-item {
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

.template-item:hover,
.template-item.hovered {
  border-color: var(--vscode-focusBorder, #007acc);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.template-item:focus {
  outline: none;
}

.template-item:focus-visible {
  outline: 2px solid var(--vscode-focusBorder, #007acc);
  outline-offset: 2px;
}

.template-thumbnail {
  aspect-ratio: 16/10;
  background: var(--vscode-editor-background, #1e1e1e);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.template-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  font-size: 32px;
  opacity: 0.5;
}

.template-info {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.template-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--vscode-editor-foreground, #cccccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-category {
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
  overflow: hidden;
  padding: 8px;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 4px;
  background: white;
  transform: scale(0.5);
  transform-origin: top left;
  width: 200%;
  height: 200%;
}

.selector-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--vscode-panel-border, #3c3c3c);
  flex-shrink: 0;
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
</style>
