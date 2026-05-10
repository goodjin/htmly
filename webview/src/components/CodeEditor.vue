<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { 
  syntaxHighlighting, 
  defaultHighlightStyle, 
  foldGutter, 
  indentOnInput,
  HighlightStyle 
} from '@codemirror/language';
import { search, searchKeymap } from '@codemirror/search';
import { abbreviationTracker, expandAbbreviation } from '@emmetio/codemirror6-plugin';
import { tags } from '@lezer/highlight';

// HTML-specific highlight style using highlight.js tags
const htmlHighlightStyle = HighlightStyle.define([
  { tag: tags.tagName, color: '#569cd6' }, // HTML tag names - blue
  { tag: tags.attributeName, color: '#9cdcfe' }, // Attribute names - light blue
  { tag: tags.attributeValue, color: '#ce9178' }, // Attribute values - orange
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' }, // Comments - green
  { tag: tags.string, color: '#ce9178' }, // Strings - orange
  { tag: tags.keyword, color: '#c586c0' }, // Keywords - purple
  { tag: tags.operator, color: '#d4d4d4' }, // Operators - gray
  { tag: tags.number, color: '#b5cea8' }, // Numbers - light green
  { tag: tags.bool, color: '#569cd6' }, // Booleans - blue
  { tag: tags.null, color: '#569cd6' }, // Null - blue
  { tag: tags.definition(tags.variableName), color: '#9cdcfe' }, // Variable definitions
  { tag: tags.function(tags.variableName), color: '#dcdcaa' }, // Functions - yellow
  { tag: tags.typeName, color: '#4ec9b0' }, // Type names - teal
  { tag: tags.className, color: '#4ec9b0' }, // Class names - teal
  { tag: tags.propertyName, color: '#9cdcfe' }, // Property names
  { tag: tags.punctuation, color: '#d4d4d4' }, // Punctuation
  { tag: tags.bracket, color: '#ffd700' }, // Brackets - gold
  { tag: tags.angleBracket, color: '#808080' }, // Angle brackets - gray
  { tag: tags.meta, color: '#808080' }, // Meta tags
  { tag: tags.content, color: '#ce9178' }, // Text content - orange
]);

// HTML beautifier function
function formatHtml(html: string): string {
  let formatted = '';
  let indent = 0;
  
  // Split by tags while preserving structure
  const parts = html.match(/<[^>]+>|[^<]+/g) || [];
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // Self-closing tags
    if (trimmed.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      formatted += '  '.repeat(indent) + trimmed + '\n';
    }
    // Self-closing tags like <br/>, <img/>
    else if (trimmed.match(/^<[a-zA-Z][^>]*[^/]>$/)) {
      // Opening tag that's not self-closing
      formatted += '  '.repeat(indent) + trimmed + '\n';
      indent++;
    }
    else if (trimmed.match(/^<\w+[^>]*\/>$/)) {
      // Self-closing tag
      formatted += '  '.repeat(indent) + trimmed + '\n';
    }
    else if (trimmed.startsWith('<')) {
      // Opening tag
      formatted += '  '.repeat(indent) + trimmed + '\n';
      indent++;
    }
    else {
      // Text content
      formatted += '  '.repeat(indent) + trimmed + '\n';
    }
  }
  
  return formatted.trim();
}

const props = defineProps<{
  modelValue: string;
  isDark: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [code: string];
  'format': [];
}>();

const containerRef = ref<HTMLElement | null>(null);
let view: EditorView | null = null;
let isUpdatingFromProp = false;

// Format button handler
function handleFormat() {
  if (!view) return;
  const currentContent = view.state.doc.toString();
  const formatted = formatHtml(currentContent);
  if (formatted !== currentContent) {
    isUpdatingFromProp = true;
    view.dispatch({
      changes: { from: 0, to: currentContent.length, insert: formatted },
    });
    isUpdatingFromProp = false;
    emit('update:modelValue', formatted);
    emit('format');
  }
}

// Expose format function for external use
defineExpose({
  format: handleFormat,
});

onMounted(() => {
  if (!containerRef.value) return;

  // Build extensions array
  const extensions: Extension[] = [
    // Line numbers in gutter
    lineNumbers(),
    // History for undo/redo
    history(),
    // Highlight active line
    highlightActiveLine(),
    // Keymaps
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
    // Search
    search(),
    // HTML language support
    html(),
    // Indent on input
    indentOnInput(),
    // Emmet abbreviation
    abbreviationTracker(),
    keymap.of([{
      key: 'Tab',
      run: expandAbbreviation,
    }]),
    // Container styling
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
    }),
    // Update listener
    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged && !isUpdatingFromProp) {
        emit('update:modelValue', update.state.doc.toString());
      }
    }),
  ];

  // Add fold gutter for tag folding
  extensions.push(foldGutter());
  
  // Add syntax highlighting based on theme
  if (props.isDark) {
    extensions.push(oneDark);
  } else {
    extensions.push(syntaxHighlighting(htmlHighlightStyle));
  }

  view = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions,
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
  <div class="code-editor-wrapper">
    <div class="code-editor-toolbar">
      <button 
        class="format-button" 
        title="Format HTML"
        @click="handleFormat"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 3h12v1H2V3zm0 4h8v1H2V7zm0 4h12v1H2v-1zm0 4h8v1H2v-1z"/>
        </svg>
        <span>Format</span>
      </button>
    </div>
    <div ref="containerRef" class="code-editor-container" />
  </div>
</template>

<style scoped>
.code-editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.code-editor-toolbar {
  display: flex;
  gap: 8px;
  padding: 4px 8px;
  background: var(--vscode-editor-background, #1e1e1e);
  border-bottom: 1px solid var(--vscode-widget-border, #3c3c3c);
}

.format-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
  border: none;
  border-radius: 2px;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
}

.format-button:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}

.format-button:active {
  background: var(--vscode-button-secondaryBackground, #094771);
}

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

:deep(.cm-foldGutter) {
  width: 16px;
}

:deep(.cm-foldGutter .cm-gutterElement) {
  cursor: pointer;
  color: var(--vscode-editorLineNumber-foreground, #858585);
}

:deep(.cm-foldGutter .cm-gutterElement:hover) {
  color: var(--vscode-editorLineNumber-activeForeground, #c6c6c6);
}

:deep(.cm-foldGutter .cm-gutterElement .cm-gutterIcon) {
  fill: var(--vscode-editorLineNumber-foreground, #858585);
}

/* Light theme syntax highlighting */
:deep(.cm-editor.cm-focused) {
  outline: none;
}

/* Line number styling */
:deep(.cm-lineNumbers .cm-gutterElement) {
  padding: 0 8px 0 4px;
  min-width: 40px;
}
</style>
