<script setup lang="ts">
import { computed, ref, defineAsyncComponent } from 'vue';
import type { Editor } from '@tiptap/core';
import type { EditorMode, ExportFormat } from '../../../src/shared/types';
import { escapeHtml } from '../core/htmlUtils';
import LinkDialog from './LinkDialog.vue';
import ImageDialog from './ImageDialog.vue';
import ExportDialog from './ExportDialog.vue';

// Lazy load EmbedDialog - not needed at initial load
const EmbedDialog = defineAsyncComponent(() => import('./EmbedDialog.vue'));

// Lazy load LinkPreviewDialog - not needed at initial load
const LinkPreviewDialog = defineAsyncComponent(() => import('./LinkPreviewDialog.vue'));

const props = defineProps<{
  editor: Editor | undefined;
  mode: EditorMode;
  dirty: boolean;
  readOnly: boolean;
  showButtonLabels: boolean;
  autoHideToolbarInPreview: boolean;
  formatPainterActive?: boolean;
  showTOC?: boolean;
  showHistory?: boolean;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}>();

const emit = defineEmits<{
  setMode: [mode: EditorMode];
  activateFormatPainter: [multiUse: boolean];
  toggleTOC: [];
  toggleHistory: [];
  toggleTemplate: [];
  openCoverDialog: [];
  exportRequest: [format: ExportFormat];
}>();

// Embed dialog state
const embedDialogVisible = ref(false);

// Export dialog state
const exportDialogVisible = ref(false);

function openExportDialog() {
  exportDialogVisible.value = true;
}

function onExport(format: ExportFormat) {
  emit('exportRequest', format);
  exportDialogVisible.value = false;
}

function openEmbedDialog() {
  embedDialogVisible.value = true;
}

// Lazy open link preview dialog with dynamic import
async function openLinkPreview() {
  const { openLinkPreviewDialog } = await import('../extensions/LinkPreview');
  openLinkPreviewDialog(props.editor);
}

async function onEmbedConfirm(payload: { url: string }) {
  if (!props.editor || !payload.url) return;
  // Dynamically import toEmbedUrl to reduce initial bundle size
  const { toEmbedUrl } = await import('../extensions/Embed');
  const embedUrl = toEmbedUrl(payload.url);
  if (embedUrl) {
    props.editor.chain().focus().insertContent({
      type: 'embed',
      attrs: { src: embedUrl },
    }).run();
  }
  embedDialogVisible.value = false;
}

// Format painter double-click detection
let formatPainterClickTimer: ReturnType<typeof setTimeout> | null = null;
let formatPainterClickCount = 0;

function onFormatPainterClick(e: MouseEvent) {
  e.preventDefault();
  formatPainterClickCount++;
  
  if (formatPainterClickCount === 1) {
    // First click - wait to see if it's a double-click
    formatPainterClickTimer = setTimeout(() => {
      // Single click - activate for single use
      emit('activateFormatPainter', false);
      formatPainterClickCount = 0;
      formatPainterClickTimer = null;
    }, 200);
  } else if (formatPainterClickCount === 2) {
    // Double click - activate for multi use
    if (formatPainterClickTimer) {
      clearTimeout(formatPainterClickTimer);
      formatPainterClickTimer = null;
    }
    emit('activateFormatPainter', true);
    formatPainterClickCount = 0;
  }
}

const toolbarHidden = computed(() => props.mode === 'preview' && props.autoHideToolbarInPreview);

const currentColor = computed(() => {
  if (!props.editor) return '#000000';
  return props.editor.getAttributes('textStyle').color ?? '#000000';
});

const isLinkActive = computed(() => props.editor?.isActive('link') ?? false);

// Table-related computed state
const isTableActive = computed(() => props.editor?.isActive('table') ?? false);

// Column-related computed state
const isColumnActive = computed(() => props.editor?.isActive('column') ?? false);
const isTableRow = computed(() => {
  if (!props.editor) return false;
  return props.editor.isActive('tableRow');
});
const isTableHeader = computed(() => props.editor?.isActive('tableHeader') ?? false);
const isTableCell = computed(() => props.editor?.isActive('tableCell') ?? false);
const canMerge = computed(() => {
  if (!props.editor) return false;
  const { from, to } = props.editor.state.selection;
  return from !== to; // Selection has more than one cell
});
const canSplit = computed(() => {
  if (!props.editor) return false;
  const attrs = props.editor.getAttributes('tableCell');
  return attrs.colspan !== undefined && attrs.colspan > 1 || attrs.rowspan !== undefined && attrs.rowspan > 1;
});
const currentCellBgColor = computed(() => {
  if (!props.editor) return '#ffffff';
  const attrs = props.editor.getAttributes('tableCell');
  return attrs.backgroundColor ?? '#ffffff';
});

// Block background color computed state
const currentBlockBgColor = computed(() => {
  if (!props.editor) return null;
  const attrs = props.editor.getAttributes('blockBackground');
  return attrs.color ?? null;
});

const hasBlockBgColor = computed(() => {
  if (!props.editor) return false;
  return props.editor.isActive('blockBackground');
});

const linkDialogVisible = ref(false);
const linkInitialUrl = ref('');
const linkInitialText = ref('');

const imageDialogVisible = ref(false);

function btn(action: () => void) {
  return (e: MouseEvent) => {
    e.preventDefault();
    action();
  };
}

function setBlockStyle(value: string) {
  if (value === '0') {
    props.editor?.chain().focus().setParagraph().run();
    return;
  }

  props.editor?.chain().focus().toggleHeading({ level: Number(value) as 1 | 2 | 3 }).run();
}

function onColorChange(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  props.editor?.chain().focus().setColor(value).run();
}

function onBlockBgColorChange(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  props.editor?.chain().focus().setBlockBackground(value).run();
}

function onClearBlockBgColor() {
  props.editor?.chain().focus().unsetBlockBackground().run();
}

function openLinkDialog() {
  if (!props.editor) return;
  const attrs = props.editor.getAttributes('link');
  linkInitialUrl.value = attrs.href ?? '';
  const { from, to } = props.editor.state.selection;
  linkInitialText.value = props.editor.state.doc.textBetween(from, to, '');
  linkDialogVisible.value = true;
}

function onLinkConfirm(payload: { url: string; text: string }) {
  if (!props.editor) return;
  const { url, text } = payload;
  const chain = props.editor.chain().focus();
  const safeUrl = escapeHtml(url);

  if (text && !props.editor.state.selection.empty) {
    chain.setLink({ href: safeUrl }).run();
  } else if (text) {
    chain.insertContent(`<a href="${safeUrl}">${escapeHtml(text)}</a>`).run();
  } else {
    chain.setLink({ href: safeUrl }).run();
  }
  linkDialogVisible.value = false;
}

function unlink() {
  props.editor?.chain().focus().unsetLink().run();
}

function onImageConfirm(payload: { src: string; alt: string }) {
  props.editor?.chain().focus().setImage({ src: payload.src, alt: payload.alt }).run();
  imageDialogVisible.value = false;
}

// Table operations
function addTableRow() {
  props.editor?.chain().focus().addRowAfter().run();
}

function deleteTableRow() {
  props.editor?.chain().focus().deleteRow().run();
}

function addTableColumn() {
  props.editor?.chain().focus().addColumnAfter().run();
}

function deleteTableColumn() {
  props.editor?.chain().focus().deleteColumn().run();
}

function mergeTableCells() {
  props.editor?.chain().focus().mergeCells().run();
}

function splitTableCells() {
  props.editor?.chain().focus().splitCell().run();
}

function toggleTableHeaderRow() {
  props.editor?.chain().focus().toggleHeaderRow().run();
}

function onCellBgColorChange(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  props.editor?.chain().focus().setCellAttribute('backgroundColor', value).run();
}
</script>

<template>
  <div v-if="!toolbarHidden" class="toolbar" :class="{ 'hide-labels': !showButtonLabels }">
    <!-- Mode switcher group - visible in all modes -->
    <div class="toolbar-group mode-switcher">
      <button
        title="WYSIWYG Mode"
        :class="{ active: mode === 'wysiwyg' }"
        @mousedown="btn(() => emit('setMode', 'wysiwyg'))"
      >
        <span class="btn-icon">👁</span>
        <span class="btn-label">WYSIWYG</span>
      </button>
      <button
        title="Source Mode"
        :class="{ active: mode === 'source' }"
        @mousedown="btn(() => emit('setMode', 'source'))"
      >
        <span class="btn-icon">{}</span>
        <span class="btn-label">Source</span>
      </button>
      <button
        title="Preview Mode"
        :class="{ active: mode === 'preview' }"
        @mousedown="btn(() => emit('setMode', 'preview'))"
      >
        <span class="btn-icon">👁</span>
        <span class="btn-label">Preview</span>
      </button>
      <button
        title="Split Mode"
        :class="{ active: mode === 'split' }"
        @mousedown="btn(() => emit('setMode', 'split'))"
      >
        <span class="btn-icon">⫿</span>
        <span class="btn-label">Split</span>
      </button>
    </div>

    <template v-if="mode === 'wysiwyg'">
      <div class="toolbar-group">
        <select
          class="heading-select"
          @change="e => setBlockStyle((e.target as HTMLSelectElement).value)"
          :value="editor?.isActive('heading', {level:1}) ? 1 : editor?.isActive('heading', {level:2}) ? 2 : editor?.isActive('heading', {level:3}) ? 3 : 0"
        >
          <option value="0">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </div>

      <div class="toolbar-group">
        <button
          title="Bold (Ctrl+B)"
          :class="{ active: editor?.isActive('bold') }"
          @mousedown="btn(() => editor?.chain().focus().toggleBold().run())"
        >
          <span class="btn-icon"><b>B</b></span>
          <span class="btn-label">Bold</span>
        </button>
        <button
          title="Italic (Ctrl+I)"
          :class="{ active: editor?.isActive('italic') }"
          @mousedown="btn(() => editor?.chain().focus().toggleItalic().run())"
        >
          <span class="btn-icon"><i>I</i></span>
          <span class="btn-label">Italic</span>
        </button>
        <button
          title="Underline (Ctrl+U)"
          :class="{ active: editor?.isActive('underline') }"
          @mousedown="btn(() => editor?.chain().focus().toggleUnderline().run())"
        >
          <span class="btn-icon"><u>U</u></span>
          <span class="btn-label">Underline</span>
        </button>
        <button
          title="Strikethrough (Ctrl+Shift+X)"
          :class="{ active: editor?.isActive('strike') }"
          @mousedown="btn(() => editor?.chain().focus().toggleStrike().run())"
        >
          <span class="btn-icon"><s>S</s></span>
          <span class="btn-label">Strike</span>
        </button>
        <button
          title="Highlight"
          :class="{ active: editor?.isActive('highlight') }"
          @mousedown="btn(() => editor?.chain().focus().toggleHighlight().run())"
        >
          <span class="btn-icon"><mark>H</mark></span>
          <span class="btn-label">Highlight</span>
        </button>
      </div>

      <div class="toolbar-group">
        <button
          title="Bullet List"
          :class="{ active: editor?.isActive('bulletList') }"
          @mousedown="btn(() => editor?.chain().focus().toggleBulletList().run())"
        >
          <span class="btn-icon">•</span>
          <span class="btn-label">Bullet</span>
        </button>
        <button
          title="Ordered List"
          :class="{ active: editor?.isActive('orderedList') }"
          @mousedown="btn(() => editor?.chain().focus().toggleOrderedList().run())"
        >
          <span class="btn-icon">1.</span>
          <span class="btn-label">Numbered</span>
        </button>
        <button
          title="Blockquote"
          :class="{ active: editor?.isActive('blockquote') }"
          @mousedown="btn(() => editor?.chain().focus().toggleBlockquote().run())"
        >
          <span class="btn-icon">❝</span>
          <span class="btn-label">Quote</span>
        </button>
        <button
          title="Code Block"
          :class="{ active: editor?.isActive('codeBlock') }"
          @mousedown="btn(() => editor?.chain().focus().toggleCodeBlock().run())"
        >
          <span class="btn-icon">{}</span>
          <span class="btn-label">Code</span>
        </button>
      </div>

      <div class="toolbar-group">
        <button
          title="Align Left"
          :class="{ active: editor?.isActive({textAlign:'left'}) }"
          @mousedown="btn(() => editor?.chain().focus().setTextAlign('left').run())"
        >
          <span class="btn-icon">⇤</span>
          <span class="btn-label">Left</span>
        </button>
        <button
          title="Align Center"
          :class="{ active: editor?.isActive({textAlign:'center'}) }"
          @mousedown="btn(() => editor?.chain().focus().setTextAlign('center').run())"
        >
          <span class="btn-icon">≡</span>
          <span class="btn-label">Center</span>
        </button>
        <button
          title="Align Right"
          :class="{ active: editor?.isActive({textAlign:'right'}) }"
          @mousedown="btn(() => editor?.chain().focus().setTextAlign('right').run())"
        >
          <span class="btn-icon">⇥</span>
          <span class="btn-label">Right</span>
        </button>
      </div>

      <div class="toolbar-group">
        <label
          class="color-picker-label"
          title="Text Color"
        >
          <span class="btn-icon"><span class="color-icon">A</span></span>
          <input
            type="color"
            class="color-input"
            :value="currentColor"
            @input="onColorChange"
          />
          <span class="btn-label">Color</span>
        </label>
        <button
          title="Remove Text Color"
          @mousedown="btn(() => editor?.chain().focus().unsetColor().run())"
        >
          <span class="btn-icon">✕</span>
          <span class="btn-label">No Color</span>
        </button>
        <label
          class="color-picker-label"
          title="Block Background Color"
        >
          <span class="btn-icon">
            <span class="block-bg-icon" :class="{ 'has-color': hasBlockBgColor }" :style="{ backgroundColor: currentBlockBgColor || 'transparent' }">
              <span v-if="!hasBlockBgColor" class="bg-text">BG</span>
            </span>
          </span>
          <input
            type="color"
            class="color-input"
            :value="currentBlockBgColor || '#ffffff'"
            @input="onBlockBgColorChange"
          />
          <span class="btn-label">Block BG</span>
        </label>
        <button
          v-if="hasBlockBgColor"
          title="Clear Block Background Color"
          @mousedown="btn(onClearBlockBgColor)"
        >
          <span class="btn-icon">✕</span>
          <span class="btn-label">Clear BG</span>
        </button>
      </div>

      <div class="toolbar-group">
        <button
          title="Insert / Edit Link (Ctrl+K)"
          :class="{ active: isLinkActive }"
          @mousedown.prevent="openLinkDialog"
        >
          <span class="btn-icon">🔗</span>
          <span class="btn-label">Link</span>
        </button>
        <button
          title="Remove Link"
          :disabled="!isLinkActive"
          @mousedown="btn(unlink)"
        >
          <span class="btn-icon">⛓‍💥</span>
          <span class="btn-label">Unlink</span>
        </button>
      </div>

      <div class="toolbar-group">
        <button
          title="Insert Image"
          @mousedown.prevent="imageDialogVisible = true"
        >
          <span class="btn-icon">🖼</span>
          <span class="btn-label">Image</span>
        </button>
        <button
          title="Insert Table"
          @mousedown="btn(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())"
        >
          <span class="btn-icon">⊞</span>
          <span class="btn-label">Table</span>
        </button>
        <button
          title="Horizontal Rule"
          @mousedown="btn(() => editor?.chain().focus().setHorizontalRule().run())"
        >
          <span class="btn-icon">—</span>
          <span class="btn-label">HR</span>
        </button>
        <button
          title="Callout"
          @mousedown="btn(() => editor?.chain().focus().insertCallout().run())"
        >
          <span class="btn-icon">💡</span>
          <span class="btn-label">Callout</span>
        </button>
        <button
          title="Cover Image"
          @mousedown="btn(() => emit('openCoverDialog'))"
        >
          <span class="btn-icon">🖼</span>
          <span class="btn-label">Cover</span>
        </button>
        <button
          title="Toggle"
          @mousedown="btn(() => editor?.chain().focus().insertToggle().run())"
        >
          <span class="btn-icon">▶</span>
          <span class="btn-label">Toggle</span>
        </button>
        <button
          title="Embed"
          @mousedown="btn(openEmbedDialog)"
        >
          <span class="btn-icon">🔗</span>
          <span class="btn-label">Embed</span>
        </button>
        <button
          title="Link Preview"
          @mousedown="btn(() => openLinkPreview())"
        >
          <span class="btn-icon">🔗</span>
          <span class="btn-label">Preview</span>
        </button>
        <button
          title="Footnote (Ctrl+Shift+F)"
          @mousedown="btn(() => editor?.chain().focus().insertFootnote().run())"
        >
          <span class="btn-icon">¹</span>
          <span class="btn-label">Footnote</span>
        </button>
        <button
          title="Format Painter (click once or double-click to keep active)"
          :class="{ active: formatPainterActive }"
          @click="onFormatPainterClick"
        >
          <span class="btn-icon">🎨</span>
          <span class="btn-label">Paint</span>
        </button>
        <button
          title="Table of Contents"
          :class="{ active: showTOC }"
          @mousedown="btn(() => emit('toggleTOC'))"
        >
          <span class="btn-icon">📑</span>
          <span class="btn-label">TOC</span>
        </button>
        <button
          title="Templates (Ctrl+T)"
          @mousedown="btn(() => emit('toggleTemplate'))"
        >
          <span class="btn-icon">📋</span>
          <span class="btn-label">Templates</span>
        </button>
        <button
          title="Undo History"
          :class="{ active: showHistory }"
          @mousedown="btn(() => emit('toggleHistory'))"
        >
          <span class="btn-icon">↩</span>
          <span class="btn-label">History</span>
        </button>
      </div>

      <!-- Table operations - only shown when cursor is in a table -->
      <div v-if="isTableActive" class="toolbar-group">
        <button
          title="Add Row Below"
          @mousedown="btn(addTableRow)"
        >
          <span class="btn-icon">+Row</span>
          <span class="btn-label">Add Row</span>
        </button>
        <button
          title="Delete Row"
          @mousedown="btn(deleteTableRow)"
        >
          <span class="btn-icon">-Row</span>
          <span class="btn-label">Del Row</span>
        </button>
        <button
          title="Add Column After"
          @mousedown="btn(addTableColumn)"
        >
          <span class="btn-icon">+Col</span>
          <span class="btn-label">Add Col</span>
        </button>
        <button
          title="Delete Column"
          @mousedown="btn(deleteTableColumn)"
        >
          <span class="btn-icon">-Col</span>
          <span class="btn-label">Del Col</span>
        </button>
        <button
          title="Merge Cells"
          @mousedown="btn(mergeTableCells)"
        >
          <span class="btn-icon">⤫</span>
          <span class="btn-label">Merge</span>
        </button>
        <button
          title="Split Cell"
          @mousedown="btn(splitTableCells)"
        >
          <span class="btn-icon">⤧</span>
          <span class="btn-label">Split</span>
        </button>
        <button
          title="Toggle Header Row"
          :class="{ active: isTableHeader }"
          @mousedown="btn(toggleTableHeaderRow)"
        >
          <span class="btn-icon">Hdr</span>
          <span class="btn-label">Hdr Row</span>
        </button>
        <label
          class="color-picker-label cell-bg-label"
          title="Cell Background Color"
        >
          <span class="btn-icon"><span class="cell-bg-preview" :style="{ backgroundColor: currentCellBgColor }"></span></span>
          <input
            type="color"
            class="color-input"
            :value="currentCellBgColor"
            @input="onCellBgColorChange"
          />
          <span class="btn-label">Cell BG</span>
        </label>
      </div>

      <!-- Column operations - only shown when cursor is in a column -->
      <div v-if="isColumnActive" class="toolbar-group">
        <button
          title="Add Column Left"
          @mousedown="btn(() => editor?.chain().focus().addColumnLeft().run())"
        >
          <span class="btn-icon">+←Col</span>
          <span class="btn-label">Add Left</span>
        </button>
        <button
          title="Add Column Right"
          @mousedown="btn(() => editor?.chain().focus().addColumnRight().run())"
        >
          <span class="btn-icon">Col→+</span>
          <span class="btn-label">Add Right</span>
        </button>
        <button
          title="Delete Column"
          @mousedown="btn(() => editor?.chain().focus().deleteColumn().run())"
        >
          <span class="btn-icon">-Col</span>
          <span class="btn-label">Del Col</span>
        </button>
      </div>
    </template>

    <!-- Export button -->
    <div class="toolbar-group export-group">
      <button
        title="Export Document"
        @mousedown.prevent="openExportDialog"
      >
        <span class="btn-icon">📤</span>
        <span class="btn-label">Export</span>
      </button>
    </div>

    <div class="toolbar-spacer" />

    <!-- Save status indicator -->
    <span v-if="saveStatus === 'saving'" class="save-indicator saving" title="Saving...">💾 Saving...</span>
    <span v-else-if="saveStatus === 'saved'" class="save-indicator saved" title="Saved">✓ Saved</span>
    <span v-else-if="saveStatus === 'error'" class="save-indicator error" title="Save failed">✗ Error</span>
    <span v-else-if="dirty" class="dirty-indicator" title="Unsaved changes">●</span>
  </div>

  <LinkDialog
    :visible="linkDialogVisible"
    :initial-url="linkInitialUrl"
    :initial-text="linkInitialText"
    @confirm="onLinkConfirm"
    @cancel="linkDialogVisible = false"
  />
  <ImageDialog
    :visible="imageDialogVisible"
    @confirm="onImageConfirm"
    @cancel="imageDialogVisible = false"
  />
  <EmbedDialog
    :visible="embedDialogVisible"
    @confirm="onEmbedConfirm"
    @cancel="embedDialogVisible = false"
  />
  <LinkPreviewDialog />
  <ExportDialog
    :visible="exportDialogVisible"
    @export="onExport"
    @cancel="exportDialogVisible = false"
  />
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--vscode-editorGroupHeader-tabsBackground, #252526);
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 6px;
  border-right: 1px solid var(--vscode-panel-border, #3c3c3c);
}

.toolbar-group:last-of-type {
  border-right: none;
}

.mode-switcher {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-radius: 4px;
  padding: 2px 4px;
  border-right: none;
}

.mode-switcher button {
  min-width: 36px;
}

.export-group {
  border-right: none;
  padding-right: 0;
}

.toolbar-spacer {
  flex: 1;
}

button {
  background: transparent;
  border: 1px solid transparent;
  color: var(--vscode-editor-foreground, #ccc);
  border-radius: 3px;
  padding: 3px 7px;
  cursor: pointer;
  font-size: 13px;
  min-width: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-label {
  font-size: 9px;
  line-height: 1;
  white-space: nowrap;
}

.toolbar.hide-labels .btn-label {
  display: none;
}

button:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

button:disabled,
.heading-select:disabled {
  cursor: default;
  opacity: 0.45;
}

button:disabled:hover {
  background: transparent;
  border-color: transparent;
}

button.active {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #fff);
}

.heading-select {
  background: var(--vscode-dropdown-background, #3c3c3c);
  color: var(--vscode-dropdown-foreground, #ccc);
  border: 1px solid var(--vscode-dropdown-border, #555);
  border-radius: 3px;
  padding: 3px 4px;
  font-size: 12px;
  cursor: pointer;
}

.color-picker-label {
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  padding: 3px 5px;
  border: 1px solid transparent;
  border-radius: 3px;
  position: relative;
}

.color-picker-label:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.color-picker-label.disabled {
  cursor: default;
  opacity: 0.45;
  pointer-events: none;
}

.color-icon {
  font-weight: 700;
  font-size: 13px;
  line-height: 1;
  border-bottom: 3px solid currentColor;
  padding-bottom: 1px;
}

.color-input {
  width: 0;
  height: 0;
  padding: 0;
  border: 0;
  position: absolute;
  bottom: 0;
  left: 0;
  opacity: 0;
  pointer-events: none;
}

.dirty-indicator {
  color: var(--vscode-editorWarning-foreground, #cca700);
  font-size: 14px;
  line-height: 1;
  padding: 0 4px;
  cursor: default;
  flex-shrink: 0;
}

.save-indicator {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 3px;
  flex-shrink: 0;
  animation: fadeIn 150ms ease-out;
}

.save-indicator.saving {
  color: var(--vscode-editor-foreground, #cccccc);
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.save-indicator.saved {
  color: var(--vscode-terminal-ansiGreen, #4ec9b0);
}

.save-indicator.error {
  color: var(--vscode-editorError-foreground, #f48771);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cell-bg-label {
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  padding: 3px 5px;
  border: 1px solid transparent;
  border-radius: 3px;
  position: relative;
}

.cell-bg-label:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.cell-bg-preview {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  display: inline-block;
}

/* Block background color icon */
.block-bg-icon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.block-bg-icon.has-color {
  border-color: var(--vscode-focusBorder, #0e639c);
}

.bg-text {
  font-size: 7px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #888);
  opacity: 0.7;
}
</style>
