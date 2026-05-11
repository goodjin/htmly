<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useBacklinks, type BacklinkInfo } from '../composables/useBacklinks';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'openPage', pageName: string, pagePath?: string): void;
}>();

const {
  backlinksState,
  totalBacklinks,
  groupedBacklinks,
} = useBacklinks();

// Track expanded/collapsed state for each page
const expandedPages = ref<Set<string>>(new Set());

// Toggle expanded state for a page
function toggleExpanded(pageName: string) {
  if (expandedPages.value.has(pageName)) {
    expandedPages.value.delete(pageName);
  } else {
    expandedPages.value.add(pageName);
  }
}

// Check if a page is expanded
function isExpanded(pageName: string): boolean {
  return expandedPages.value.has(pageName);
}

// Handle clicking on a backlink
function openBacklink(backlink: BacklinkInfo) {
  emit('openPage', backlink.pageName, backlink.pagePath);
}

// Search/filter backlinks
const searchQuery = ref('');
const filteredBacklinks = computed(() => {
  if (!searchQuery.value.trim()) {
    return groupedBacklinks.value;
  }
  const query = searchQuery.value.toLowerCase();
  return groupedBacklinks.value.filter(
    (bl) =>
      bl.pageName.toLowerCase().includes(query) ||
      bl.preview.toLowerCase().includes(query)
  );
});

// Clear search when panel closes
watch(() => props.visible, (visible) => {
  if (!visible) {
    searchQuery.value = '';
  }
});
</script>

<template>
  <div v-if="visible" class="backlinks-panel">
    <div class="backlinks-header">
      <div class="backlinks-title">
        <span class="backlinks-icon">🔗</span>
        <span>Backlinks</span>
        <span class="backlinks-count" v-if="totalBacklinks > 0">{{ totalBacklinks }}</span>
      </div>
      <button class="close-btn" @click="emit('close')" title="Close">
        ✕
      </button>
    </div>

    <div class="backlinks-search">
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Filter backlinks..."
        class="search-input"
      />
    </div>

    <div class="backlinks-content">
      <!-- Loading state -->
      <div v-if="backlinksState.isLoading" class="backlinks-loading">
        <span class="loading-spinner"></span>
        <span>Loading backlinks...</span>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredBacklinks.length === 0" class="backlinks-empty">
        <div class="empty-icon">📭</div>
        <div class="empty-text" v-if="searchQuery">
          No backlinks match "{{ searchQuery }}"
        </div>
        <div class="empty-text" v-else-if="backlinksState.currentPage">
          No pages link to "{{ backlinksState.currentPage }}"
        </div>
        <div class="empty-text" v-else>
          No backlinks available
        </div>
        <div class="empty-hint" v-if="!searchQuery">
          Pages that link to this page will appear here
        </div>
      </div>

      <!-- Backlinks list -->
      <div v-else class="backlinks-list">
        <div
          v-for="backlink in filteredBacklinks"
          :key="backlink.pageName"
          class="backlink-item"
        >
          <div
            class="backlink-header"
            @click="toggleExpanded(backlink.pageName)"
          >
            <div class="backlink-main">
              <span class="backlink-expand-icon">
                {{ isExpanded(backlink.pageName) ? '▼' : '▶' }}
              </span>
              <span class="backlink-icon">📄</span>
              <span class="backlink-page-name">{{ backlink.pageName }}</span>
              <span class="backlink-link-count" v-if="backlink.linkCount > 1">
                {{ backlink.linkCount }} links
              </span>
            </div>
            <button
              class="backlink-open-btn"
              @click.stop="openBacklink(backlink)"
              title="Open page"
            >
              Open
            </button>
          </div>

          <div
            v-if="isExpanded(backlink.pageName) && backlink.preview"
            class="backlink-preview"
          >
            <div class="preview-label">Preview:</div>
            <div class="preview-text">{{ backlink.preview }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="backlinks-footer" v-if="filteredBacklinks.length > 0">
      <span>{{ filteredBacklinks.length }} page(s)</span>
    </div>
  </div>
</template>

<style scoped>
.backlinks-panel {
  position: fixed;
  top: 50px;
  right: 10px;
  width: 360px;
  max-height: calc(100vh - 100px);
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-widget-border, #454545);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  z-index: 100;
  font-family: var(--vscode-font-family, system-ui);
}

.backlinks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--vscode-widget-border, #454545);
  flex-shrink: 0;
}

.backlinks-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.backlinks-icon {
  font-size: 16px;
}

.backlinks-count {
  background: var(--vscode-badge-background, #007acc);
  color: white;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 10px;
  margin-left: 4px;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--vscode-descriptionForeground, #888);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.close-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  color: var(--vscode-editor-foreground, #ccc);
}

.backlinks-search {
  padding: 8px 12px;
  border-bottom: 1px solid var(--vscode-widget-border, #454545);
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 6px 10px;
  background: var(--vscode-input-background, #3c3c3c);
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  border-radius: 4px;
  color: var(--vscode-input-foreground, #cccccc);
  font-size: 13px;
  outline: none;
}

.search-input:focus {
  border-color: var(--vscode-focusBorder, #007acc);
}

.search-input::placeholder {
  color: var(--vscode-descriptionForeground, #888);
}

.backlinks-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 0;
}

.backlinks-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--vscode-descriptionForeground, #888);
  gap: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--vscode-widget-border, #454545);
  border-top-color: var(--vscode-button-background, #0e639c);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.backlinks-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  color: var(--vscode-descriptionForeground, #888);
  font-size: 13px;
  margin-bottom: 8px;
}

.empty-hint {
  color: var(--vscode-descriptionForeground, #666);
  font-size: 12px;
}

.backlinks-list {
  display: flex;
  flex-direction: column;
}

.backlink-item {
  border-bottom: 1px solid var(--vscode-widget-border, #3c3c3c);
}

.backlink-item:last-child {
  border-bottom: none;
}

.backlink-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.backlink-header:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.backlink-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.backlink-expand-icon {
  font-size: 10px;
  color: var(--vscode-descriptionForeground, #888);
  width: 14px;
  flex-shrink: 0;
}

.backlink-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.backlink-page-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-editor-foreground, #cccccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.backlink-link-count {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #888);
  background: var(--vscode-input-background, #3c3c3c);
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

.backlink-open-btn {
  background: var(--vscode-button-secondaryBackground, #3c3c3c);
  border: none;
  color: var(--vscode-editor-foreground, #cccccc);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.15s ease;
}

.backlink-open-btn:hover {
  background: var(--vscode-button-background, #0e639c);
  color: white;
}

.backlink-preview {
  padding: 8px 12px 12px 34px;
  background: rgba(0, 0, 0, 0.1);
}

.preview-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.preview-text {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #888);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.backlinks-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--vscode-widget-border, #454545);
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #888);
  flex-shrink: 0;
}
</style>
