<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { KeybindingCommand } from '../../../src/shared/types';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

// State
const searchQuery = ref('');
const selectedCategory = ref<string>('all');
const keybindings = ref<KeybindingCommand[]>([]);
const isExporting = ref(false);
const isImporting = ref(false);
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null);

// Computed: Get unique categories
const categories = computed(() => {
  const cats = new Set(keybindings.value.map(kb => kb.category));
  return ['all', ...Array.from(cats)];
});

// Computed: Filter keybindings
const filteredKeybindings = computed(() => {
  let result = keybindings.value;
  
  // Filter by category
  if (selectedCategory.value !== 'all') {
    result = result.filter(kb => kb.category === selectedCategory.value);
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(kb => 
      kb.title.toLowerCase().includes(query) ||
      kb.id.toLowerCase().includes(query) ||
      kb.category.toLowerCase().includes(query) ||
      (kb.keybinding?.key || '').toLowerCase().includes(query) ||
      (kb.keybinding?.mac || '').toLowerCase().includes(query)
    );
  }
  
  return result;
});

// Format keybinding for display
function formatKeybinding(keybinding: KeybindingCommand['keybinding']): string {
  if (!keybinding || (!keybinding.key && !keybinding.mac)) {
    return '—';
  }
  
  // Use mac binding if on Mac, otherwise use key
  const isMac = navigator.platform.toLowerCase().includes('mac');
  const key = isMac && keybinding.mac ? keybinding.mac : keybinding.key;
  
  // Format for display (capitalize and replace +)
  return key
    .replace(/\+/g, ' + ')
    .replace(/ctrl/gi, 'Ctrl')
    .replace(/cmd/gi, 'Cmd')
    .replace(/alt/gi, 'Alt')
    .replace(/shift/gi, 'Shift');
}

// Get platform-specific key
function getPlatformKey(keybinding: KeybindingCommand['keybinding']): string {
  if (!keybinding) return '';
  const isMac = navigator.platform.toLowerCase().includes('mac');
  return isMac && keybinding.mac ? keybinding.mac : keybinding.key;
}

// Listen for messages from extension
function handleMessage(event: MessageEvent) {
  const msg = event.data;
  
  switch (msg.type) {
    case 'keybindingsList':
      keybindings.value = msg.commands;
      break;
    case 'keybindingExportResponse':
      isExporting.value = false;
      if (msg.success) {
        showNotification('success', `Keybindings exported to ${msg.filePath}`);
      } else if (msg.error && msg.error !== 'Export cancelled') {
        showNotification('error', `Export failed: ${msg.error}`);
      }
      break;
    case 'keybindingImportResponse':
      isImporting.value = false;
      if (msg.success) {
        showNotification('success', `Imported ${msg.count} keybinding(s)`);
      } else if (msg.error && msg.error !== 'Import cancelled') {
        showNotification('error', `Import failed: ${msg.error}`);
      }
      break;
  }
}

// Request keybindings from extension
function loadKeybindings() {
  window.vscodeApi?.postMessage({ type: 'loadKeybindings' });
}

// Export keybindings
function exportKeybindings() {
  isExporting.value = true;
  window.vscodeApi?.postMessage({ type: 'exportKeybindings' });
}

// Import keybindings
function importKeybindings() {
  isImporting.value = true;
  window.vscodeApi?.postMessage({ type: 'importKeybindings' });
}

// Reset all keybindings
function resetKeybindings() {
  window.vscodeApi?.postMessage({ type: 'resetKeybindings' });
}

// Remove a specific keybinding override
function removeOverride(commandId: string) {
  window.vscodeApi?.postMessage({ type: 'removeKeybindingOverride', command: commandId });
}

// Show notification
function showNotification(type: 'success' | 'error', message: string) {
  notification.value = { type, message };
  setTimeout(() => {
    notification.value = null;
  }, 4000);
}

// Close dialog
function close() {
  emit('close');
}

// Handle keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close();
  }
}

// Declare vscode API
declare global {
  interface Window {
    vscodeApi?: {
      postMessage(msg: unknown): void;
    };
  }
}

onMounted(() => {
  loadKeybindings();
  window.addEventListener('message', handleMessage);
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadKeybindings();
  }
});
</script>

<template>
  <div v-if="visible" class="keybinding-overlay" @click.self="close" @keydown="handleKeydown">
    <div class="keybinding-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h2 class="dialog-title">Keybinding Manager</h2>
        <button class="close-btn" @click="close" title="Close (Esc)">
          <span class="codicon codicon-close"></span>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="dialog-toolbar">
        <div class="toolbar-left">
          <!-- Search -->
          <div class="search-box">
            <span class="codicon codicon-search search-icon"></span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search keybindings..."
              class="search-input"
            />
          </div>

          <!-- Category filter -->
          <select v-model="selectedCategory" class="category-select">
            <option v-for="cat in categories" :key="cat" :value="cat">
              {{ cat === 'all' ? 'All Categories' : cat }}
            </option>
          </select>
        </div>

        <div class="toolbar-right">
          <button
            class="toolbar-btn"
            @click="exportKeybindings"
            :disabled="isExporting"
            title="Export Keybindings"
          >
            <span class="codicon codicon-export"></span>
            {{ isExporting ? 'Exporting...' : 'Export' }}
          </button>
          <button
            class="toolbar-btn"
            @click="importKeybindings"
            :disabled="isImporting"
            title="Import Keybindings"
          >
            <span class="codicon codicon-import"></span>
            {{ isImporting ? 'Importing...' : 'Import' }}
          </button>
          <button
            class="toolbar-btn toolbar-btn-secondary"
            @click="resetKeybindings"
            title="Reset All to Defaults"
          >
            <span class="codicon codicon-refresh"></span>
            Reset All
          </button>
        </div>
      </div>

      <!-- Keybindings list -->
      <div class="keybindings-list">
        <div
          v-for="kb in filteredKeybindings"
          :key="kb.id"
          class="keybinding-item"
          :class="{ 'is-overridden': kb.isOverridden }"
        >
          <div class="keybinding-info">
            <div class="keybinding-title">{{ kb.title }}</div>
            <div class="keybinding-id">{{ kb.id }}</div>
            <div v-if="kb.description" class="keybinding-desc">{{ kb.description }}</div>
          </div>
          <div class="keybinding-keys">
            <span class="key-badge" :class="{ 'is-empty': !getPlatformKey(kb.keybinding) }">
              {{ formatKeybinding(kb.keybinding) }}
            </span>
            <button
              v-if="kb.isOverridden"
              class="reset-btn"
              @click="removeOverride(kb.id)"
              title="Reset to default"
            >
              <span class="codicon codicon-discard"></span>
            </button>
            <span v-if="kb.isOverridden" class="override-badge">Custom</span>
          </div>
        </div>

        <div v-if="filteredKeybindings.length === 0" class="no-results">
          <span class="codicon codicon-search"></span>
          <p>No keybindings found matching your search.</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="dialog-footer">
        <span class="footer-info">
          Override keybindings in settings.json using
          <code>htmly.keybindings.overrides</code>
        </span>
        <button class="close-btn-secondary" @click="close">Close</button>
      </div>

      <!-- Notification -->
      <div v-if="notification" class="notification" :class="notification.type">
        <span class="codicon" :class="notification.type === 'success' ? 'codicon-check' : 'codicon-error'"></span>
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.keybinding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.keybinding-dialog {
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-widget-border, #454545);
  border-radius: 6px;
  width: 800px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-widget-border, #454545);
}

.dialog-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.close-btn {
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  color: var(--vscode-editor-foreground, #cccccc);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, rgba(255, 255, 255, 0.1));
}

.dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--vscode-widget-border, #454545);
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 300px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--vscode-editor-foreground, #cccccc);
  opacity: 0.6;
}

.search-input {
  width: 100%;
  padding: 6px 10px 6px 32px;
  background: var(--vscode-input-background, #3c3c3c);
  border: 1px solid var(--vscode-widget-border, #454545);
  border-radius: 4px;
  color: var(--vscode-editor-foreground, #cccccc);
  font-size: 13px;
}

.search-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder, #007acc);
}

.search-input::placeholder {
  color: var(--vscode-editor-foreground, #cccccc);
  opacity: 0.5;
}

.category-select {
  padding: 6px 10px;
  background: var(--vscode-input-background, #3c3c3c);
  border: 1px solid var(--vscode-widget-border, #454545);
  border-radius: 4px;
  color: var(--vscode-editor-foreground, #cccccc);
  font-size: 13px;
  cursor: pointer;
}

.category-select:focus {
  outline: none;
  border-color: var(--vscode-focusBorder, #007acc);
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--vscode-button-background, #007acc);
  border: none;
  border-radius: 4px;
  color: var(--vscode-button-foreground, #ffffff);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground, #005a9e);
}

.toolbar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toolbar-btn-secondary {
  background: var(--vscode-button-secondaryBackground, #3c3c3c);
  color: var(--vscode-button-secondaryForeground, #cccccc);
}

.toolbar-btn-secondary:hover:not(:disabled) {
  background: var(--vscode-button-secondaryHoverBackground, #4a4a4a);
}

.keybindings-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.keybinding-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid var(--vscode-widget-border, #454545);
}

.keybinding-item:last-child {
  border-bottom: none;
}

.keybinding-item:hover {
  background: var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.05));
}

.keybinding-item.is-overridden {
  background: rgba(0, 120, 212, 0.1);
}

.keybinding-info {
  flex: 1;
  min-width: 0;
}

.keybinding-title {
  font-weight: 500;
  color: var(--vscode-editor-foreground, #cccccc);
  font-size: 14px;
}

.keybinding-id {
  font-size: 11px;
  color: var(--vscode-editor-foreground, #cccccc);
  opacity: 0.6;
  font-family: monospace;
}

.keybinding-desc {
  font-size: 12px;
  color: var(--vscode-editor-foreground, #cccccc);
  opacity: 0.7;
  margin-top: 2px;
}

.keybinding-keys {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.key-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--vscode-keybindingLabel-background, #2d2d2d);
  border: 1px solid var(--vscode-keybindingLabel-border, #454545);
  border-radius: 4px;
  font-family: var(--vscode-keybindingLabel-fontFamily, monospace);
  font-size: 12px;
  color: var(--vscode-keybindingLabel-foreground, #cccccc);
  white-space: nowrap;
}

.key-badge.is-empty {
  opacity: 0.5;
  font-style: italic;
}

.reset-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--vscode-editor-foreground, #cccccc);
  opacity: 0.7;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reset-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  opacity: 1;
}

.override-badge {
  padding: 2px 6px;
  background: var(--vscode-testing-badgePassed-background, #007acc);
  border-radius: 4px;
  font-size: 10px;
  color: white;
  text-transform: uppercase;
  font-weight: 600;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--vscode-editor-foreground, #cccccc);
  opacity: 0.6;
}

.no-results .codicon {
  font-size: 32px;
  margin-bottom: 12px;
}

.no-results p {
  margin: 0;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid var(--vscode-widget-border, #454545);
}

.footer-info {
  font-size: 12px;
  color: var(--vscode-editor-foreground, #cccccc);
  opacity: 0.7;
}

.footer-info code {
  background: var(--vscode-textCodeBlock-background, #2d2d2d);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--vscode-editor-fontFamily, monospace);
}

.close-btn-secondary {
  padding: 6px 16px;
  background: var(--vscode-button-secondaryBackground, #3c3c3c);
  border: none;
  border-radius: 4px;
  color: var(--vscode-button-secondaryForeground, #cccccc);
  font-size: 13px;
  cursor: pointer;
}

.close-btn-secondary:hover {
  background: var(--vscode-button-secondaryHoverBackground, #4a4a4a);
}

.notification {
  position: absolute;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  animation: slideUp 0.2s ease-out;
}

.notification.success {
  background: var(--vscode-testing-badgePassed-background, #007acc);
  color: white;
}

.notification.error {
  background: var(--vscode-testing-message-error-background, #c00);
  color: white;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* VS Code icon classes */
.codicon {
  display: inline-block;
  width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  font-size: 16px;
  font-family: codicon, sans-serif;
  font-style: normal;
  font-weight: normal;
  text-decoration: none;
}

/* Use VS Code's icon font if available */
@font-face {
  font-family: codicon;
  src: url('https://cdn.jsdelivr.net/npm/cod-icon@0.0.22/font/codicon.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}

.codicon::before {
  content: attr(class);
}
</style>
