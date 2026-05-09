<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import type { SlashCommandItem } from '../extensions/slashCommands';

const props = defineProps<{
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}>();

const selectedIndex = ref(0);

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0;
  }
);

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
  <div class="slash-command-menu" v-if="filteredItems.length > 0">
    <div class="slash-command-header">Insert block</div>
    <div class="slash-command-list">
      <button
        v-for="(item, index) in filteredItems"
        :key="item.title"
        class="slash-command-item"
        :class="{ selected: index === selectedIndex }"
        @click="selectItem(index)"
        @mouseenter="selectedIndex = index"
      >
        <span class="slash-command-icon">{{ item.icon }}</span>
        <div class="slash-command-text">
          <span class="slash-command-title">{{ item.title }}</span>
          <span class="slash-command-description">{{ item.description }}</span>
        </div>
      </button>
    </div>
  </div>
  <div class="slash-command-menu empty" v-else>
    <div class="slash-command-empty">No matching commands</div>
  </div>
</template>

<style scoped>
.slash-command-popup {
  position: fixed;
  z-index: 10000;
}

.slash-command-menu {
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  min-width: 280px;
  max-width: 320px;
  max-height: 400px;
  overflow-y: auto;
  font-family: var(--vscode-font-family, system-ui);
}

.slash-command-menu.empty {
  min-width: 200px;
}

.slash-command-header {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.slash-command-list {
  padding: 4px;
}

.slash-command-item {
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

.slash-command-item:hover,
.slash-command-item.selected {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.slash-command-item.selected {
  background: var(--vscode-button-background, #0e639c);
}

.slash-command-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--vscode-input-background, #3c3c3c);
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.slash-command-item.selected .slash-command-icon {
  background: rgba(255, 255, 255, 0.15);
}

.slash-command-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.slash-command-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-editor-foreground, #ccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slash-command-description {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #888);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slash-command-item.selected .slash-command-title,
.slash-command-item.selected .slash-command-description {
  color: #fff;
}

.slash-command-empty {
  padding: 12px 16px;
  font-size: 13px;
  color: var(--vscode-descriptionForeground, #888);
  text-align: center;
}
</style>
