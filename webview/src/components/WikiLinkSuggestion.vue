<script setup lang="ts">
import { ref, watch, computed } from 'vue';

export interface WikiLinkSuggestionItem {
  page: string;
  isNew?: boolean;
}

const props = defineProps<{
  items: WikiLinkSuggestionItem[];
  command: (item: WikiLinkSuggestionItem) => void;
  query: string;
}>();

const selectedIndex = ref(0);

// Watch for query changes to reset selection when suggestions change significantly
watch(
  () => props.items,
  () => {
    selectedIndex.value = 0;
  }
);

// Ensure selectedIndex is valid
watch(selectedIndex, (newIndex) => {
  if (newIndex < 0) {
    selectedIndex.value = 0;
  } else if (newIndex >= filteredItems.value.length) {
    selectedIndex.value = Math.max(0, filteredItems.value.length - 1);
  }
});

const filteredItems = computed(() => props.items);

function onKeyDown(event: KeyboardEvent): boolean {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length;
    return true;
  }

  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length;
    return true;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    selectItem(selectedIndex.value);
    return true;
  }

  if (event.key === 'Escape') {
    return true;
  }

  return false;
}

function selectItem(index: number) {
  const item = filteredItems.value[index];
  if (item) {
    props.command(item);
  }
}

defineExpose({ onKeyDown });
</script>

<template>
  <div class="wiki-link-suggestion" v-if="filteredItems.length > 0">
    <div class="wiki-link-header">Link to page</div>
    <div class="wiki-link-list">
      <button
        v-for="(item, index) in filteredItems"
        :key="item.page"
        class="wiki-link-item"
        :class="{ selected: index === selectedIndex, 'new-page': item.isNew }"
        @click="selectItem(index)"
        @mouseenter="selectedIndex = index"
      >
        <span class="wiki-link-icon">{{ item.isNew ? '+' : '📄' }}</span>
        <div class="wiki-link-text">
          <span class="wiki-link-title" v-if="!item.isNew">{{ item.page }}</span>
          <span class="wiki-link-title new" v-else>Create "{{ item.page }}"</span>
          <span class="wiki-link-description" v-if="!item.isNew">Existing page</span>
          <span class="wiki-link-description" v-else>Click to create new page</span>
        </div>
      </button>
    </div>
  </div>
  <div class="wiki-link-suggestion empty" v-else-if="query">
    <button
      class="wiki-link-item new-page only-new"
      @click="selectItem(0)"
    >
      <span class="wiki-link-icon">+</span>
      <div class="wiki-link-text">
        <span class="wiki-link-title new">Create "{{ query }}"</span>
        <span class="wiki-link-description">Click to create new page</span>
      </div>
    </button>
  </div>
  <div class="wiki-link-suggestion empty" v-else>
    <div class="wiki-link-empty">Type to search or create a page</div>
  </div>
</template>

<style scoped>
.wiki-link-suggestion {
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  min-width: 240px;
  max-width: 320px;
  max-height: 300px;
  overflow-y: auto;
  font-family: var(--vscode-font-family, system-ui);
}

.wiki-link-suggestion.empty {
  min-width: 200px;
}

.wiki-link-header {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.wiki-link-list {
  padding: 4px;
}

.wiki-link-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  color: var(--vscode-editor-foreground, #ccc);
}

.wiki-link-item:hover,
.wiki-link-item.selected {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.wiki-link-item.selected {
  background: var(--vscode-button-background, #0e639c);
}

.wiki-link-item.new-page:hover,
.wiki-link-item.new-page.selected {
  background: var(--vscode-button-secondaryBackground, #3c3c3c);
}

.wiki-link-item.new-page.selected {
  background: #2d7d46;
}

.wiki-link-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--vscode-input-background, #3c3c3c);
  border-radius: 4px;
  font-size: 14px;
  flex-shrink: 0;
}

.wiki-link-item.new-page .wiki-link-icon {
  background: var(--vscode-badge-background, #007acc);
  color: white;
  font-weight: bold;
}

.wiki-link-item.selected .wiki-link-icon {
  background: rgba(255, 255, 255, 0.15);
}

.wiki-link-item.new-page.selected .wiki-link-icon {
  background: rgba(255, 255, 255, 0.2);
}

.wiki-link-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.wiki-link-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-editor-foreground, #ccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wiki-link-title.new {
  color: #4ec9b0;
}

.wiki-link-item.selected .wiki-link-title {
  color: #fff;
}

.wiki-link-description {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #888);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wiki-link-item.new-page .wiki-link-description {
  color: var(--vscode-descriptionForeground, #888);
}

.wiki-link-item.selected .wiki-link-description {
  color: rgba(255, 255, 255, 0.7);
}

.wiki-link-empty {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--vscode-descriptionForeground, #888);
  text-align: center;
}

.wiki-link-item.only-new {
  margin: 4px;
  width: calc(100% - 8px);
}
</style>
