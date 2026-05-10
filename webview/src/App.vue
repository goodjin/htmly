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
import TOCPanel from './components/TOCPanel.vue';

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
const showTOC = ref(false);

function toggleTOC() {
  showTOC.value = !showTOC.value;
}

// Format painter state
const formatPainterActive = ref(false);
const formatPainterMultiUse = ref(false);

interface FormatPainterState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  highlight: boolean;
  link: { href: string } | null;
  textColor: string | null;
  textAlign: 'left' | 'center' | 'right' | null;
}

const formatPainterState = ref<FormatPainterState | null>(null);

function activateFormatPainter(multiUse: boolean) {
  if (!tiptapRef.value?.editor) return;
  
  const editor = tiptapRef.value.editor;
  const state = editor.state;
  const { from, to } = state.selection;
  
  // Capture formatting at current selection
  const marks = state.doc.resolve(from).marks();
  const linkMark = marks.find(m => m.type.name === 'link');
  
  formatPainterState.value = {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    code: editor.isActive('code'),
    highlight: editor.isActive('highlight'),
    link: linkMark ? { href: linkMark.attrs.href } : null,
    textColor: editor.getAttributes('textStyle').color ?? null,
    textAlign: editor.isActive({ textAlign: 'left' }) ? 'left' 
             : editor.isActive({ textAlign: 'center' }) ? 'center'
             : editor.isActive({ textAlign: 'right' }) ? 'right'
             : null,
  };
  
  formatPainterMultiUse.value = multiUse;
  formatPainterActive.value = true;
}

function deactivateFormatPainter() {
  formatPainterActive.value = false;
  formatPainterMultiUse.value = false;
  formatPainterState.value = null;
}

function onFormatPainterApplied() {
  // If not multi-use mode, deactivate after applying
  if (!formatPainterMultiUse.value) {
    deactivateFormatPainter();
  }
}

// Close search bar and format painter when mode changes
watch(mode, () => { 
  showSearch.value = false;
  deactivateFormatPainter();
});

// Ctrl+F / Cmd+F toggles search bar in WYSIWYG mode
// Escape deactivates format painter
function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f' && mode.value === 'wysiwyg') {
    e.preventDefault();
    showSearch.value = !showSearch.value;
  }
  
  if (e.key === 'Escape' && formatPainterActive.value) {
    deactivateFormatPainter();
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
      :format-painter-active="formatPainterActive"
      :show-toc="showTOC"
      @set-mode="setMode"
      @activate-format-painter="activateFormatPainter"
      @toggle-toc="toggleTOC"
      @open-cover-dialog="tiptapRef?.openCoverImageDialog()"
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
        :format-painter-active="formatPainterActive"
        :format-painter-state="formatPainterState"
        @update:model-value="onVisualContentChange"
        @format-painter-applied="onFormatPainterApplied"
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

    <!-- Table of Contents Panel -->
    <TOCPanel
      v-if="showTOC && mode === 'wysiwyg'"
      :editor="tiptapRef?.editor"
    />
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
