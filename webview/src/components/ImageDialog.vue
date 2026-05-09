<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';

const props = defineProps<{
  visible: boolean;
  initialSrc?: string;
  initialAlt?: string;
}>();

const emit = defineEmits<{
  confirm: [payload: { src: string; alt: string }];
  cancel: [];
}>();

const urlInput = ref<HTMLInputElement | null>(null);
const src = ref('');
const alt = ref('');

// Check if we're editing an existing image
const isEditing = computed(() => !!props.initialSrc);

watch(() => props.visible, (v) => {
  if (v) {
    // Pre-fill if editing
    src.value = props.initialSrc ?? '';
    alt.value = props.initialAlt ?? '';
    nextTick(() => urlInput.value?.focus());
  }
});

function submit() {
  if (!src.value.trim()) return;
  emit('confirm', { src: src.value.trim(), alt: alt.value.trim() });
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') submit();
  if (e.key === 'Escape') emit('cancel');
}
</script>

<template>
  <div v-if="visible" class="dialog-backdrop" @mousedown.self="emit('cancel')">
    <div class="dialog" @keydown="onKeydown">
      <label class="field">
        <span>Image URL</span>
        <input
          ref="urlInput"
          v-model="src"
          type="url"
          placeholder="https://example.com/image.png"
          spellcheck="false"
        />
      </label>
      <label class="field">
        <span>Alt text</span>
        <input
          v-model="alt"
          type="text"
          placeholder="Description of the image"
          spellcheck="false"
        />
      </label>
      <div class="actions">
        <button class="btn-cancel" @click="emit('cancel')">Cancel</button>
        <button class="btn-confirm" :disabled="!src.trim()" @click="submit">{{ isEditing ? 'Update' : 'Insert' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
}

.dialog {
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 6px;
  padding: 14px 16px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #aaa);
}

.field input {
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #ccc);
  border: 1px solid var(--vscode-input-border, #555);
  border-radius: 3px;
  padding: 5px 8px;
  font-size: 13px;
  outline: none;
}

.field input:focus {
  border-color: var(--vscode-focusBorder, #007acc);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
}

.actions button {
  padding: 4px 12px;
  border-radius: 3px;
  border: 1px solid transparent;
  font-size: 12px;
  cursor: pointer;
}

.btn-cancel {
  background: transparent;
  color: var(--vscode-editor-foreground, #ccc);
  border-color: var(--vscode-panel-border, #555);
}

.btn-cancel:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.btn-confirm {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #fff);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn-confirm:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground, #1177bb);
}
</style>
