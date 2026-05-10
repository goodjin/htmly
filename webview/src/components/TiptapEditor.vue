<script setup lang="ts">
import { onBeforeUnmount, watch, ref, onMounted, nextTick, computed } from 'vue';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import { NodeSelection } from '@tiptap/pm/state';
import LinkDialog from './LinkDialog.vue';
import ImageDialog from './ImageDialog.vue';
import EmbedDialog from './EmbedDialog.vue';
import EmojiPicker from './EmojiPicker.vue';
import { escapeHtml } from '../core/htmlUtils';
import { SlashCommandsExtension, setEmbedDialogOpener } from '../extensions/slashCommands';
import { MarkdownShortcutsExtension } from '../extensions/markdownShortcuts';
import { 
  DragHandleExtension, 
  startDrag, 
  updateDropPosition, 
  endDrag,
  cancelDrag,
  getDragState 
} from '../extensions/dragHandle';
import { ImageResizeExtension, imageResizeKey, type ResizeState } from '../extensions/imageResize';
import { Callout } from '../extensions/Callout';
import { Embed, toEmbedUrl } from '../extensions/Embed';
import { TOCPlugin } from '../extensions/TOC';
import { Columns } from '../extensions/Columns';
import { Column } from '../extensions/Column';
import { ColumnResizeExtension } from '../extensions/columnResize';

const props = withDefaults(defineProps<{
  modelValue: string;   // HTML string
  enableMarkdownShortcuts?: boolean;
  formatPainterActive?: boolean;
  formatPainterState?: FormatPainterState | null;
}>(), {
  formatPainterActive: false,
  formatPainterState: null,
});

const emit = defineEmits<{
  'update:modelValue': [html: string];
  'format-painter-applied': [];
}>();

// Format painter state interface
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

// Create lowlight instance with common languages for syntax highlighting
const lowlight = createLowlight({
  javascript,
  typescript,
  css,
  xml,
  python,
  json,
});

// Drag overlay ref for positioning handles outside ProseMirror DOM
const dragOverlay = ref<HTMLElement | null>(null);

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      // Disable StarterKit's built-in input rules since we control them via the MarkdownShortcutsExtension
      inputRules: false,
      // Disable StarterKit's built-in code block since we use CodeBlockLowlight for syntax highlighting
      codeBlock: false,
    }),
    Underline,
    Link.configure({ openOnClick: false }),
    Image,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight,
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    Placeholder.configure({ placeholder: 'Start writing HTML…' }),
    TextStyle,
    Color,
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'plaintext',
      HTMLAttributes: {
        class: 'code-block',
      },
    }),
    SlashCommandsExtension,
    MarkdownShortcutsExtension.configure({
      enabled: props.enableMarkdownShortcuts !== false,
    }),
    DragHandleExtension,
    ImageResizeExtension,
    Callout,
    Embed,
    TOCPlugin,
    Columns,
    Column,
    ColumnResizeExtension,
  ],
  editorProps: {
    attributes: { class: 'tiptap-editor' },
    handleDragStart: (view, event) => {
      const target = event.target as HTMLElement;
      const dragHandle = target.closest('.drag-handle');
      if (!dragHandle) return false;
      
      const blockElement = dragHandle.closest('[data-drag-block]') as HTMLElement;
      if (!blockElement || !blockElement.dataset.dragPos) return false;
      
      const pos = parseInt(blockElement.dataset.dragPos, 10);
      const node = view.state.doc.nodeAt(pos);
      if (!node) return false;
      
      event.dataTransfer!.effectAllowed = 'move';
      event.dataTransfer!.setData('text/plain', '');
      
      startDrag(view, pos, node);
      return true;
    },
    handleDragOver: (view, event) => {
      if (!getDragState().active) return false;
      
      const coords = { left: event.clientX, top: event.clientY };
      const pos = view.posAtCoords(coords);
      if (!pos) return false;
      
      updateDropPosition(view, pos.pos);
      return true;
    },
    handleDrop: (view, event) => {
      if (!getDragState().active) return false;
      
      event.preventDefault();
      endDrag(view);
      return true;
    },
    handleDragEnd: (view) => {
      cancelDrag(view);
      return false;
    },
    handlePaste: (view, event) => {
      // Handle image paste from clipboard
      const items = event.clipboardData?.items;
      if (!items) return false;
      
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          const file = item.getAsFile();
          if (!file) return false;
          
          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target?.result as string;
            if (src && editor.value) {
              // Get the current selection position
              const { from } = view.state.selection;
              editor.value.chain().focus().setImage({ src, alt: '' }).run();
            }
          };
          reader.readAsDataURL(file);
          return true;
        }
      }
      
      return false;
    },
  },
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getHTML());
  },
});

// Sync external content changes (e.g. file changed on disk)
watch(
  () => props.modelValue,
  (newContent) => {
    if (!editor.value) return;
    const currentHtml = editor.value.getHTML();
    if (newContent !== currentHtml) {
      editor.value.commands.setContent(newContent, false);
    }
  }
);

// Set up drag handles when editor is ready
watch(editor, (newEditor) => {
  if (newEditor) {
    nextTick(() => {
      setupDragHandles(newEditor);
    });
  }
}, { immediate: true });

// Also set up drag handles when content changes (after transactions)
watch(
  () => editor.value?.state,
  () => {
    if (editor.value) {
      nextTick(() => {
        setupDragHandles(editor.value!);
      });
    }
  }
);

function setupDragHandles(ed: typeof editor.value) {
  if (!ed) return;
  
  const editorDom = ed.view.dom as HTMLElement;
  if (!editorDom) return;
  
  // Clean up existing handles from overlay before re-creating
  if (dragOverlay.value) {
    const existingHandles = dragOverlay.value.querySelectorAll('.drag-handle');
    existingHandles.forEach(h => h.remove());
  }
  
  // Find all direct children of the editor which are block elements
  const blockSelector = 'p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, table';
  const blocks = editorDom.querySelectorAll(blockSelector);
  
  blocks.forEach((block) => {
    // Skip if already set up
    if (block.dataset.dragBlock) return;
    
    // Find the position of this block using coordinates
    const rect = block.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const coords = ed.view.posAtCoords({ left: centerX, top: centerY });
    if (coords) {
      // Get the resolved position and find the block start
      const $pos = ed.view.state.doc.resolve(coords.pos);
      // Walk up to find a block node
      for (let depth = $pos.depth; depth >= 0; depth--) {
        const node = $pos.node(depth);
        if (node.isBlock && depth > 0) {
          // Set the position to the start of this block
          block.dataset.dragPos = String($pos.before(depth));
          break;
        }
      }
    }
    
    // Only add drag handle if we found a valid position
    if (block.dataset.dragPos) {
      block.dataset.dragBlock = 'true';
      
      // Create drag handle
      const handle = document.createElement('div');
      handle.className = 'drag-handle';
      handle.contentEditable = 'false';
      handle.draggable = true;
      handle.innerHTML = '⠿';
      handle.title = 'Drag to reorder';
      
      // Style the drag handle - absolute positioned within overlay
      handle.style.cssText = `
        position: absolute;
        width: 20px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        opacity: 0;
        transition: opacity 0.15s;
        color: var(--vscode-editor-foreground, #ccc);
        font-size: 14px;
        user-select: none;
        z-index: 10;
        pointer-events: auto;
      `;
      
      // Position handle relative to the overlay based on block position
      // Store block reference for positioning updates
      (handle as any)._blockRef = block;
      
      // Initial positioning
      const overlayRect = dragOverlay.value?.getBoundingClientRect();
      if (overlayRect && dragOverlay.value) {
        const blockRect = block.getBoundingClientRect();
        handle.style.left = `${blockRect.left - overlayRect.left - 24}px`;
        handle.style.top = `${blockRect.top - overlayRect.top + blockRect.height / 2 - 12}px`;
      }
      
      // Show handle on hover (using handle's own mouse events)
      handle.addEventListener('mouseenter', () => {
        if (!getDragState().active) {
          handle.style.opacity = '0.6';
        }
      });
      handle.addEventListener('mouseleave', () => {
        if (!getDragState().active) {
          handle.style.opacity = '0';
        }
      });
      
      // Add drag events to handle
      handle.addEventListener('dragstart', (e: DragEvent) => {
        if (!ed) return;
        const pos = parseInt(block.dataset.dragPos!, 10);
        const node = ed.view.state.doc.nodeAt(pos);
        if (!node) return;
        
        handle.style.opacity = '1';
        handle.style.cursor = 'grabbing';
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('text/plain', '');
        
        startDrag(ed.view, pos, node);
      });
      
      handle.addEventListener('dragend', () => {
        handle.style.opacity = '0';
        handle.style.cursor = 'grab';
        cancelDrag(ed.view);
      });
      
      // Add handle to overlay instead of block
      dragOverlay.value?.appendChild(handle);
    }
  });
  
  // Set up drag over handling on the editor container
  editorDom.addEventListener('dragover', (e: DragEvent) => {
    if (!ed || !getDragState().active) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    
    const coords = { left: e.clientX, top: e.clientY };
    const pos = ed.view.posAtCoords(coords);
    if (pos) {
      updateDropPosition(ed.view, pos.pos);
    }
  });
  
  editorDom.addEventListener('drop', (e: DragEvent) => {
    if (!ed) return;
    e.preventDefault();
    endDrag(ed.view);
  });
}

onBeforeUnmount(() => {
  editor.value?.destroy();
});

defineExpose({ editor });

// Format painter: handle click to apply formatting
function handleEditorClick(e: MouseEvent) {
  if (!props.formatPainterActive || !editor.value || !props.formatPainterState) return;
  
  const target = e.target as HTMLElement;
  // Don't intercept clicks on UI elements
  if (target.closest('.bubble-menu') || target.closest('.dialog') || target.closest('.search-bar')) {
    return;
  }
  
  const pos = editor.value.view.posAtCoords({ left: e.clientX, top: e.clientY });
  if (!pos) return;
  
  const state = props.formatPainterState;
  const chain = editor.value.chain().focus();
  
  // Set selection at click position
  chain.setTextSelection(pos.pos);
  
  // Apply the stored formatting
  if (state.bold) chain.toggleBold().run();
  if (state.italic) chain.toggleItalic().run();
  if (state.underline) chain.toggleUnderline().run();
  if (state.strike) chain.toggleStrike().run();
  if (state.code) chain.toggleCode().run();
  if (state.highlight) chain.toggleHighlight().run();
  
  if (state.link) {
    chain.setLink({ href: state.link.href }).run();
  }
  
  if (state.textColor) {
    chain.setColor(state.textColor).run();
  }
  
  if (state.textAlign) {
    chain.setTextAlign(state.textAlign).run();
  }
  
  // Emit that format was applied (for single-use mode deactivation)
  emit('format-painter-applied');
}

// Link dialog state for BubbleMenu
const linkDialogVisible = ref(false);
const linkInitialUrl = ref('');
const linkInitialText = ref('');

function openLinkDialog() {
  if (!editor.value) return;
  const attrs = editor.value.getAttributes('link');
  linkInitialUrl.value = attrs.href ?? '';
  const { from, to } = editor.value.state.selection;
  linkInitialText.value = editor.value.state.doc.textBetween(from, to, '');
  linkDialogVisible.value = true;
}

function onLinkConfirm(payload: { url: string; text: string }) {
  if (!editor.value) return;
  const { url, text } = payload;
  const chain = editor.value.chain().focus();
  const safeUrl = escapeHtml(url);

  if (text && !editor.value.state.selection.empty) {
    chain.setLink({ href: safeUrl }).run();
  } else if (text) {
    chain.insertContent(`<a href="${safeUrl}">${escapeHtml(text)}</a>`).run();
  } else {
    chain.setLink({ href: safeUrl }).run();
  }
  linkDialogVisible.value = false;
}

function btn(action: () => void) {
  return (e: MouseEvent) => {
    e.preventDefault();
    action();
  };
}

// Image alt text dialog state
const imageAltDialogVisible = ref(false);
const imageAltInitialSrc = ref('');
const imageAltInitialAlt = ref('');

function openImageAltDialog() {
  if (!editor.value) return;
  const attrs = editor.value.getAttributes('image');
  imageAltInitialSrc.value = attrs.src ?? '';
  imageAltInitialAlt.value = attrs.alt ?? '';
  imageAltDialogVisible.value = true;
}

function onImageAltConfirm(payload: { src: string; alt: string }) {
  if (!editor.value) return;
  const { src, alt } = payload;
  
  // Find the image node at current selection and update it
  const { selection } = editor.value.state;
  if (selection instanceof NodeSelection && selection.node?.type.name === 'image') {
    const pos = selection.from;
    const node = selection.node;
    const newAttrs = { ...node.attrs, src, alt };
    
    const tr = editor.value.state.tr;
    tr.setNodeMarkup(pos, undefined, newAttrs);
    editor.value.view.dispatch(tr);
  }
  imageAltDialogVisible.value = false;
}

// Image resize dragging state
let resizeState: ResizeState | null = null;

// Callout current background color for bubble menu
const calloutBgColor = computed(() => {
  if (!editor.value?.isActive('callout')) return '#fef3c7';
  return editor.value.getAttributes('callout').backgroundColor ?? '#fef3c7';
});

// Callout current icon for bubble menu
const calloutIcon = computed(() => {
  if (!editor.value?.isActive('callout')) return '💡';
  return editor.value.getAttributes('callout').icon ?? '💡';
});

function onCalloutBgColorChange(e: Event) {
  const value = (e.target as HTMLInputElement).value;
  editor.value?.chain().focus().updateCalloutBackground(value).run();
}

function onCalloutIconChange(emoji: string) {
  editor.value?.chain().focus().updateCalloutIcon(emoji).run();
}

// Embed dialog state
const embedDialogVisible = ref(false);

function openEmbedDialog() {
  embedDialogVisible.value = true;
}

function onEmbedConfirm(payload: { url: string }) {
  if (!editor.value || !payload.url) return;
  
  const embedUrl = toEmbedUrl(payload.url);
  if (embedUrl) {
    editor.value.chain().focus().insertEmbed(embedUrl).run();
  }
  embedDialogVisible.value = false;
}

// Register embed dialog opener for slash commands
setEmbedDialogOpener(openEmbedDialog);

function onEditorDblClick(e: MouseEvent) {
  // Check if double-clicked on an image
  const target = e.target as HTMLElement;
  const img = target.closest('img');
  if (img && editor.value) {
    // Select the image and open alt text dialog
    const pos = editor.value.view.posAtCoords({ left: e.clientX, top: e.clientY });
    if (pos) {
      const $pos = editor.value.state.doc.resolve(pos.pos);
      if ($pos.parent.type.name === 'image' || $pos.nodeAfter?.type.name === 'image') {
        // Select the image node first so getAttributes() returns correct values
        editor.value.chain().setNodeSelection(pos.pos).run();
        
        // Open the image alt dialog
        openImageAltDialog();
      }
    }
  }
}

// Set up mouse event listeners for image resize dragging
onMounted(() => {
  nextTick(() => {
    const editorDom = document.querySelector('.ProseMirror') as HTMLElement;
    if (!editorDom) return;
    
    // Mouse move for resize dragging
    editorDom.addEventListener('mousemove', (e: MouseEvent) => {
      if (!editor.value) return;
      
      // Get resize state from plugin state instead of local variable
      const state = imageResizeKey.getState(editor.value.state) as ResizeState | null;
      if (!state?.active) return;
      
      const img = editorDom.querySelector('img.ProseMirror-selectednode') as HTMLImageElement;
      if (!img) return;
      
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      
      let newWidth = state.startWidth;
      let newHeight = state.startHeight;
      
      // Calculate new dimensions based on handle being dragged
      // For simplicity, we'll resize proportionally based on corner
      const aspectRatio = state.startWidth / state.startHeight;
      
      if (state.handle === 'se' || state.handle === 'e') {
        newWidth = Math.max(20, state.startWidth + dx);
        newHeight = newWidth / aspectRatio;
      } else if (state.handle === 'sw' || state.handle === 'w') {
        newWidth = Math.max(20, state.startWidth - dx);
        newHeight = newWidth / aspectRatio;
      } else if (state.handle === 'ne' || state.handle === 'n') {
        newHeight = Math.max(20, state.startHeight - dy);
        newWidth = newHeight * aspectRatio;
      } else if (state.handle === 's' || state.handle === 'nw') {
        newHeight = Math.max(20, state.startHeight + dy);
        newWidth = newHeight * aspectRatio;
      }
      
      // Apply the new dimensions visually (CSS)
      img.style.width = `${newWidth}px`;
      img.style.height = `${newHeight}px`;
    });
    
    // Mouse up for resize dragging
    editorDom.addEventListener('mouseup', (e: MouseEvent) => {
      if (!editor.value) return;
      
      // Get resize state from plugin state instead of local variable
      const state = imageResizeKey.getState(editor.value.state) as ResizeState | null;
      if (!state?.active) return;
      
      const img = editorDom.querySelector('img.ProseMirror-selectednode') as HTMLImageElement;
      if (!img) return;
      
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      
      const aspectRatio = state.startWidth / state.startHeight;
      
      let newWidth = state.startWidth;
      let newHeight = state.startHeight;
      
      if (state.handle === 'se' || state.handle === 'e') {
        newWidth = Math.max(20, state.startWidth + dx);
        newHeight = newWidth / aspectRatio;
      } else if (state.handle === 'sw' || state.handle === 'w') {
        newWidth = Math.max(20, state.startWidth - dx);
        newHeight = newWidth / aspectRatio;
      } else if (state.handle === 'ne' || state.handle === 'n') {
        newHeight = Math.max(20, state.startHeight - dy);
        newWidth = newHeight * aspectRatio;
      } else if (state.handle === 's' || state.handle === 'nw') {
        newHeight = Math.max(20, state.startHeight + dy);
        newWidth = newHeight * aspectRatio;
      }
      
      // Update the image node in ProseMirror
      const { selection } = editor.value.state;
      if (selection instanceof NodeSelection && selection.node?.type.name === 'image') {
        const pos = selection.from;
        const node = selection.node;
        const newAttrs = { ...node.attrs, width: Math.round(newWidth), height: Math.round(newHeight) };
        
        const tr = editor.value.state.tr;
        tr.setNodeMarkup(pos, undefined, newAttrs);
        editor.value.view.dispatch(tr);
      }
      
      // Reset resize state in plugin
      const { tr } = editor.value.state;
      tr.setMeta(imageResizeKey, {
        active: false,
        pos: null,
        handle: null,
        startX: 0,
        startY: 0,
        startWidth: 0,
        startHeight: 0,
        originalWidth: 0,
        originalHeight: 0,
      });
      editor.value.view.dispatch(tr);
    });
  });
});

// Handle file drop on the editor
function onEditorDragOver(e: DragEvent) {
  if (!editor.value) return;
  
  // Check if dragging files (not the block drag handle)
  if (e.dataTransfer?.types.includes('Files')) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
}

function onEditorDrop(e: DragEvent) {
  if (!editor.value) return;
  
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  
  // Check if any of the files are images
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      e.preventDefault();
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (src) {
          // Get drop position
          const coords = { left: e.clientX, top: e.clientY };
          const pos = editor.value!.view.posAtCoords(coords);
          
          if (pos) {
            // Set the position and insert the image
            editor.value!.chain().focus().setImage({ src, alt: '' }).run();
          } else {
            // Just insert at current position
            editor.value!.chain().focus().setImage({ src, alt: '' }).run();
          }
        }
      };
      reader.readAsDataURL(file);
      return; // Only handle first image
    }
  }
}
</script>

<template>
  <EditorContent :editor="editor" class="editor-wrap" @click="handleEditorClick" @dblclick="onEditorDblClick" @dragover.prevent="onEditorDragOver" @drop="onEditorDrop" />

  <!-- Drag handle overlay - outside ProseMirror DOM to prevent getHTML() from capturing handles -->
  <div ref="dragOverlay" class="drag-overlay" :style="{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }"></div>

  <BubbleMenu
    v-if="editor"
    :editor="editor"
    :tippy-options="{ duration: 100, placement: 'top' }"
    class="bubble-menu"
  >
    <button
      title="Bold (Ctrl+B)"
      :class="{ active: editor.isActive('bold') }"
      @mousedown="btn(() => editor.chain().focus().toggleBold().run())"
    >
      <b>B</b>
    </button>
    <button
      title="Italic (Ctrl+I)"
      :class="{ active: editor.isActive('italic') }"
      @mousedown="btn(() => editor.chain().focus().toggleItalic().run())"
    >
      <i>I</i>
    </button>
    <button
      title="Underline (Ctrl+U)"
      :class="{ active: editor.isActive('underline') }"
      @mousedown="btn(() => editor.chain().focus().toggleUnderline().run())"
    >
      <u>U</u>
    </button>
    <button
      title="Link (Ctrl+K)"
      :class="{ active: editor.isActive('link') }"
      @mousedown.prevent="openLinkDialog"
    >
      🔗
    </button>
    <button
      title="Code"
      :class="{ active: editor.isActive('code') }"
      @mousedown="btn(() => editor.chain().focus().toggleCode().run())"
    >
      <code>&lt;&gt;</code>
    </button>
    <button
      title="Highlight"
      :class="{ active: editor.isActive('highlight') }"
      @mousedown="btn(() => editor.chain().focus().toggleHighlight().run())"
    >
      <mark>H</mark>
    </button>
    <!-- Callout color picker - only visible when in a callout -->
    <label
      v-if="editor.isActive('callout')"
      class="callout-color-picker"
      title="Callout Background Color"
    >
      <span class="color-preview" :style="{ backgroundColor: calloutBgColor }"></span>
      <input
        type="color"
        class="color-input"
        :value="calloutBgColor"
        @input="onCalloutBgColorChange"
      />
    </label>
    <!-- Callout emoji picker - only visible when in a callout -->
    <EmojiPicker
      v-if="editor.isActive('callout')"
      :current-emoji="calloutIcon"
      @select="onCalloutIconChange"
    />
  </BubbleMenu>

  <LinkDialog
    :visible="linkDialogVisible"
    :initial-url="linkInitialUrl"
    :initial-text="linkInitialText"
    @confirm="onLinkConfirm"
    @cancel="linkDialogVisible = false"
  />
  
  <ImageDialog
    :visible="imageAltDialogVisible"
    :initial-src="imageAltInitialSrc"
    :initial-alt="imageAltInitialAlt"
    @confirm="onImageAltConfirm"
    @cancel="imageAltDialogVisible = false"
  />
  
  <EmbedDialog
    :visible="embedDialogVisible"
    @confirm="onEmbedConfirm"
    @cancel="embedDialogVisible = false"
  />
</template>

<style scoped>
.editor-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

:deep(.tiptap-editor) {
  flex: 1;
  overflow-y: auto;
}

.bubble-menu {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.bubble-menu button {
  background: transparent;
  border: 1px solid transparent;
  color: var(--vscode-editor-foreground, #ccc);
  border-radius: 3px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  min-width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bubble-menu button:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.bubble-menu button.active {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #fff);
}

.bubble-menu button mark {
  background: #fef08a;
  color: #000;
  padding: 0 2px;
  border-radius: 2px;
}

.bubble-menu button.active mark {
  background: #facc15;
}

/* Callout color picker in bubble menu */
.callout-color-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: 3px;
  position: relative;
  margin-left: 4px;
}

.callout-color-picker:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  display: inline-block;
}

.color-input {
  width: 0;
  height: 0;
  padding: 0;
  border: 0;
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.callout-color-picker:focus-within .color-input,
.callout-color-picker:active .color-input {
  pointer-events: auto;
  width: 24px;
  height: 24px;
  left: 0;
  top: 0;
  opacity: 1;
  cursor: pointer;
}

/* Drag handle styles */
.drag-handle {
  width: 20px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s;
  color: var(--vscode-editor-foreground, #ccc);
  font-size: 14px;
  user-select: none;
  z-index: 10;
  pointer-events: auto;
}

.drag-handle:hover {
  opacity: 1 !important;
}

.drag-handle:active {
  cursor: grabbing;
}

/* Drop indicator */
:deep(.drag-drop-indicator) {
  height: 2px;
  background: var(--vscode-focusBorder, #0e639c);
  margin: 4px 0;
  border-radius: 1px;
  pointer-events: none;
}

/* Dragging state */
:deep(.dragging) {
  opacity: 0.5;
}

/* Image resize handles */
:deep(.image-resize-handle) {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #0e639c;
  border: 2px solid white;
  border-radius: 2px;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

:deep(.image-resize-handle-nw) {
  top: -6px;
  left: -6px;
  cursor: nw-resize;
}

:deep(.image-resize-handle-ne) {
  top: -6px;
  right: -6px;
  cursor: ne-resize;
}

:deep(.image-resize-handle-sw) {
  bottom: -6px;
  left: -6px;
  cursor: sw-resize;
}

:deep(.image-resize-handle-se) {
  bottom: -6px;
  right: -6px;
  cursor: se-resize;
}

/* Image selection styles */
:deep(.ProseMirror-selectednode) {
  outline: 2px solid #0e639c;
  outline-offset: 2px;
}
</style>
