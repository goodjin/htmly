<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Editor } from '@tiptap/core';
import type { EditorMode, ExportFormat, PdfExportOptions } from '../../../src/shared/types';
import { escapeHtml } from '../core/htmlUtils';
import LinkDialog from './LinkDialog.vue';
import ImageDialog from './ImageDialog.vue';
import ExportDialog from './ExportDialog.vue';
import MathSymbolsDropdown from './MathSymbolsDropdown.vue';
import EmbedDialog from './EmbedDialog.vue';
import LinkPreviewDialog from './LinkPreviewDialog.vue';
import { openLinkPreviewDialog } from '../extensions/LinkPreview';
import { toEmbedUrl } from '../extensions/Embed';
import {
  LayoutTemplate,
  Code,
  Eye,
  Columns2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  Quote,
  Code2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Ban,
  PaintBucket,
  Eraser,
  Link,
  Unlink,
  Image,
  Table2,
  Minus,
  Lightbulb,
  ImagePlus,
  ChevronRight,
  Paperclip,
  Globe,
  Superscript,
  FunctionSquare,
  PaintbrushVertical,
  BookOpen,
  Library,
  History,
  Undo2,
  Combine,
  Split,
  Heading,
  ArrowUp,
  ArrowDown,
  Calendar,
  CheckSquare,
  ToggleRight,
  Rows,
  Columns3,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Circle,
} from '@lucide/vue';

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
  showBacklinks?: boolean;
  showVersionHistory?: boolean;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}>();

const emit = defineEmits<{
  setMode: [mode: EditorMode];
  activateFormatPainter: [multiUse: boolean];
  toggleTOC: [];
  toggleHistory: [];
  toggleBacklinks: [];
  toggleVersionHistory: [];
  toggleTemplate: [];
  openCoverDialog: [];
  exportRequest: [format: ExportFormat, options?: PdfExportOptions, seoSettings?: import('../../../src/shared/types').SeoSettings];
}>();

// Embed dialog state
const embedDialogVisible = ref(false);

// Export dialog state
const exportDialogVisible = ref(false);

function openExportDialog() {
  exportDialogVisible.value = true;
}

function onExport(format: ExportFormat, options?: PdfExportOptions, seoSettings?: import('../../../src/shared/types').SeoSettings) {
  emit('exportRequest', format, options, seoSettings);
  exportDialogVisible.value = false;
}

function openEmbedDialog() {
  embedDialogVisible.value = true;
}

// Open link preview dialog
function openLinkPreview() {
  openLinkPreviewDialog(props.editor);
}

function onEmbedConfirm(payload: { url: string }) {
  if (!props.editor || !payload.url) return;
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
const isDatePickerCell = computed(() => props.editor?.isActive('datePickerCell') ?? false);
const isCheckboxCell = computed(() => props.editor?.isActive('checkboxCell') ?? false);
const canMerge = computed(() => {
  if (!props.editor) return false;
  // Check if we can merge cells - editor should have a proper selection within a table
  return props.editor.can().chain().focus().mergeCells().run();
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

function setBlockStyle(value: string) {
  if (value === '0') {
    props.editor?.chain().focus().setParagraph().run();
    return;
  }

  const level = parseInt(value, 10);
  if (level >= 1 && level <= 6) {
    props.editor?.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  }
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

// Insert a date picker column type in the current table
function insertDatePickerColumn() {
  if (!props.editor) return;
  
  const { selection } = props.editor.state;
  const { $from } = selection;
  
  // Find the current cell position
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      const cellPos = $from.before(depth);
      const cellNode = node;
      
      // Create date picker cell node
      const datePickerNode = props.editor.schema.nodes.datePickerCell.create({
        date: '',
        placeholder: 'Select date',
      });
      
      // Replace the current cell with the date picker cell
      props.editor.chain().command(({ tr }) => {
        tr.replaceWith(cellPos, cellPos + cellNode.nodeSize, datePickerNode);
        return true;
      }).run();
      return;
    }
  }
  // No table cell found - cannot insert date picker column
  console.warn('insertDatePickerColumn: cursor is not inside a table cell');
}

// Insert a checkbox column type in the current table
function insertCheckboxColumn() {
  if (!props.editor) return;
  
  const { selection } = props.editor.state;
  const { $from } = selection;
  
  // Find the current cell position
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      const cellPos = $from.before(depth);
      const cellNode = node;
      
      // Create checkbox cell node
      const checkboxNode = props.editor.schema.nodes.checkboxCell.create({
        checked: false,
        label: '',
      });
      
      // Replace the current cell with the checkbox cell
      props.editor.chain().command(({ tr }) => {
        tr.replaceWith(cellPos, cellPos + cellNode.nodeSize, checkboxNode);
        return true;
      }).run();
      return;
    }
  }
  // No table cell found - cannot insert checkbox column
  console.warn('insertCheckboxColumn: cursor is not inside a table cell');
}

// Toggle the checkbox state
function toggleCurrentCheckbox() {
  if (!props.editor) return;
  props.editor.chain().focus().toggleCellCheckbox().run();
}

function onCellBgColorChange(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  props.editor?.chain().focus().setCellAttribute('backgroundColor', value).run();
}

// Table sorting operations
const tableSortColumn = ref<number | null>(null);
const tableSortDirection = ref<'asc' | 'desc' | null>(null);
const multiSortColumns = ref<Array<{ columnIndex: number; direction: 'asc' | 'desc'; priority: number }>>([]);

function sortTableAsc(event?: MouseEvent) {
  if (!props.editor) return;
  
  // Get current column index
  const colIndex = getCurrentTableColumn();
  if (colIndex === null) return;
  
  // Check if Shift key is held for multi-sort
  const addToMultiSort = event?.shiftKey ?? false;
  
  tableSortColumn.value = colIndex;
  tableSortDirection.value = 'asc';
  
  props.editor.chain().focus().sortTableByColumn({
    columnIndex: colIndex,
    direction: 'asc',
    excludeHeader: true,
    addToMultiSort,
  }).run();
  
  // Update multi-sort state
  updateMultiSortState();
}

function sortTableDesc(event?: MouseEvent) {
  if (!props.editor) return;
  
  // Get current column index
  const colIndex = getCurrentTableColumn();
  if (colIndex === null) return;
  
  // Check if Shift key is held for multi-sort
  const addToMultiSort = event?.shiftKey ?? false;
  
  tableSortColumn.value = colIndex;
  tableSortDirection.value = 'desc';
  
  props.editor.chain().focus().sortTableByColumn({
    columnIndex: colIndex,
    direction: 'desc',
    excludeHeader: true,
    addToMultiSort,
  }).run();
  
  // Update multi-sort state
  updateMultiSortState();
}

function clearTableSort() {
  if (!props.editor) return;
  
  tableSortColumn.value = null;
  tableSortDirection.value = null;
  multiSortColumns.value = [];
  
  props.editor.chain().focus().clearTableSort().run();
}

/**
 * Update multi-sort state from editor storage
 */
function updateMultiSortState() {
  if (!props.editor) return;
  
  const tableSort = props.editor.extensionManager.extensions.find(
    ext => ext.name === 'tableSort'
  );
  
  if (tableSort?.storage?.sortStates) {
    const states = Object.values(tableSort.storage.sortStates) as Array<Array<{ columnIndex: number; direction: 'asc' | 'desc'; priority?: number }>>;
    if (states.length > 0) {
      multiSortColumns.value = states[0].map((s, idx) => ({
        columnIndex: s.columnIndex,
        direction: s.direction,
        priority: s.priority ?? idx + 1,
      }));
    }
  }
}

/**
 * Get the column index of the current cursor position inside a table
 */
function getCurrentTableColumn(): number | null {
  if (!props.editor) return null;
  
  const { selection } = props.editor.state;
  const { $from } = selection;
  
  // Walk up to find the table cell
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      // Get the parent table row
      const tableRow = $from.node(depth - 1);
      if (tableRow && tableRow.type.name === 'tableRow') {
        // Calculate which cell we're in
        let pos = $from.before(depth);
        for (let i = 0; i < tableRow.childCount; i++) {
          const cell = tableRow.child(i);
          if (pos <= $from.pos && $from.pos < pos + cell.nodeSize) {
            return i;
          }
          pos += cell.nodeSize;
        }
      }
      break;
    }
  }
  
  return null;
}

// Computed for whether sort is active
const isSortActive = computed(() => tableSortColumn.value !== null);

// Math operations
function insertMathInline() {
  props.editor?.chain().focus().insertMathInline('').run();
}

function insertMathSymbol(symbol: string) {
  if (!props.editor) return;
  // Insert the symbol at current cursor position
  props.editor.chain().focus().insertContent(symbol).run();
}

// Press-bounce animation: drives a `.is-pressed` class on pointerdown so
// the CSS `@keyframes toolbar-pop` plays the press-down → overshoot →
// settle motion reliably. Chromium can freeze CSS animations triggered
// by `:active` mid-play, so we drive the class from JS instead. The
// reflow trick (`offsetWidth` read between remove/add) forces the
// animation to restart on every click, even rapid back-to-back presses.
// Delegated via a single `@pointerdown` listener on the root `.toolbar`
// div; `@pointerup` / `@pointerleave` cancel any in-flight reset.
let popResetTimer: ReturnType<typeof setTimeout> | null = null;

function findEnabledButton(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof Element)) return null;
  const btn = target.closest('button');
  return btn instanceof HTMLButtonElement && !btn.disabled ? btn : null;
}

function triggerPop(btn: HTMLButtonElement) {
  if (popResetTimer !== null) {
    clearTimeout(popResetTimer);
    popResetTimer = null;
  }
  // Remove the class, force a synchronous reflow, then re-add so the
  // keyframes restart from frame 0 even when re-triggered before the
  // previous run finishes.
  btn.classList.remove('is-pressed');
  void btn.offsetWidth;
  btn.classList.add('is-pressed');
  popResetTimer = setTimeout(() => {
    btn.classList.remove('is-pressed');
    popResetTimer = null;
  }, 240);
}

function onToolbarPointerDown(e: PointerEvent) {
  const btn = findEnabledButton(e.target);
  if (btn) triggerPop(btn);
}

function onToolbarPointerUp() {
  if (popResetTimer !== null) {
    clearTimeout(popResetTimer);
    popResetTimer = null;
  }
}
</script>

<template>
  <div
    class="toolbar"
    :class="{ 'hide-labels': !showButtonLabels }"
    @pointerdown="onToolbarPointerDown"
    @pointerup="onToolbarPointerUp"
  >
    <!-- Mode switcher group - visible in all modes -->
    <div class="toolbar-group mode-switcher">
      <button
        title="WYSIWYG Mode"
        :class="{ active: mode === 'wysiwyg' }"
        @mousedown.prevent="emit('setMode', 'wysiwyg')"
      >
        <span class="btn-icon"><LayoutTemplate :size="14" :stroke-width="2" /></span>
        <span class="btn-label">WYSIWYG</span>
      </button>
      <button
        title="Source Mode"
        :class="{ active: mode === 'source' }"
        @mousedown.prevent="emit('setMode', 'source')"
      >
        <span class="btn-icon"><Code :size="14" :stroke-width="2" /></span>
        <span class="btn-label">Source</span>
      </button>
      <button
        title="Preview Mode"
        :class="{ active: mode === 'preview' }"
        @mousedown.prevent="emit('setMode', 'preview')"
      >
        <span class="btn-icon"><Eye :size="14" :stroke-width="2" /></span>
        <span class="btn-label">Preview</span>
      </button>
      <button
        title="Split Mode"
        :class="{ active: mode === 'split' }"
        @mousedown.prevent="emit('setMode', 'split')"
      >
        <span class="btn-icon"><Columns2 :size="14" :stroke-width="2" /></span>
        <span class="btn-label">Split</span>
      </button>
    </div>

    <template v-if="mode === 'wysiwyg' && !toolbarHidden">
      <div class="toolbar-group">
        <label class="heading-label" for="heading-select">Style</label>
        <select
          id="heading-select"
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
          @mousedown.prevent="editor?.chain().focus().toggleBold().run()"
        >
          <span class="btn-icon"><Bold :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Bold</span>
        </button>
        <button
          title="Italic (Ctrl+I)"
          :class="{ active: editor?.isActive('italic') }"
          @mousedown.prevent="editor?.chain().focus().toggleItalic().run()"
        >
          <span class="btn-icon"><Italic :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Italic</span>
        </button>
        <button
          title="Underline (Ctrl+U)"
          :class="{ active: editor?.isActive('underline') }"
          @mousedown.prevent="editor?.chain().focus().toggleUnderline().run()"
        >
          <span class="btn-icon"><Underline :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Underline</span>
        </button>
        <button
          title="Strikethrough (Ctrl+Shift+X)"
          :class="{ active: editor?.isActive('strike') }"
          @mousedown.prevent="editor?.chain().focus().toggleStrike().run()"
        >
          <span class="btn-icon"><Strikethrough :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Strike</span>
        </button>
        <button
          title="Highlight"
          :class="{ active: editor?.isActive('highlight') }"
          @mousedown.prevent="editor?.chain().focus().toggleHighlight().run()"
        >
          <span class="btn-icon"><Highlighter :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Highlight</span>
        </button>
      </div>

      <div class="toolbar-group">
        <button
          title="Bullet List"
          :class="{ active: editor?.isActive('bulletList') }"
          @mousedown.prevent="editor?.chain().focus().toggleBulletList().run()"
        >
          <span class="btn-icon"><List :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Bullet</span>
        </button>
        <button
          title="Ordered List"
          :class="{ active: editor?.isActive('orderedList') }"
          @mousedown.prevent="editor?.chain().focus().toggleOrderedList().run()"
        >
          <span class="btn-icon"><ListOrdered :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Numbered</span>
        </button>
        <button
          title="Blockquote"
          :class="{ active: editor?.isActive('blockquote') }"
          @mousedown.prevent="editor?.chain().focus().toggleBlockquote().run()"
        >
          <span class="btn-icon"><Quote :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Quote</span>
        </button>
        <button
          title="Code Block"
          :class="{ active: editor?.isActive('codeBlock') }"
          @mousedown.prevent="editor?.chain().focus().toggleCodeBlock().run()"
        >
          <span class="btn-icon"><Code2 :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Code</span>
        </button>
      </div>

      <div class="toolbar-group">
        <button
          title="Align Left"
          :class="{ active: editor?.isActive({textAlign:'left'}) }"
          @mousedown.prevent="editor?.chain().focus().setTextAlign('left').run()"
        >
          <span class="btn-icon"><AlignLeft :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Left</span>
        </button>
        <button
          title="Align Center"
          :class="{ active: editor?.isActive({textAlign:'center'}) }"
          @mousedown.prevent="editor?.chain().focus().setTextAlign('center').run()"
        >
          <span class="btn-icon"><AlignCenter :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Center</span>
        </button>
        <button
          title="Align Right"
          :class="{ active: editor?.isActive({textAlign:'right'}) }"
          @mousedown.prevent="editor?.chain().focus().setTextAlign('right').run()"
        >
          <span class="btn-icon"><AlignRight :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Right</span>
        </button>
        <button
          title="Justify"
          :class="{ active: editor?.isActive({textAlign:'justify'}) }"
          @mousedown.prevent="editor?.chain().focus().setTextAlign('justify').run()"
        >
          <span class="btn-icon"><AlignJustify :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Justify</span>
        </button>
      </div>

      <div class="toolbar-group">
        <label
          class="color-picker-label"
          title="Text Color"
          for="text-color-input"
        >
          <span class="btn-icon"><Palette :size="14" :stroke-width="2" /></span>
          <input
            id="text-color-input"
            type="color"
            class="color-input"
            :value="currentColor"
            @input="onColorChange"
          />
          <span class="btn-label">Color</span>
        </label>
        <button
          title="Remove Text Color"
          @mousedown.prevent="editor?.chain().focus().unsetColor().run()"
        >
          <span class="btn-icon"><Ban :size="14" :stroke-width="2" /></span>
          <span class="btn-label">No Color</span>
        </button>
        <label
          class="color-picker-label"
          title="Block Background Color"
          for="block-bg-color-input"
        >
          <span class="btn-icon">
            <span class="block-bg-icon" :class="{ 'has-color': hasBlockBgColor }" :style="{ backgroundColor: currentBlockBgColor || 'transparent' }">
              <span v-if="!hasBlockBgColor" class="bg-text">BG</span>
            </span>
          </span>
          <input
            id="block-bg-color-input"
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
          @mousedown.prevent="onClearBlockBgColor"        >
          <span class="btn-icon"><Eraser :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Clear BG</span>
        </button>
      </div>

      <div class="toolbar-group">
        <button
          title="Insert / Edit Link (Ctrl+K)"
          :class="{ active: isLinkActive }"
          @mousedown.prevent="openLinkDialog"
        >
          <span class="btn-icon"><Link :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Link</span>
        </button>
        <button
          title="Remove Link"
          :disabled="!isLinkActive"
          @mousedown.prevent="unlink"        >
          <span class="btn-icon"><Unlink :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Unlink</span>
        </button>
      </div>

      <div class="toolbar-group">
        <button
          title="Insert Image"
          @mousedown.prevent="imageDialogVisible = true"
        >
          <span class="btn-icon"><Image :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Image</span>
        </button>
        <button
          title="Insert Table"
          @mousedown.prevent="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
        >
          <span class="btn-icon"><Table2 :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Table</span>
        </button>
        <button
          title="Horizontal Rule"
          @mousedown.prevent="editor?.chain().focus().setHorizontalRule().run()"
        >
          <span class="btn-icon"><Minus :size="14" :stroke-width="2" /></span>
          <span class="btn-label">HR</span>
        </button>
        <button
          title="Callout"
          @mousedown.prevent="editor?.chain().focus().insertCallout().run()"
        >
          <span class="btn-icon"><Lightbulb :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Callout</span>
        </button>
        <button
          title="Cover Image"
          @mousedown.prevent="emit('openCoverDialog')"
        >
          <span class="btn-icon"><ImagePlus :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Cover</span>
        </button>
        <button
          title="Toggle"
          @mousedown.prevent="editor?.chain().focus().insertToggle().run()"
        >
          <span class="btn-icon"><ChevronRight :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Toggle</span>
        </button>
        <button
          title="Embed"
          @mousedown.prevent="openEmbedDialog"        >
          <span class="btn-icon"><Paperclip :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Embed</span>
        </button>
        <button
          title="Link Preview"
          @mousedown.prevent="openLinkPreview()"
        >
          <span class="btn-icon"><Globe :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Preview</span>
        </button>
        <button
          title="Footnote (Ctrl+Shift+F)"
          @mousedown.prevent="editor?.chain().focus().insertFootnote().run()"
        >
          <span class="btn-icon"><Superscript :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Footnote</span>
        </button>
        <button
          title="Inline Math ($...$)"
          :class="{ active: editor?.isActive('mathInline') }"
          @mousedown.prevent="insertMathInline"        >
          <span class="btn-icon"><FunctionSquare :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Inline</span>
        </button>
        <MathSymbolsDropdown
          @insert-math-block="editor?.chain().focus().insertMathBlock().run()"
          @insert-math-inline="insertMathInline"
          @insert-symbol="insertMathSymbol"
        />
        <button
          title="Format Painter (click once or double-click to keep active)"
          :class="{ active: formatPainterActive }"
          @click="onFormatPainterClick"
        >
          <span class="btn-icon"><PaintbrushVertical :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Paint</span>
        </button>
        <button
          title="Table of Contents"
          :class="{ active: showTOC }"
          @mousedown.prevent="emit('toggleTOC')"
        >
          <span class="btn-icon"><BookOpen :size="14" :stroke-width="2" /></span>
          <span class="btn-label">TOC</span>
        </button>
        <button
          title="Backlinks"
          :class="{ active: showBacklinks }"
          @mousedown.prevent="emit('toggleBacklinks')"
        >
          <span class="btn-icon"><Library :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Links</span>
        </button>
        <button
          title="Templates (Ctrl+T)"
          @mousedown.prevent="emit('toggleTemplate')"
        >
          <span class="btn-icon"><LayoutTemplate :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Templates</span>
        </button>
        <button
          title="Version History"
          :class="{ active: showVersionHistory }"
          @mousedown.prevent="emit('toggleVersionHistory')"
        >
          <span class="btn-icon"><History :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Versions</span>
        </button>
        <button
          title="Undo History"
          :class="{ active: showHistory }"
          @mousedown.prevent="emit('toggleHistory')"
        >
          <span class="btn-icon"><Undo2 :size="14" :stroke-width="2" /></span>
          <span class="btn-label">History</span>
        </button>
      </div>

      <!-- Table operations - only shown when cursor is in a table -->
      <div v-if="isTableActive" class="toolbar-group">
        <button
          title="Add Row Below"
          @mousedown.prevent="addTableRow"        >
          <span class="btn-icon"><Rows :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Add Row</span>
        </button>
        <button
          title="Delete Row"
          @mousedown.prevent="deleteTableRow"        >
          <span class="btn-icon"><Minus :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Del Row</span>
        </button>
        <button
          title="Add Column After"
          @mousedown.prevent="addTableColumn"        >
          <span class="btn-icon"><Columns3 :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Add Col</span>
        </button>
        <button
          title="Delete Column"
          @mousedown.prevent="deleteTableColumn"        >
          <span class="btn-icon"><Minus :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Del Col</span>
        </button>
        <button
          title="Merge Cells"
          @mousedown.prevent="mergeTableCells"        >
          <span class="btn-icon"><Combine :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Merge</span>
        </button>
        <button
          title="Split Cell"
          @mousedown.prevent="splitTableCells"        >
          <span class="btn-icon"><Split :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Split</span>
        </button>
        <button
          title="Toggle Header Row"
          :class="{ active: isTableHeader }"
          @mousedown.prevent="toggleTableHeaderRow"        >
          <span class="btn-icon"><Heading :size="14" :stroke-width="2" /></span>
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
        <button
          title="Sort Ascending (Shift+click for multi-sort)"
          :class="{ active: isSortActive && tableSortDirection === 'asc' }"
          @mousedown="(e) => { e.preventDefault(); sortTableAsc(e); }"
        >
          <span class="btn-icon"><ArrowUp :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Sort ↑</span>
        </button>
        <button
          title="Sort Descending (Shift+click for multi-sort)"
          :class="{ active: isSortActive && tableSortDirection === 'desc' }"
          @mousedown="(e) => { e.preventDefault(); sortTableDesc(e); }"
        >
          <span class="btn-icon"><ArrowDown :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Sort ↓</span>
        </button>
        <button
          v-if="isSortActive"
          title="Clear Sort"
          @mousedown.prevent="clearTableSort"        >
          <span class="btn-icon"><Eraser :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Clear</span>
        </button>
        <button
          title="Insert Date Picker Column"
          @mousedown.prevent="insertDatePickerColumn"        >
          <span class="btn-icon"><Calendar :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Date</span>
        </button>
        <button
          title="Insert Checkbox Column"
          @mousedown.prevent="insertCheckboxColumn"        >
          <span class="btn-icon"><CheckSquare :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Checkbox</span>
        </button>
        <button
          v-if="isCheckboxCell"
          title="Toggle Checkbox"
          :class="{ active: isCheckboxCell }"
          @mousedown.prevent="toggleCurrentCheckbox"        >
          <span class="btn-icon"><ToggleRight :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Toggle</span>
        </button>
      </div>

      <!-- Column operations - only shown when cursor is in a column -->
      <div v-if="isColumnActive" class="toolbar-group">
        <button
          title="Add Column Left"
          @mousedown.prevent="editor?.chain().focus().addColumnLeft().run()"
        >
          <span class="btn-icon"><ChevronsLeft :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Add Left</span>
        </button>
        <button
          title="Add Column Right"
          @mousedown.prevent="editor?.chain().focus().addColumnRight().run()"
        >
          <span class="btn-icon"><ChevronsRight :size="14" :stroke-width="2" /></span>
          <span class="btn-label">Add Right</span>
        </button>
        <button
          title="Delete Column"
          @mousedown.prevent="editor?.chain().focus().deleteColumn().run()"
        >
          <span class="btn-icon"><Minus :size="14" :stroke-width="2" /></span>
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
        <span class="btn-icon"><Download :size="14" :stroke-width="2" /></span>
        <span class="btn-label">Export</span>
      </button>
    </div>

    <div class="toolbar-spacer" />

    <!-- Version indicator -->
    <span class="version-indicator" title="Htmly version">v1.8.0-build-1</span>

    <!-- Save status indicator -->
    <span v-if="saveStatus === 'saving'" class="save-indicator saving" title="Saving...">Saving...</span>
    <span v-else-if="saveStatus === 'saved'" class="save-indicator saved" title="Saved">✓ Saved</span>
    <span v-else-if="saveStatus === 'error'" class="save-indicator error" title="Save failed">✗ Error</span>
    <span v-else-if="dirty" class="dirty-indicator" title="Unsaved changes"><Circle :size="8" :stroke-width="0" fill="currentColor" /></span>
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
  border-radius: var(--radius-lg);
  padding: 2px 4px;
  border-right: none;
  box-shadow: var(--shadow-1);
  transition: box-shadow var(--duration-base) var(--ease-out);
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
  border-radius: var(--radius-md);
  padding: 4px 8px;
  cursor: pointer;
  font-size: 13px;
  min-width: 28px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  will-change: transform;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
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
  box-shadow: var(--shadow-1);
}

button:focus-visible {
  outline: 2px solid var(--vscode-focusBorder, #0e639c);
  outline-offset: 1px;
}

button:disabled,
.heading-select:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  transition: none;
}

button:disabled:hover {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}

button.active {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #fff);
  box-shadow: var(--shadow-2);
}

/* Springy pop animation driven by the .is-pressed class
   (toggled by onToolbarPointerDown in <script setup>). Plays the full
   press-down → overshoot → settle motion on every click. */
@keyframes toolbar-pop {
  0%   { transform: scale(1); }
  35%  { transform: scale(0.92); }
  70%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}

button.is-pressed:not(:disabled) {
  animation: toolbar-pop var(--duration-base) var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  button.is-pressed {
    animation: none;
  }
}

.heading-select {
  background: var(--vscode-dropdown-background, #3c3c3c);
  color: var(--vscode-dropdown-foreground, #ccc);
  border: 1px solid var(--vscode-dropdown-border, #555);
  border-radius: var(--radius-md);
  padding: 4px 6px;
  font-size: 12px;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.heading-select:focus-visible {
  outline: 2px solid var(--vscode-focusBorder, #0e639c);
  outline-offset: 1px;
  border-color: var(--vscode-focusBorder, #0e639c);
}

.heading-label {
  font-size: 11px;
  color: var(--vscode-editor-foreground, #ccc);
  margin-right: 2px;
}

.color-picker-label {
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  position: relative;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.color-picker-label:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
  box-shadow: var(--shadow-1);
}

.color-picker-label:focus-within {
  outline: 2px solid var(--vscode-focusBorder, #0e639c);
  outline-offset: 1px;
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

.version-indicator {
  color: var(--vscode-descriptionForeground, #858585);
  font-size: 10px;
  font-family: var(--vscode-editor-font-family, monospace);
  padding: 2px 6px;
  cursor: default;
  flex-shrink: 0;
  user-select: none;
}

.save-indicator {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: var(--radius-md);
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
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  position: relative;
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.cell-bg-label:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
  box-shadow: var(--shadow-1);
}

.cell-bg-label:focus-within {
  outline: 2px solid var(--vscode-focusBorder, #0e639c);
  outline-offset: 1px;
}

.cell-bg-preview {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  display: inline-block;
}

/* Block background color icon */
.block-bg-icon {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-sm);
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

/* Table sort button styles */
button .btn-icon {
  position: relative;
}

button .btn-icon:has(.sort-indicator) {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
</style>
