<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
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

const props = defineProps<{
  modelValue: string;   // HTML string
}>();

const emit = defineEmits<{
  'update:modelValue': [html: string];
}>();

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
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
</script>

<template>
  <EditorContent :editor="editor" class="editor-wrap" />
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
</style>
