<script setup lang="ts">
import { computed } from 'vue';
import type { HistoryEntry } from '../composables/useSharedHistory';

interface HistoryItem extends HistoryEntry {
  index: number;
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
}

const props = defineProps<{
  entries: HistoryItem[];
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', index: number): void;
  (e: 'export'): void;
}>();

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const truncateContent = (content: string, maxLength: number = 80): string => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};

const currentPosition = computed(() => {
  if (props.entries.length === 0) return 0;
  const currentIndex = props.entries.findIndex(e => e.isCurrent);
  return currentIndex >= 0 ? currentIndex + 1 : 0;
});

const totalEntries = computed(() => props.entries.length);

const handleSelect = (index: number) => {
  emit('select', index);
};

const handleExport = () => {
  emit('export');
};
</script>

<template>
  <div v-if="visible" class="history-panel">
    <div class="history-panel-header">
      <div class="header-title">
        <span class="title-icon">$(history)</span>
        <span>Undo History</span>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="handleExport" title="Export History">
          <span>$(export)</span>
        </button>
        <button class="action-btn close-btn" @click="emit('close')" title="Close">
          <span>$(close)</span>
        </button>
      </div>
    </div>
    
    <div class="history-info">
      <span>{{ currentPosition }} / {{ totalEntries }} steps</span>
    </div>

    <div class="history-list">
      <div
        v-for="entry in entries"
        :key="entry.index"
        class="history-item"
        :class="{
          'is-current': entry.isCurrent,
          'is-past': entry.isPast,
          'is-future': entry.isFuture
        }"
        @click="handleSelect(entry.index)"
      >
        <div class="entry-header">
          <span class="entry-index">#{{ entry.index }}</span>
          <span class="entry-time">{{ formatTimestamp(entry.timestamp) }}</span>
        </div>
        <div class="entry-preview">{{ truncateContent(entry.content) }}</div>
        <div class="entry-indicator">
          <span v-if="entry.isCurrent" class="current-marker">$(circle-filled)</span>
          <span v-else class="other-marker">$(circle)</span>
        </div>
      </div>

      <div v-if="entries.length === 0" class="history-empty">
        No history entries yet. Start editing to build your history.
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  position: absolute;
  top: 40px;
  right: 10px;
  width: 320px;
  max-height: 500px;
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-widget-border, #3c3c3c);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.history-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--vscode-widget-border, #3c3c3c);
  background: var(--vscode-editor-background, #1e1e1e);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.title-icon {
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: transparent;
  border: none;
  padding: 4px 6px;
  cursor: pointer;
  color: var(--vscode-editor-foreground, #cccccc);
  border-radius: 4px;
  font-size: 12px;
}

.action-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, #2d2d2d);
}

.close-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, #2d2d2d);
}

.history-info {
  padding: 6px 12px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #858585);
  background: var(--vscode-editor-background, #1e1e1e);
  border-bottom: 1px solid var(--vscode-widget-border, #3c3c3c);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.history-item {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: background 0.15s ease;
}

.history-item:hover {
  background: var(--vscode-toolbar-hoverBackground, #2d2d2d);
}

.history-item.is-current {
  border-left-color: var(--vscode-activityBarBadge-background, #007acc);
  background: var(--vscode-toolbar-hoverBackground, #2d2d2d);
}

.history-item.is-past {
  opacity: 0.7;
}

.history-item.is-future {
  opacity: 0.5;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.entry-index {
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-activityBarBadge-background, #007acc);
}

.entry-time {
  font-size: 10px;
  color: var(--vscode-descriptionForeground, #858585);
}

.entry-preview {
  font-size: 11px;
  color: var(--vscode-editor-foreground, #cccccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--vscode-editor-font-family, monospace);
}

.entry-indicator {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
}

.current-marker {
  color: var(--vscode-activityBarBadge-background, #007acc);
}

.other-marker {
  color: var(--vscode-descriptionForeground, #858585);
}

.history-item {
  position: relative;
}

.history-empty {
  padding: 20px;
  text-align: center;
  color: var(--vscode-descriptionForeground, #858585);
  font-size: 12px;
}
</style>
