<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { Template, TemplateCategory, TemplateMetadata } from '../core/types';
import { TEMPLATE_CATEGORIES, filterByCategory, searchTemplates } from '../core/template';
import { getBuiltInTemplates } from '../core/templates/registry';
import { useVSCode } from '../composables/useVSCode';

const props = defineProps<{
  visible: boolean;
  /** Current editor content to save as template */
  currentContent?: string;
}>();

const emit = defineEmits<{
  select: [template: Template];
  cancel: [];
  saveAsTemplate: [options: { name: string; category: TemplateCategory; description?: string }];
}>();

const { userTemplates, loadUserTemplates, deleteTemplate, renameTemplate } = useVSCode();

// Get all built-in templates
const builtInTemplates = getBuiltInTemplates();

// State
const selectedCategory = ref<TemplateCategory | null>(null);
const searchQuery = ref('');
const hoveredIndex = ref(-1);
const previewTemplate = ref<Template | null>(null);
const activeTab = ref<'built-in' | 'custom'>('built-in');

// Context menu state
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuTemplate = ref<TemplateMetadata | null>(null);

// Rename dialog state
const renameDialogVisible = ref(false);
const renameTemplateId = ref('');
const renameTemplateName = ref('');

// Combined templates (built-in + user)
const allTemplates = computed((): (Template | TemplateMetadata)[] => {
  if (activeTab.value === 'built-in') {
    return builtInTemplates;
  }
  // Convert user templates to Template type for display
  return userTemplates.value.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    thumbnail: t.thumbnail,
    createdAt: t.createdAt,
    content: '', // User templates need to load content separately
  }));
});

// Filtered templates based on category and search
const filteredTemplates = computed(() => {
  let result = allTemplates.value;
  
  // Apply category filter
  if (selectedCategory.value) {
    result = filterByCategory(result as Template[], selectedCategory.value) as (Template | TemplateMetadata)[];
  }
  
  // Apply search filter
  if (searchQuery.value.trim()) {
    result = searchTemplates(result as Template[], searchQuery.value.trim()) as (Template | TemplateMetadata)[];
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

// Load user templates when dialog opens
watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    selectedCategory.value = null;
    searchQuery.value = '';
    hoveredIndex.value = -1;
    previewTemplate.value = null;
    contextMenuVisible.value = false;
    // Load user templates when opening
    loadUserTemplates();
  }
});

// Reset state when switching tabs
watch(activeTab, () => {
  selectedCategory.value = null;
  searchQuery.value = '';
  hoveredIndex.value = -1;
  previewTemplate.value = null;
});

// Close context menu when clicking outside
watch(contextMenuVisible, (visible) => {
  if (visible) {
    const closeMenu = (e: MouseEvent) => {
      contextMenuVisible.value = false;
      document.removeEventListener('click', closeMenu);
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
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
function onSelectTemplate(template: Template | TemplateMetadata) {
  emit('select', template as Template);
}

// Handle template hover for preview
function onHoverTemplate(template: Template | TemplateMetadata | null) {
  if (!template) {
    previewTemplate.value = null;
    return;
  }
  previewTemplate.value = template as Template;
  hoveredIndex.value = filteredTemplates.value.findIndex(t => t.id === template.id);
}

// Handle right-click context menu
function onContextMenu(e: MouseEvent, template: TemplateMetadata) {
  // Only show context menu for user templates (custom tab)
  if (activeTab.value !== 'custom') {
    return;
  }
  
  e.preventDefault();
  contextMenuTemplate.value = template;
  contextMenuPosition.value = { x: e.clientX, y: e.clientY };
  contextMenuVisible.value = true;
}

// Handle delete template
function handleDeleteTemplate() {
  if (contextMenuTemplate.value) {
    deleteTemplate(contextMenuTemplate.value.id);
    // Reload templates after delete
    setTimeout(() => loadUserTemplates(), 100);
  }
  contextMenuVisible.value = false;
}

// Handle rename template
function handleRenameClick() {
  if (contextMenuTemplate.value) {
    renameTemplateId.value = contextMenuTemplate.value.id;
    renameTemplateName.value = contextMenuTemplate.value.name;
    renameDialogVisible.value = true;
  }
  contextMenuVisible.value = false;
}

// Confirm rename
function confirmRename() {
  if (renameTemplateId.value && renameTemplateName.value.trim()) {
    renameTemplate(renameTemplateId.value, renameTemplateName.value.trim());
    // Reload templates after rename
    setTimeout(() => loadUserTemplates(), 100);
  }
  renameDialogVisible.value = false;
}

// Cancel rename
function cancelRename() {
  renameDialogVisible.value = false;
}

// Handle save as template
function handleSaveAsTemplate() {
  emit('saveAsTemplate', {
    name: 'New Template',
    category: 'docs',
    description: '',
  });
}

// Check if template is built-in
function isBuiltIn(templateId: string): boolean {
  return builtInTemplates.some(t => t.id === templateId);
}

// Keyboard navigation
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (renameDialogVisible.value) {
      renameDialogVisible.value = false;
    } else {
      emit('cancel');
    }
    return;
  }
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const newIndex = Math.min(hoveredIndex.value + 1, filteredTemplates.value.length - 1);
    hoveredIndex.value = newIndex;
    if (filteredTemplates.value[newIndex]) {
      previewTemplate.value = filteredTemplates.value[newIndex] as Template;
    }
    return;
  }
  
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const newIndex = Math.max(hoveredIndex.value - 1, 0);
    hoveredIndex.value = newIndex;
    if (filteredTemplates.value[newIndex]) {
      previewTemplate.value = filteredTemplates.value[newIndex] as Template;
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
      
      <!-- Tab bar: Built-in vs Custom -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'built-in' }"
          @click="activeTab = 'built-in'"
        >
          <span class="tab-icon">📦</span>
          Built-in
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'custom' }"
          @click="activeTab = 'custom'"
        >
          <span class="tab-icon">👤</span>
          My Templates
          <span v-if="userTemplates.length > 0" class="tab-badge">{{ userTemplates.length }}</span>
        </button>
        <div class="tab-actions" v-if="activeTab === 'custom'">
          <button class="save-template-btn" @click.stop="handleSaveAsTemplate">
            <span>+</span> Save Current as Template
          </button>
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
            <span v-if="activeTab === 'built-in'">No templates found</span>
            <span v-else>
              No custom templates yet.
              <button class="link-btn" @click.stop="handleSaveAsTemplate">Save current document as template</button>
            </span>
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
              @contextmenu="onContextMenu($event, template)"
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
              <!-- Built-in badge -->
              <span v-if="activeTab === 'built-in'" class="built-in-badge">Built-in</span>
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
          <div class="preview-content" v-if="previewTemplate.content">
            <iframe
              :srcdoc="previewTemplate.content"
              class="preview-iframe"
              sandbox="allow-same-origin"
            ></iframe>
          </div>
          <div v-else class="preview-content empty">
            <span class="preview-empty-icon">📄</span>
            <span>Preview not available for custom templates</span>
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
        <span v-if="activeTab === 'custom'" class="hint">
          <kbd>Right-click</kbd> Manage
        </span>
      </div>
      
      <!-- Context Menu -->
      <div
        v-if="contextMenuVisible"
        class="context-menu"
        :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
        @click.stop
      >
        <button class="context-menu-item" @click="handleRenameClick">
          <span class="menu-icon">✏️</span>
          Rename
        </button>
        <button class="context-menu-item danger" @click="handleDeleteTemplate">
          <span class="menu-icon">🗑️</span>
          Delete
        </button>
      </div>
      
      <!-- Rename Dialog -->
      <div v-if="renameDialogVisible" class="rename-dialog-overlay" @mousedown.self="cancelRename">
        <div class="rename-dialog">
          <div class="dialog-header">
            <span class="dialog-icon">✏️</span>
            <span class="dialog-title">Rename Template</span>
          </div>
          <div class="dialog-body">
            <label class="input-label">
              Template Name
              <input
                type="text"
                class="input-field"
                v-model="renameTemplateName"
                @keydown.enter="confirmRename"
                @keydown.escape="cancelRename"
                autofocus
              />
            </label>
          </div>
          <div class="dialog-actions">
            <button class="btn btn-secondary" @click="cancelRename">Cancel</button>
            <button class="btn btn-primary" @click="confirmRename">Rename</button>
          </div>
        </div>
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

/* Tab Bar */
.tab-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
  gap: 4px;
  flex-shrink: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--vscode-editor-foreground, #cccccc);
  font-size: 13px;
  cursor: pointer;
  transition: all 100ms ease;
  font-family: inherit;
}

.tab-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.tab-btn.active {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
}

.tab-icon {
  font-size: 14px;
}

.tab-badge {
  background: var(--vscode-badge-background, #007acc);
  color: white;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 8px;
  font-weight: 600;
}

.tab-actions {
  margin-left: auto;
}

.save-template-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--vscode-button-background, #0e639c);
  border: none;
  border-radius: 4px;
  color: var(--vscode-button-foreground, #ffffff);
  font-size: 12px;
  cursor: pointer;
  transition: all 100ms ease;
  font-family: inherit;
}

.save-template-btn:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}

/* Built-in Badge */
.built-in-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--vscode-textLink-foreground, #3794ff);
  color: white;
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.template-item {
  position: relative;
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

/* Context Menu */
.context-menu {
  position: fixed;
  z-index: 200;
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 6px;
  padding: 4px;
  min-width: 140px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--vscode-editor-foreground, #cccccc);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.context-menu-item:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.context-menu-item.danger {
  color: var(--vscode-errorForeground, #f48771);
}

.context-menu-item.danger:hover {
  background: rgba(244, 135, 113, 0.15);
}

.menu-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}

/* Rename Dialog */
.rename-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rename-dialog {
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 8px;
  padding: 20px;
  width: 360px;
  max-width: 90vw;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.dialog-icon {
  font-size: 20px;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.dialog-body {
  margin-bottom: 20px;
}

.input-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--vscode-editor-foreground, #cccccc);
}

.input-field {
  background: var(--vscode-input-background, #3c3c3c);
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  border-radius: 4px;
  padding: 8px 10px;
  color: var(--vscode-input-foreground, #cccccc);
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.input-field:focus {
  border-color: var(--vscode-focusBorder, #007acc);
}

.dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  font-family: inherit;
}

.btn-primary {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
}

.btn-primary:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}

.btn-secondary {
  background: var(--vscode-toolbar-hoverBackground, #2d2d2d);
  color: var(--vscode-editor-foreground, #cccccc);
  border: 1px solid var(--vscode-widget-border, #3c3c3c);
}

.btn-secondary:hover {
  background: var(--vscode-toolbar-hoverBackground, #3d3d3d);
}

/* Link Button */
.link-btn {
  background: none;
  border: none;
  color: var(--vscode-textLink-foreground, #3794ff);
  cursor: pointer;
  font-size: inherit;
  text-decoration: underline;
  font-family: inherit;
  padding: 0;
  margin-left: 4px;
}

.link-btn:hover {
  color: var(--vscode-textLink-activeForeground, #3794ff);
}

.no-results {
  flex-direction: column;
  gap: 8px;
}
</style>
