<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { EditorMode, HtmlySettings } from '../../src/shared/types';
import { useVSCode } from './composables/useVSCode';
import { useSharedHistory } from './composables/useSharedHistory';
import { extractBodyContent, replaceBodyContent } from './core/htmlUtils';
import Toolbar from './components/Toolbar.vue';
import TiptapEditor, { type CursorPosition } from './components/TiptapEditor.vue';
import CodeEditor, { type CodeEditorCursorPosition } from './components/CodeEditor.vue';
import PreviewPane from './components/PreviewPane.vue';
import SplitPane from './components/SplitPane.vue';
import SearchBar from './components/SearchBar.vue';
import TOCPanel from './components/TOCPanel.vue';

const { onMessage, notifyReady, sendContentUpdate, sendModeChanged, isDark } = useVSCode();

// Shared history for cross-mode undo/redo
const sharedHistory = useSharedHistory();

const content = ref('');
const mode = ref<EditorMode>('wysiwyg');
const initialized = ref(false);
const isDirty = ref(false);
const readOnly = ref(false);
const settings = ref<HtmlySettings>({ showButtonLabels: true });
const modeOrder: EditorMode[] = ['wysiwyg', 'source', 'split', 'preview'];

// Previous mode for cursor preservation
const previousMode = ref<EditorMode | null>(null);
const savedCursorPosition = ref<number | null>(null);

// CodeEditor ref for cursor operations
const codeEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);

const visualHtml = computed(() => extractBodyContent(content.value));

// Debounce content updates sent to extension
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function onContentChange(newHtml: string) {
  content.value = newHtml;
  // Push to shared history for cross-mode undo
  sharedHistory.push(newHtml, calculateCursorPercentage());
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    sendContentUpdate(newHtml);
  }, 300);
}

// Calculate cursor position as percentage (0-1) across all modes
function calculateCursorPercentage(): number {
  if (!content.value) return 0;
  
  if (mode.value === 'wysiwyg' && tiptapRef.value?.editor) {
    const editor = tiptapRef.value.editor;
    const { from } = editor.state.selection;
    const docSize = editor.state.doc.content.size;
    return docSize > 0 ? from / docSize : 0;
  }
  
  if (mode.value === 'source' && codeEditorRef.value) {
    const pos = codeEditorRef.value.getCursorPosition();
    return pos.percentage;
  }
  
  return savedCursorPosition.value ?? 0;
}

// Convert cursor percentage to Tiptap-compatible position
function percentageToTiptapCursor(percentage: number): CursorPosition {
  if (!content.value) {
    return { percentage: 0, offset: 0, blockIndex: 0, totalBlocks: 1 };
  }
  
  // For visual mode, we need to estimate block positions
  const bodyContent = extractBodyContent(content.value);
  const blocks = bodyContent.split(/(?=<(?:p|h[1-6]|ul|ol|blockquote|pre|div|table|details))/g);
  const totalBlocks = blocks.length || 1;
  const targetBlockIndex = Math.floor(percentage * totalBlocks);
  
  return {
    percentage,
    offset: Math.round(percentage * bodyContent.length),
    blockIndex: Math.min(targetBlockIndex, totalBlocks - 1),
    totalBlocks,
  };
}

// Convert cursor percentage to CodeEditor position
function percentageToCodeCursor(percentage: number): CodeEditorCursorPosition {
  if (!content.value) {
    return { percentage: 0, offset: 0, line: 1, totalLines: 1 };
  }
  
  const lines = content.value.split('\n');
  const totalLines = lines.length || 1;
  const targetLine = Math.ceil(percentage * totalLines);
  
  // Calculate offset by counting characters up to target line
  let offset = 0;
  for (let i = 0; i < Math.min(targetLine - 1, lines.length); i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  
  return {
    percentage,
    offset: Math.round(percentage * content.value.length),
    line: Math.min(targetLine, totalLines),
    totalLines,
  };
}

// Handle mode switch with cursor preservation
function switchModeWithCursorPreservation(next: EditorMode) {
  // Save current cursor position before switching
  if (mode.value === 'wysiwyg' && tiptapRef.value?.editor) {
    savedCursorPosition.value = calculateCursorPercentage();
  } else if (mode.value === 'source' && codeEditorRef.value) {
    savedCursorPosition.value = codeEditorRef.value.getCursorPosition().percentage;
  }
  
  previousMode.value = mode.value;
  setMode(next);
  
  // Restore cursor position after mode switch (deferred to allow component mount)
  nextTick(() => {
    if (savedCursorPosition.value !== null) {
      if (next === 'wysiwyg' && tiptapRef.value?.editor) {
        // Tiptap cursor restoration is handled via percentage-based positioning
        cursorPosition.value = percentageToTiptapCursor(savedCursorPosition.value);
      } else if (next === 'source' && codeEditorRef.value) {
        // Restore cursor in CodeEditor
        codeEditorRef.value.setContent(content.value, savedCursorPosition.value);
      }
    }
  });
}

function setMode(next: EditorMode) {
  if (readOnly.value && next !== 'source') return;
  mode.value = next;
  sendModeChanged(next);
}

function cycleMode() {
  const currentIndex = modeOrder.indexOf(mode.value);
  const next = modeOrder[(currentIndex + 1) % modeOrder.length];
  switchModeWithCursorPreservation(next);
}

function onVisualContentChange(bodyHtml: string) {
  const newContent = replaceBodyContent(content.value, bodyHtml);
  onContentChange(newContent);
  
  // In split mode, sync is automatic via content prop
  // In preview mode, PreviewPane handles debounced updates
}

const tiptapRef = ref<InstanceType<typeof TiptapEditor> | null>(null);
const showSearch = ref(false);
const showTOC = ref(false);

// Cursor position for scroll sync
const cursorPosition = ref<CursorPosition | null>(null);

// Track cursor position changes from TiptapEditor
function onCursorPositionUpdate(position: CursorPosition) {
  cursorPosition.value = position;
  // Also update saved position for cross-mode preservation
  savedCursorPosition.value = position.percentage;
}

// Track cursor position changes from CodeEditor
function onSourceCursorChange(position: CodeEditorCursorPosition) {
  savedCursorPosition.value = position.percentage;
}

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
  
  // Ctrl+Z / Cmd+Z - Cross-mode undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    const prevContent = sharedHistory.undo(content.value);
    if (prevContent !== null) {
      content.value = prevContent;
    }
  }
  
  // Ctrl+Shift+Z / Cmd+Shift+Z - Cross-mode redo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
    e.preventDefault();
    const nextContent = sharedHistory.redo(content.value);
    if (nextContent !== null) {
      content.value = nextContent;
    }
  }
}

// Register message handler
const unsubscribe = onMessage((msg) => {
  switch (msg.type) {
    case 'init':
      content.value = msg.content;
      mode.value = msg.mode;
      initialized.value = true;
      // Initialize shared history with initial content
      sharedHistory.initialize(msg.content);
      break;

    case 'contentChanged':
      // External file change (e.g. git checkout) — cancel any pending
      // debounced contentUpdate to avoid echoing stale content back.
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      content.value = msg.content;
      // Re-initialize history with new content
      sharedHistory.initialize(msg.content);
      break;

    case 'setMode':
      switchModeWithCursorPreservation(msg.mode);
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
        @cursor-position-update="onCursorPositionUpdate"
      />
      <SplitPane
        v-else-if="mode === 'split'"
        :content="content"
        :is-dark="isDark"
        :split-direction="settings.splitScreenDirection"
        :cursor-position="cursorPosition"
        @update:content="onContentChange"
      />
      <CodeEditor
        v-else-if="mode === 'source'"
        ref="codeEditorRef"
        :model-value="content"
        :is-dark="isDark"
        @update:model-value="onContentChange"
        @cursor-change="onSourceCursorChange"
      />
      <PreviewPane
        v-else
        :html="content"
        :cursor-position="cursorPosition"
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
