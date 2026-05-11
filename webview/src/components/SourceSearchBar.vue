<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { EditorView } from '@codemirror/view';
import { Decoration } from '@codemirror/view';
import { highlightSearchEffect } from '../composables/useSearchHighlight';

const props = defineProps<{
  editorView: EditorView | undefined;
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
const matches = ref<Array<{ from: number; to: number }>>([]);
const currentMatchIndex = ref(-1);
const regexError = ref<string | null>(null);

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

/**
 * Find all matches of the search term in the document
 */
function findMatches() {
  if (!props.editorView || !searchTerm.value) {
    matches.value = [];
    currentMatchIndex.value = -1;
    regexError.value = null;
    clearHighlights();
    return;
  }

  regexError.value = null;
  const result: Array<{ from: number; to: number }> = [];
  const doc = props.editorView.state.doc;
  
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
    const docText = doc.toString();
    let match: RegExpExecArray | null;
    
    // Reset lastIndex for global regex
    regex.lastIndex = 0;
    
    while ((match = regex.exec(docText)) !== null) {
      result.push({
        from: match.index,
        to: match.index + match[0].length,
      });
      
      // Prevent infinite loop for zero-length matches
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }
    
    matches.value = result;
    if (result.length > 0) {
      currentMatchIndex.value = 0;
      selectMatch(result[0]);
    } else {
      currentMatchIndex.value = -1;
    }
    
    // Apply highlights
    applyHighlights(result);
    
  } catch (e) {
    // Invalid regex
    if (isRegex.value && e instanceof SyntaxError) {
      regexError.value = e.message;
      matches.value = [];
      currentMatchIndex.value = -1;
      clearHighlights();
    }
  }
}

/**
 * Apply search match decorations to the editor
 */
function applyHighlights(matches: Array<{ from: number; to: number }>) {
  if (!props.editorView) return;
  
  const decorations: any[] = [];
  
  // Create highlight decoration for current match
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const isCurrent = i === currentMatchIndex.value;
    
    decorations.push(
      Decoration.mark({
        class: isCurrent ? 'cm-searchMatch cm-searchMatch-selected' : 'cm-searchMatch',
      }).range(match.from, match.to)
    );
  }
  
  props.editorView.dispatch({
    effects: highlightSearchEffect.of(Decoration.set(decorations.sort((a, b) => a.from - b.from)))
  });
}

/**
 * Clear all search highlights
 */
function clearHighlights() {
  if (!props.editorView) return;
  
  props.editorView.dispatch({
    effects: highlightSearchEffect.of(Decoration.none)
  });
}

/**
 * Select and scroll to a match
 */
function selectMatch(match: { from: number; to: number }) {
  if (!props.editorView) return;
  
  props.editorView.dispatch({
    selection: { anchor: match.from, head: match.to },
    scrollIntoView: true,
  });
}

function nextMatch() {
  if (matches.value.length === 0) return;
  currentMatchIndex.value = (currentMatchIndex.value + 1) % matches.value.length;
  selectMatch(matches.value[currentMatchIndex.value]);
  applyHighlights(matches.value);
}

function prevMatch() {
  if (matches.value.length === 0) return;
  currentMatchIndex.value = (currentMatchIndex.value - 1 + matches.value.length) % matches.value.length;
  selectMatch(matches.value[currentMatchIndex.value]);
  applyHighlights(matches.value);
}

function replaceCurrent() {
  if (!props.editorView || currentMatchIndex.value === -1) return;
  
  const { from, to } = matches.value[currentMatchIndex.value];
  const doc = props.editorView.state.doc;
  
  // Check if replaceTerm contains regex capture group references
  let replacement = replaceTerm.value;
  if (isRegex.value) {
    // Try to get the original regex to use for replacement
    try {
      const regex = new RegExp(searchTerm.value, 'g');
      const matched = doc.sliceString(from, to);
      replacement = matched.replace(regex, replaceTerm.value);
    } catch (e) {
      // Fall back to direct replacement
      replacement = replaceTerm.value;
    }
  }
  
  props.editorView.dispatch({
    changes: { from, to, insert: replacement },
  });
  
  findMatches();
}

function replaceAll() {
  if (!props.editorView || matches.value.length === 0) return;
  
  const doc = props.editorView.state.doc;
  let replacement = replaceTerm.value;
  
  // Collect all changes from end to start to preserve positions
  const changes: Array<{ from: number; to: number; insert: string }> = [];
  
  for (let i = matches.value.length - 1; i >= 0; i--) {
    const { from, to } = matches.value[i];
    const matched = doc.sliceString(from, to);
    
    let replaceWith = replaceTerm.value;
    if (isRegex.value) {
      try {
        const regex = new RegExp(searchTerm.value, 'g');
        replaceWith = matched.replace(regex, replaceTerm.value);
      } catch (e) {
        replaceWith = replaceTerm.value;
      }
    }
    
    changes.push({ from, to, insert: replaceWith });
  }
  
  props.editorView.dispatch({
    changes,
  });
  
  findMatches();
}

function clearSearch() {
  searchTerm.value = '';
  replaceTerm.value = '';
  matches.value = [];
  currentMatchIndex.value = -1;
  regexError.value = null;
  showReplace.value = false;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  clearHighlights();
}

function toggleRegex() {
  isRegex.value = !isRegex.value;
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
      <input
        ref="searchInput"
        v-model="searchTerm"
        type="text"
        placeholder="Search"
        class="search-input"
        :class="{ 'regex-mode': isRegex }"
        :title="isRegex ? 'Regex mode enabled' : 'Literal search'"
        @keydown="onSearchKeydown"
      />
      <button 
        class="regex-toggle" 
        :class="{ active: isRegex }"
        :title="isRegex ? 'Disable regex (.*)' : 'Enable regex (.*)'"
        @click="toggleRegex"
      >
        .*
      </button>
      <span class="match-count" :class="{ error: regexError }">{{ matchLabel }}</span>
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
  font-family: inherit;
}

.search-input:focus {
  border-color: var(--vscode-focusBorder, #007acc);
}

.search-input.regex-mode {
  border-color: #007acc;
  background: rgba(0, 122, 204, 0.15);
}

.match-count {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #aaa);
  min-width: 48px;
  text-align: center;
  white-space: nowrap;
}

.match-count.error {
  color: #f48771;
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
  font-family: monospace;
  font-weight: 600;
  min-width: 32px;
  padding: 2px 4px;
}

.regex-toggle.active {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
}

.regex-toggle.active:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}

.replace-row {
  padding-left: 0;
}

.replace-spacer {
  width: 24px;
  flex-shrink: 0;
}
</style>
