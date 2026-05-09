<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { search, searchKeymap } from '@codemirror/search';
import { abbreviationTracker, expandAbbreviation } from '@emmetio/codemirror6-plugin';

const props = defineProps<{
  modelValue: string;
  isDark: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [code: string];
}>();

const containerRef = ref<HTMLElement | null>(null);
let view: EditorView | null = null;
let isUpdatingFromProp = false;

onMounted(() => {
  if (!containerRef.value) return;

  const theme = props.isDark
    ? oneDark
    : syntaxHighlighting(defaultHighlightStyle);

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && !isUpdatingFromProp) {
      emit('update:modelValue', update.state.doc.toString());
    }
  });

  view = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        lineNumbers(),
        history(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        search(),
        html(),
        theme,
        updateListener,
        abbreviationTracker(),
        keymap.of([{
          key: 'Tab',
          run: expandAbbreviation,
        }]),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    }),
    parent: containerRef.value,
  });
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (newVal !== current) {
      isUpdatingFromProp = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: newVal },
      });
      isUpdatingFromProp = false;
    }
  }
);

onBeforeUnmount(() => {
  view?.destroy();
});
</script>

<template>
  <div ref="containerRef" class="code-editor-container" />
</template>

<style scoped>
.code-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

:deep(.cm-editor) {
  flex: 1;
  height: 100%;
}
</style>
