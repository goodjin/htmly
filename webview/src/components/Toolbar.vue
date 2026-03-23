<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import type { EditorMode } from '../../../src/shared/types';

const props = defineProps<{
  editor: Editor | undefined;
  mode: EditorMode;
}>();

const emit = defineEmits<{
  toggleMode: [];
}>();

function btn(action: () => void) {
  return (e: MouseEvent) => {
    e.preventDefault();
    action();
  };
}

function setHeading(level: 1 | 2 | 3) {
  props.editor?.chain().focus().toggleHeading({ level }).run();
}
</script>

<template>
  <div class="toolbar" v-if="mode === 'wysiwyg'">
    <div class="toolbar-group">
      <select
        class="heading-select"
        @change="e => setHeading(+(e.target as HTMLSelectElement).value as 1|2|3)"
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
      ><b>B</b></button>
      <button
        title="Italic (Ctrl+I)"
        :class="{ active: editor?.isActive('italic') }"
        @mousedown="btn(() => editor?.chain().focus().toggleItalic().run())"
      ><i>I</i></button>
      <button
        title="Underline (Ctrl+U)"
        :class="{ active: editor?.isActive('underline') }"
        @mousedown="btn(() => editor?.chain().focus().toggleUnderline().run())"
      ><u>U</u></button>
      <button
        title="Strikethrough"
        :class="{ active: editor?.isActive('strike') }"
        @mousedown="btn(() => editor?.chain().focus().toggleStrike().run())"
      ><s>S</s></button>
    </div>

    <div class="toolbar-group">
      <button
        title="Bullet List"
        :class="{ active: editor?.isActive('bulletList') }"
        @mousedown="btn(() => editor?.chain().focus().toggleBulletList().run())"
      >≡</button>
      <button
        title="Ordered List"
        :class="{ active: editor?.isActive('orderedList') }"
        @mousedown="btn(() => editor?.chain().focus().toggleOrderedList().run())"
      >1.</button>
      <button
        title="Blockquote"
        :class="{ active: editor?.isActive('blockquote') }"
        @mousedown="btn(() => editor?.chain().focus().toggleBlockquote().run())"
      >❝</button>
      <button
        title="Code Block"
        :class="{ active: editor?.isActive('codeBlock') }"
        @mousedown="btn(() => editor?.chain().focus().toggleCodeBlock().run())"
      >{}</button>
    </div>

    <div class="toolbar-group">
      <button
        title="Align Left"
        :class="{ active: editor?.isActive({textAlign:'left'}) }"
        @mousedown="btn(() => editor?.chain().focus().setTextAlign('left').run())"
      >⇤</button>
      <button
        title="Align Center"
        :class="{ active: editor?.isActive({textAlign:'center'}) }"
        @mousedown="btn(() => editor?.chain().focus().setTextAlign('center').run())"
      >≡</button>
      <button
        title="Align Right"
        :class="{ active: editor?.isActive({textAlign:'right'}) }"
        @mousedown="btn(() => editor?.chain().focus().setTextAlign('right').run())"
      >⇥</button>
    </div>

    <div class="toolbar-group">
      <button
        title="Insert Table"
        @mousedown="btn(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())"
      >⊞</button>
      <button
        title="Horizontal Rule"
        @mousedown="btn(() => editor?.chain().focus().setHorizontalRule().run())"
      >—</button>
    </div>

    <div class="toolbar-spacer" />

    <button class="mode-toggle" title="Switch to Source" @click="emit('toggleMode')">
      &lt;/&gt;
    </button>
  </div>

  <div class="toolbar source-bar" v-else>
    <span class="mode-label">Source Mode</span>
    <div class="toolbar-spacer" />
    <button class="mode-toggle" title="Switch to Visual" @click="emit('toggleMode')">
      👁 Visual
    </button>
  </div>
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
  align-items: center;
  justify-content: center;
}

button:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
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

.mode-toggle {
  font-family: monospace;
  font-weight: bold;
  padding: 3px 10px;
}

.mode-label {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #888);
  padding: 0 4px;
}

.source-bar {
  background: var(--vscode-editorGroupHeader-tabsBackground, #252526);
}
</style>
