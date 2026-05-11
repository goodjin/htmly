<script setup lang="ts">
/**
 * ProjectSearchPanel - Displays search results across multiple HTML files in the workspace.
 * Allows navigation between results and jumping to a specific result in the editor.
 */

import { ref, computed, watch, nextTick, toRaw } from 'vue';
import type { SearchResult } from '../../../src/shared/types';

const props = defineProps<{
  visible: boolean;
  isSearching: boolean;
  results: SearchResult[];
  currentResultIndex: number;
  query: string;
  isRegex: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  close: [];
  search: [query: string, isRegex: boolean];
  next: [];
  previous: [];
  openResult: [index: number];
  toggleRegex: [];
}>();

const searchInput = ref<HTMLInputElement | null>(null);
const searchTerm = ref('');
const resultsListRef = ref<HTMLElement | null>(null);

// Focus search input when panel opens
watch(() => props.visible, (v) => {
  if (v) {
    nextTick(() => searchInput.value?.focus());
  } else {
    searchTerm.value = '';
  }
});

// Sync search term from parent
watch(() => props.query, (q) => {
  if (q !== searchTerm.value) {
    searchTerm.value = q;
  }
});

// Scroll current result into view
watch(() => props.currentResultIndex, (index) => {
  if (index >= 0 && resultsListRef.value) {
    const resultItems = resultsListRef.value.querySelectorAll('.result-item');
    const currentItem = resultItems[index] as HTMLElement;
    if (currentItem) {
      currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
});

function onSearchInput() {
  emit('search', searchTerm.value, props.isRegex);
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) {
      emit('previous');
    } else {
      emit('next');
    }
  }
  if (e.key === 'Escape') {
    emit('close');
  }
}

function onResultClick(index: number) {
  emit('openResult', index);
}

function onToggleRegex() {
  emit('toggleRegex');
}

function formatFileName(filePath: unknown): string {
  // Handle Vue reactive proxies and objects
  const rawPath = toRaw(filePath);
  const path = typeof rawPath === 'string' ? rawPath : String(rawPath);
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function getContextSnippet(result: SearchResult): string {
  return `${result.contextBefore}<mark>${result.matchText}</mark>${result.contextAfter}`;
}

const resultsCount = computed(() => props.results.length);
const matchLabel = computed(() => {
  if (!props.query) return '';
  if (props.error) return 'Error';
  if (resultsCount.value === 0) return 'No results';
  return `${props.currentResultIndex + 1}/${resultsCount.value}`;
});

// Group results by file
const resultsByFile = computed(() => {
  const grouped = new Map<string, SearchResult[]>();
  for (const result of props.results) {
    const rawResult = toRaw(result);
    const filePath = rawResult.filePath as string;
    const existing = grouped.get(filePath);
    if (existing) {
      existing.push(rawResult);
    } else {
      grouped.set(filePath, [rawResult]);
    }
  }
  return grouped;
});
</script>

<template>
  <div v-if="visible" class="search-panel">
    <!-- Search Input Row -->
    <div class="search-row">
      <input
        ref="searchInput"
        v-model="searchTerm"
        type="text"
        placeholder="Search in workspace..."
        class="search-input"
        :class="{ 'regex-mode': isRegex }"
        :title="isRegex ? 'Regex mode enabled' : 'Literal search'"
        @input="onSearchInput"
        @keydown="onSearchKeydown"
      />
      <button 
        class="regex-toggle" 
        :class="{ active: isRegex }"
        :title="isRegex ? 'Disable regex (.*)' : 'Enable regex (.*)'"
        @click="onToggleRegex"
      >
        .*
      </button>
      <span class="match-count" :class="{ error: !!error }">
        <span v-if="isSearching" class="searching-indicator">Searching...</span>
        <span v-else>{{ matchLabel }}</span>
      </span>
      <button 
        :disabled="resultsCount === 0" 
        title="Previous (Shift+Enter)" 
        @click="emit('previous')"
      >‹</button>
      <button 
        :disabled="resultsCount === 0" 
        title="Next (Enter)" 
        @click="emit('next')"
      >›</button>
      <button title="Close (Escape)" @click="emit('close')">✕</button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Results List -->
    <div ref="resultsListRef" class="results-list">
      <div v-if="resultsCount === 0 && !isSearching && query" class="no-results">
        No matches found
      </div>
      <div v-else-if="resultsCount === 0 && !query" class="no-results">
        Enter a search term to find matches
      </div>
      <template v-else>
        <div 
          v-for="(fileResults, filePath) in resultsByFile" 
          :key="filePath"
          class="file-group"
        >
          <div class="file-header">
            <span class="file-icon">📄</span>
            <span class="file-name">{{ formatFileName(filePath) }}</span>
            <span class="file-count">{{ fileResults.length }} match{{ fileResults.length !== 1 ? 'es' : '' }}</span>
          </div>
          <div
            v-for="(result, idx) in fileResults"
            :key="`${filePath}-${idx}`"
            class="result-item"
            :class="{ active: results.indexOf(result) === currentResultIndex }"
            @click="onResultClick(results.indexOf(result))"
          >
            <div class="result-line-info">
              <span class="line-number">{{ result.line }}</span>
              <span class="column-number">{{ result.column }}</span>
            </div>
            <div class="result-context" v-html="getContextSnippet(result)" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.search-panel {
  position: fixed;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  width: 600px;
  max-width: calc(100vw - 40px);
  max-height: 60vh;
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-panel-border, #454545);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid var(--vscode-panel-border, #454545);
  background: var(--vscode-editorGroupHeader-tabsBackground, #2d2d2d);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #ccc);
  border: 1px solid var(--vscode-input-border, #555);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 13px;
  outline: none;
  font-family: inherit;
}

.search-input:focus {
  border-color: var(--vscode-focusBorder, #007acc);
}

.search-input.regex-mode {
  border-color: #007acc;
  background: rgba(0, 122, 204, 0.15);
}

.match-count {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #aaa);
  min-width: 80px;
  text-align: center;
  white-space: nowrap;
}

.match-count.error {
  color: #f48771;
}

.searching-indicator {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.regex-toggle {
  background: transparent;
  border: 1px solid transparent;
  color: var(--vscode-editor-foreground, #ccc);
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 12px;
  font-family: monospace;
  font-weight: 600;
  min-width: 36px;
}

.regex-toggle:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.regex-toggle.active {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
}

.search-row button {
  background: transparent;
  border: 1px solid transparent;
  color: var(--vscode-editor-foreground, #ccc);
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.search-row button:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.search-row button:disabled {
  opacity: 0.4;
  cursor: default;
}

.search-row button:disabled:hover {
  background: transparent;
  border-color: transparent;
}

.error-message {
  padding: 8px 12px;
  background: rgba(244, 135, 113, 0.15);
  color: #f48771;
  font-size: 12px;
  border-bottom: 1px solid var(--vscode-panel-border, #454545);
}

.results-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.no-results {
  padding: 20px;
  text-align: center;
  color: var(--vscode-descriptionForeground, #888);
  font-size: 13px;
}

.file-group {
  margin-bottom: 8px;
}

.file-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--vscode-sideBar-background, #1e1e1e);
  color: var(--vscode-editor-foreground, #ccc);
  font-size: 12px;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}

.file-icon {
  font-size: 12px;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-count {
  color: var(--vscode-descriptionForeground, #888);
  font-weight: normal;
}

.result-item {
  display: flex;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.1s ease;
}

.result-item:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.result-item.active {
  background: var(--vscode-button-background, #0e639c);
}

.result-item.active .result-line-info {
  color: var(--vscode-button-foreground, #ffffff);
}

.result-item.active .result-context {
  color: var(--vscode-button-foreground, #ffffff);
}

.result-line-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 50px;
  margin-right: 12px;
  color: var(--vscode-descriptionForeground, #888);
  font-size: 11px;
  font-family: var(--vscode-editor-font-family, monospace);
  flex-shrink: 0;
}

.line-number::before {
  content: 'L';
  opacity: 0.6;
}

.column-number::before {
  content: 'C';
  opacity: 0.6;
}

.result-context {
  flex: 1;
  font-size: 12px;
  font-family: var(--vscode-editor-font-family, monospace);
  color: var(--vscode-editor-foreground, #d4d4d4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
}

.result-context :deep(mark) {
  background: rgba(255, 213, 0, 0.4);
  color: inherit;
  border-radius: 2px;
  padding: 0 2px;
}

.result-item.active .result-context :deep(mark) {
  background: rgba(255, 255, 255, 0.3);
}
</style>
