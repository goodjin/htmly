<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import type { EditorMode, HtmlySettings } from '../../src/shared/types';
import { useVSCode } from './composables/useVSCode';
import { extractBodyContent, replaceBodyContent } from './core/htmlUtils';
import Toolbar from './components/Toolbar.vue';
import TiptapEditor from './components/TiptapEditor.vue';
import CodeEditor from './components/CodeEditor.vue';
import PreviewPane from './components/PreviewPane.vue';
import SplitPane from './components/SplitPane.vue';
import SearchBar from './components/SearchBar.vue';

const { onMessage, notifyReady, sendContentUpdate, sendModeChanged, isDark } = useVSCode();

const content = ref('');
const mode = ref<EditorMode>('wysiwyg');
const initialized = ref(false);
const isDirty = ref(false);
const readOnly = ref(false);
const settings = ref<HtmlySettings>({ showButtonLabels: true });
const modeOrder: EditorMode[] = ['wysiwyg', 'source', 'preview'];

const visualHtml = computed(() => extractBodyContent(content.value));

// Debounce content updates sent to extension
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function onContentChange(newHtml: string) {
  content.value = newHtml;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    sendContentUpdate(newHtml);
  }, 300);
}

function setMode(next: EditorMode) {
  if (readOnly.value && next !== 'source') return;
  mode.value = next;
  sendModeChanged(next);
}

function cycleMode() {
  const currentIndex = modeOrder.indexOf(mode.value);
  const next = modeOrder[(currentIndex + 1) % modeOrder.length];
  setMode(next);
}

function onVisualContentChange(bodyHtml: string) {
  onContentChange(replaceBodyContent(content.value, bodyHtml));
}

const tiptapRef = ref<InstanceType<typeof TiptapEditor> | null>(null);
const showSearch = ref(false);

// Close search bar when mode changes
watch(mode, () => { showSearch.value = false; });

// Ctrl+F / Cmd+F toggles search bar in WYSIWYG mode
function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f' && mode.value === 'wysiwyg') {
    e.preventDefault();
    showSearch.value = !showSearch.value;
  }
}

// Register message handler
const unsubscribe = onMessage((msg) => {
  switch (msg.type) {
    case 'init':
      content.value = msg.content;
      mode.value = msg.mode;
      initialized.value = true;
      break;

    case 'contentChanged':
      // External file change (e.g. git checkout) — cancel any pending
      // debounced contentUpdate to avoid echoing stale content back.
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      content.value = msg.content;
      break;

    case 'setMode':
      setMode(msg.mode);
      break;

    case 'cycleMode':
      cycleMode();
      break;

    case 'theme':
      isDark.value = msg.isDark;
      break;

    case 'dirty':
      isDirty.value = msg.isDirty;
      break;

    case 'readOnly':
      readOnly.value = msg.enabled;
      if (msg.enabled) {
        mode.value = 'source';
        sendModeChanged('source');
      }
      break;

    case 'settings':
      settings.value = msg.settings;
      break;
  }
});

onMounted(() => {
  notifyReady();
  document.addEventListener('keydown', onGlobalKeydown);
});

onBeforeUnmount(() => {
  unsubscribe();
  document.removeEventListener('keydown', onGlobalKeydown);
  if (debounceTimer) clearTimeout(debounceTimer);
});


</script>

<template>
  <div class="app" :class="{ dark: isDark, light: !isDark }">
    <Toolbar
      :editor="tiptapRef?.editor"
      :mode="mode"
      :dirty="isDirty"
      :read-only="readOnly"
      :show-button-labels="settings.showButtonLabels"
      :auto-hide-toolbar-in-preview="settings.autoHideToolbarInPreview"
      @set-mode="setMode"
    />

    <div v-if="initialized" :key="mode" class="editor-area">
      <div v-if="readOnly" class="large-file-banner">
        Large file — Source-only mode (WYSIWYG disabled for files over 500 KB)
      </div>
      <SearchBar
        v-if="mode === 'wysiwyg'"
        :editor="tiptapRef?.editor"
        :visible="showSearch"
        @close="showSearch = false"
      />
      <TiptapEditor
        v-if="mode === 'wysiwyg'"
        ref="tiptapRef"
        :model-value="visualHtml"
        :enable-markdown-shortcuts="settings.enableMarkdownShortcuts"
        @update:model-value="onVisualContentChange"
      />
      <SplitPane
        v-else-if="mode === 'split'"
        :content="content"
        :is-dark="isDark"
        :split-direction="settings.splitScreenDirection"
        @update:content="onContentChange"
      />
      <CodeEditor
        v-else-if="mode === 'source'"
        :model-value="content"
        :is-dark="isDark"
        @update:model-value="onContentChange"
      />
      <PreviewPane
        v-else
        :html="content"
      />
    </div>

    <div class="loading" v-else>Loading…</div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vscode-descriptionForeground, #888);
}

.large-file-banner {
  padding: 6px 12px;
  font-size: 12px;
  background: var(--vscode-editorWarning-foreground, #cca700);
  color: #1e1e1e;
  text-align: center;
  flex-shrink: 0;
}
</style>
