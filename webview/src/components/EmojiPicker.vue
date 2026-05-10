<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  currentEmoji: string;
}>();

const emit = defineEmits<{
  select: [emoji: string];
}>();

// Common emojis for callouts organized by category
const emojiCategories = [
  {
    name: 'Alerts',
    emojis: ['💡', '⚠️', '❗', '❕', '🔴', '🟡', '🟢', '🚨', '⛔', '🛑'],
  },
  {
    name: 'Info',
    emojis: ['ℹ️', '📌', '📝', '📋', '📎', '📄', '📃', '📜', '📚', '📖'],
  },
  {
    name: 'Actions',
    emojis: ['✅', '✔️', '☑️', '🔲', '🔳', '🔶', '🔷', '🔸', '🔹', '🔺'],
  },
  {
    name: 'Symbols',
    emojis: ['⭐', '🌟', '✨', '💫', '🔥', '💥', '💢', '💬', '💭', '🗨️'],
  },
  {
    name: 'Tech',
    emojis: ['⚙️', '🔧', '🔨', '🔩', '🔗', '📱', '💻', '🖥️', '⌨️', '🖱️'],
  },
  {
    name: 'Nature',
    emojis: ['🌸', '🌺', '🌻', '🌼', '🌷', '🌹', '🍀', '🌿', '🌱', '🌲'],
  },
];

const isOpen = ref(false);

function toggle() {
  isOpen.value = !isOpen.value;
}

function selectEmoji(emoji: string) {
  emit('select', emoji);
  isOpen.value = false;
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.emoji-picker-container')) {
    isOpen.value = false;
  }
}

// Close on escape
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isOpen.value = false;
  }
}
</script>

<template>
  <div
    class="emoji-picker-container"
    @keydown="handleKeydown"
  >
    <button
      class="emoji-picker-trigger"
      :class="{ active: isOpen }"
      title="Change callout icon"
      @click.stop="toggle"
    >
      {{ currentEmoji }}
    </button>

    <div
      v-if="isOpen"
      class="emoji-picker-dropdown"
      @click.stop
    >
      <div class="emoji-picker-header">
        <span>Select Icon</span>
      </div>
      <div class="emoji-picker-content">
        <div
          v-for="category in emojiCategories"
          :key="category.name"
          class="emoji-category"
        >
          <div class="emoji-category-name">{{ category.name }}</div>
          <div class="emoji-grid">
            <button
              v-for="emoji in category.emojis"
              :key="emoji"
              class="emoji-button"
              :class="{ selected: emoji === currentEmoji }"
              @click="selectEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.emoji-picker-container {
  position: relative;
  display: inline-flex;
}

.emoji-picker-trigger {
  background: transparent;
  border: 1px solid transparent;
  color: var(--vscode-editor-foreground, #ccc);
  border-radius: 3px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 16px;
  min-width: 36px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-picker-trigger:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.emoji-picker-trigger.active {
  background: var(--vscode-button-background, #0e639c);
  border-color: var(--vscode-button-background, #0e639c);
}

.emoji-picker-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 10001;
  min-width: 240px;
  max-height: 320px;
  overflow-y: auto;
}

.emoji-picker-header {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--vscode-editorWidget-border, #454545);
}

.emoji-picker-content {
  padding: 8px;
}

.emoji-category {
  margin-bottom: 8px;
}

.emoji-category:last-child {
  margin-bottom: 0;
}

.emoji-category-name {
  font-size: 10px;
  color: var(--vscode-descriptionForeground, #666);
  margin-bottom: 4px;
  padding-left: 2px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 2px;
}

.emoji-button {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  padding: 4px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
}

.emoji-button:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.emoji-button.selected {
  background: var(--vscode-button-background, #0e639c);
  border-color: var(--vscode-button-background, #0e639c);
}
</style>
