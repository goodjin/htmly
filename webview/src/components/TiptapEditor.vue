<script setup lang="ts">
import { onBeforeUnmount, watch, ref } from 'vue';
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
import LinkDialog from './LinkDialog.vue';
import { escapeHtml } from '../core/htmlUtils';
import { SlashCommandsExtension } from '../extensions/slashCommands';
import { MarkdownShortcutsExtension } from '../extensions/markdownShortcuts';

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

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      // Disable StarterKit's built-in input rules since we control them via the MarkdownShortcutsExtension
      inputRules: false,
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
    SlashCommandsExtension,
    MarkdownShortcutsExtension.configure({
      enabled: props.enableMarkdownShortcuts !== false,
    }),
  ],
  editorProps: {
    attributes: { class: 'tiptap-editor' },
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
</script>

<template>
  <EditorContent :editor="editor" class="editor-wrap" @click="handleEditorClick" />

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
  </BubbleMenu>

  <LinkDialog
    :visible="linkDialogVisible"
    :initial-url="linkInitialUrl"
    :initial-text="linkInitialText"
    @confirm="onLinkConfirm"
    @cancel="linkDialogVisible = false"
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
</style>
