<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { Editor } from '@tiptap/core';

const props = defineProps<{
  editor: Editor | undefined;
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const searchInput = ref<HTMLInputElement | null>(null);
const searchTerm = ref('');
const replaceTerm = ref('');
const showReplace = ref(false);
const isRegex = ref(false);
const regexError = ref<string | null>(null);
const matches = ref<Array<{ from: number; to: number }>>([]);
const currentMatchIndex = ref(-1);

const matchLabel = computed(() => {
  if (!searchTerm.value) return '';
  if (regexError.value) return 'Invalid regex';
  if (matches.value.length === 0) return 'No results';
  return `${currentMatchIndex.value + 1}/${matches.value.length}`;
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.visible, (v) => {
  if (v) {
    nextTick(() => searchInput.value?.focus());
  } else {
    clearSearch();
  }
});

watch(searchTerm, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(findMatches, 150);
});

watch(isRegex, () => {
  findMatches();
});

/**
 * Escape special regex characters in a string for literal matching
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatches() {
  if (!props.editor || !searchTerm.value) {
    matches.value = [];
    currentMatchIndex.value = -1;
    regexError.value = null;
    return;
  }

  regexError.value = null;
  const result: Array<{ from: number; to: number }> = [];

  try {
    let regex: RegExp;

    if (isRegex.value) {
      // Try to compile as regex
      regex = new RegExp(searchTerm.value, 'g');
    } else {
      // Escape special characters for literal search
      const escaped = escapeRegex(searchTerm.value);
      regex = new RegExp(escaped, 'gi');
    }

    // Search through all text in the document
    props.editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;

      // Reset lastIndex for global regex
      regex.lastIndex = 0;

      let match: RegExpExecArray | null;
      const text = node.text;

      while ((match = regex.exec(text)) !== null) {
        result.push({
          from: pos + match.index,
          to: pos + match.index + match[0].length,
        });

        // Prevent infinite loop for zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    });

    matches.value = result;
    if (result.length > 0) {
      currentMatchIndex.value = 0;
      selectMatch(result[0]);
    } else {
      currentMatchIndex.value = -1;
    }
  } catch (e) {
    // Invalid regex
    if (isRegex.value && e instanceof SyntaxError) {
      regexError.value = e.message;
      matches.value = [];
      currentMatchIndex.value = -1;
    }
  }
}

function selectMatch(match: { from: number; to: number }) {
  if (!props.editor) return;
  props.editor.chain().focus().setTextSelection({ from: match.from, to: match.to }).scrollIntoView().run();
}

function nextMatch() {
  if (matches.value.length === 0) return;
  currentMatchIndex.value = (currentMatchIndex.value + 1) % matches.value.length;
  selectMatch(matches.value[currentMatchIndex.value]);
}

function prevMatch() {
  if (matches.value.length === 0) return;
  currentMatchIndex.value = (currentMatchIndex.value - 1 + matches.value.length) % matches.value.length;
  selectMatch(matches.value[currentMatchIndex.value]);
}

function replaceCurrent() {
  if (!props.editor || currentMatchIndex.value === -1) return;
  const { from, to } = matches.value[currentMatchIndex.value];
  props.editor.chain().focus().insertContentAt({ from, to }, replaceTerm.value).run();
  findMatches();
}

function replaceAll() {
  if (!props.editor || matches.value.length === 0) return;
  let tr = props.editor.state.tr;
  for (let i = matches.value.length - 1; i >= 0; i--) {
    const { from, to } = matches.value[i];
    tr = tr.insertText(replaceTerm.value, from, to);
  }
  props.editor.view.dispatch(tr);
  findMatches();
}

function clearSearch() {
  searchTerm.value = '';
  replaceTerm.value = '';
  matches.value = [];
  currentMatchIndex.value = -1;
  showReplace.value = false;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.shiftKey ? prevMatch() : nextMatch();
  }
  if (e.key === 'Escape') emit('close');
}

function onReplaceKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') replaceCurrent();
  if (e.key === 'Escape') emit('close');
}
</script>

<template>
  <div v-if="visible" class="search-bar">
    <div class="search-row">
      <button class="toggle-replace" title="Toggle replace" @click="showReplace = !showReplace">▶</button>
      <button
        data-testid="regex-toggle"
        class="regex-toggle"
        :class="{ active: isRegex }"
        title="Toggle regex mode"
        @click="isRegex = !isRegex"
      >.*</button>
      <input
        ref="searchInput"
        v-model="searchTerm"
        type="text"
        placeholder="Search"
        class="search-input"
        @keydown="onSearchKeydown"
      />
      <span class="match-count">{{ matchLabel }}</span>
      <button :disabled="matches.length === 0" title="Previous (Shift+Enter)" @click="prevMatch">‹</button>
      <button :disabled="matches.length === 0" title="Next (Enter)" @click="nextMatch">›</button>
      <button title="Close (Escape)" @click="emit('close')">✕</button>
    </div>
    <div v-if="showReplace" class="search-row replace-row">
      <div class="replace-spacer" />
      <input
        v-model="replaceTerm"
        type="text"
        placeholder="Replace"
        class="search-input"
        @keydown="onReplaceKeydown"
      />
      <button :disabled="currentMatchIndex === -1" title="Replace" @click="replaceCurrent">Replace</button>
      <button :disabled="matches.length === 0" title="Replace All" @click="replaceAll">All</button>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  background: var(--vscode-editorWidget-background, #252526);
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-input {
  flex: 1;
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #ccc);
  border: 1px solid var(--vscode-input-border, #555);
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 12px;
  outline: none;
}

.search-input:focus {
  border-color: var(--vscode-focusBorder, #007acc);
}

.match-count {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #aaa);
  min-width: 48px;
  text-align: center;
  white-space: nowrap;
}

.search-row button {
  background: transparent;
  border: 1px solid transparent;
  color: var(--vscode-editor-foreground, #ccc);
  border-radius: 3px;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.search-row button:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.search-row button:disabled {
  opacity: 0.4;
  cursor: default;
}

.search-row button:disabled:hover {
  background: transparent;
  border-color: transparent;
}

.toggle-replace {
  font-size: 10px;
  min-width: 20px;
  transition: transform 0.15s;
}

.regex-toggle {
  font-size: 11px;
  min-width: 24px;
  font-family: monospace;
}

.regex-toggle.active {
  background: var(--vscode-button-secondaryBackground, #3c3c3c);
  color: var(--vscode-textLink-activeForeground, #007acc);
}

.replace-row {
  padding-left: 0;
}

.replace-spacer {
  width: 24px;
  flex-shrink: 0;
}
</style>
