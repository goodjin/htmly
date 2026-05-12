<script setup lang="ts">
import { computed } from 'vue';
import type { VersionHistoryEntry } from '../../src/shared/types';

interface VersionHistoryItem extends VersionHistoryEntry {
  index: number;
  isSelected: boolean;
}

const props = defineProps<{
  versions: VersionHistoryItem[];
  visible: boolean;
  isLoading: boolean;
  isRestoring: boolean;
  previewVersion: VersionHistoryItem | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', versionNumber: number): void;
  (e: 'restore', versionNumber: number): void;
  (e: 'dismissPreview'): void;
}>();

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
    ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatFullTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const truncateContent = (content: string | null, maxLength: number = 100): string => {
  if (!content) return '(no content)';
  // Strip HTML tags for preview
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const handleSelect = (version: VersionHistoryItem) => {
  emit('select', version.versionNumber);
};

const handleRestore = (version: VersionHistoryItem, event: Event) => {
  event.stopPropagation();
  emit('restore', version.versionNumber);
};

const handleDismissPreview = () => {
  emit('dismissPreview');
};

const totalVersions = computed(() => props.versions.length);

// Check if we're in preview mode
const isInPreviewMode = computed(() => props.previewVersion !== null);
</script>

<template>
  <div v-if="visible" class="version-history-panel">
    <div class="version-history-header">
      <div class="header-title">
        <span class="title-icon">🕐</span>
        <span>Version History</span>
        <span class="version-count" v-if="totalVersions > 0">{{ totalVersions }}</span>
      </div>
      <button class="close-btn" @click="emit('close')" title="Close">
        ✕
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="version-history-loading">
      <span class="loading-spinner"></span>
      <span>Loading versions...</span>
    </div>

    <!-- Preview mode -->
    <div v-else-if="isInPreviewMode" class="version-preview-pane">
      <div class="preview-header">
        <div class="preview-title">
          <span class="preview-badge">Preview</span>
          <span class="preview-version">v{{ previewVersion?.versionNumber }}</span>
          <span class="preview-time" :title="formatFullTimestamp(previewVersion?.timestamp || '')">
            {{ formatTimestamp(previewVersion?.timestamp || '') }}
          </span>
        </div>
        <button class="dismiss-btn" @click="handleDismissPreview" title="Back to list">
          ← Back
        </button>
      </div>
      
      <div class="preview-content" v-if="previewVersion?.content">
        <div class="preview-readonly" v-html="previewVersion.content"></div>
      </div>
      <div v-else class="preview-empty">
        (no content)
      </div>
      
      <div class="preview-actions">
        <button
          class="restore-btn"
          :disabled="isRestoring"
          @click="handleRestore(previewVersion!, $event)"
        >
          {{ isRestoring ? 'Restoring...' : 'Restore this version' }}
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="totalVersions === 0" class="version-history-empty">
      <div class="empty-icon">📋</div>
      <div class="empty-text">No versions saved yet</div>
      <div class="empty-hint">Versions are created when you save the document</div>
    </div>

    <!-- Version list -->
    <div v-else class="version-history-list">
      <div
        v-for="version in versions"
        :key="version.id"
        class="version-item"
        :class="{ 'is-selected': version.isSelected }"
        @click="handleSelect(version)"
      >
        <div class="version-header">
          <span class="version-number">v{{ version.versionNumber }}</span>
          <span 
            class="version-time" 
            :title="formatFullTimestamp(version.timestamp)"
          >
            {{ formatTimestamp(version.timestamp) }}
          </span>
        </div>
        
        <div class="version-preview">
          {{ truncateContent(version.content) }}
        </div>

        <div class="version-actions">
          <button
            class="restore-btn"
            :disabled="isRestoring"
            @click="handleRestore(version, $event)"
            title="Restore this version"
          >
            {{ isRestoring && version.isSelected ? 'Restoring...' : 'Restore' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Footer info -->
    <div v-if="totalVersions > 0 && !isInPreviewMode" class="version-history-footer">
      <span>{{ totalVersions }} version(s) saved</span>
    </div>
  </div>
</template>

<style scoped>
.version-history-panel {
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

.version-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--vscode-widget-border, #454545);
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.title-icon {
  font-size: 16px;
}

.version-count {
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

.version-history-loading {
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

.version-history-empty {
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

.version-history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 0;
}

.version-item {
  display: flex;
  flex-direction: column;
  padding: 10px 14px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid var(--vscode-widget-border, #3c3c3c);
}

.version-item:last-child {
  border-bottom: none;
}

.version-item:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.version-item.is-selected {
  border-left-color: var(--vscode-activityBarBadge-background, #007acc);
  background: rgba(0, 122, 204, 0.1);
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.version-number {
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-activityBarBadge-background, #007acc);
  background: rgba(0, 122, 204, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}

.version-time {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #888);
}

.version-preview {
  font-size: 12px;
  color: var(--vscode-editor-foreground, #cccccc);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
  font-family: var(--vscode-editor-font-family, monospace);
}

.version-actions {
  display: flex;
  justify-content: flex-end;
}

.restore-btn {
  background: var(--vscode-button-secondaryBackground, #3c3c3c);
  border: none;
  color: var(--vscode-editor-foreground, #cccccc);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.restore-btn:hover:not(:disabled) {
  background: var(--vscode-button-background, #0e639c);
  color: white;
}

.restore-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.version-history-footer {
  padding: 8px 14px;
  border-top: 1px solid var(--vscode-widget-border, #454545);
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #888);
  flex-shrink: 0;
}

/* Preview pane styles */
.version-preview-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--vscode-widget-border, #454545);
  flex-shrink: 0;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-badge {
  background: var(--vscode-textPreformat-background, #3c3c3c);
  color: var(--vscode-descriptionForeground, #888);
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-version {
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-activityBarBadge-background, #007acc);
}

.preview-time {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #888);
}

.dismiss-btn {
  background: transparent;
  border: none;
  color: var(--vscode-button-foreground, #cccccc);
  cursor: pointer;
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.dismiss-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  min-height: 0;
}

.preview-readonly {
  font-size: 12px;
  color: var(--vscode-editor-foreground, #cccccc);
  line-height: 1.5;
  font-family: var(--vscode-editor-font-family, monospace);
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-readonly :deep(h1),
.preview-readonly :deep(h2),
.preview-readonly :deep(h3),
.preview-readonly :deep(h4),
.preview-readonly :deep(h5),
.preview-readonly :deep(h6) {
  color: var(--vscode-editor-foreground, #cccccc);
  margin-top: 1em;
  margin-bottom: 0.5em;
}

.preview-readonly :deep(p) {
  margin-bottom: 0.8em;
}

.preview-readonly :deep(code) {
  background: var(--vscode-textPreformat-background, #3c3c3c);
  padding: 2px 4px;
  border-radius: 2px;
  font-family: var(--vscode-editor-font-family, monospace);
}

.preview-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vscode-descriptionForeground, #888);
  font-size: 13px;
  font-style: italic;
}

.preview-actions {
  padding: 10px 14px;
  border-top: 1px solid var(--vscode-widget-border, #454545);
  flex-shrink: 0;
}

.preview-actions .restore-btn {
  width: 100%;
  padding: 6px 12px;
  font-size: 12px;
}
</style>
