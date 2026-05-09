<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  visible: boolean;
  initialUrl: string;
  initialText: string;
}>();

const emit = defineEmits<{
  confirm: [payload: { url: string; text: string }];
  cancel: [];
}>();

const urlInput = ref<HTMLInputElement | null>(null);
const url = ref('');
const text = ref('');

watch(() => props.visible, (v) => {
  if (v) {
    url.value = props.initialUrl;
    text.value = props.initialText;
    nextTick(() => urlInput.value?.focus());
  }
});

function submit() {
  if (!url.value.trim()) return;
  emit('confirm', { url: url.value.trim(), text: text.value });
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') submit();
  if (e.key === 'Escape') emit('cancel');
}
</script>

<template>
  <div v-if="visible" class="link-dialog-backdrop" @mousedown.self="emit('cancel')">
    <div class="link-dialog" @keydown="onKeydown">
      <label class="link-field">
        <span>URL</span>
        <input
          ref="urlInput"
          v-model="url"
          type="url"
          placeholder="https://example.com"
          spellcheck="false"
        />
      </label>
      <label class="link-field">
        <span>Text</span>
        <input
          v-model="text"
          type="text"
          placeholder="Display text"
          spellcheck="false"
        />
      </label>
      <div class="link-actions">
        <button class="btn-cancel" @click="emit('cancel')">Cancel</button>
        <button class="btn-confirm" :disabled="!url.trim()" @click="submit">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.link-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
}

.link-dialog {
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

.link-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #aaa);
}

.link-field input {
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #ccc);
  border: 1px solid var(--vscode-input-border, #555);
  border-radius: 3px;
  padding: 5px 8px;
  font-size: 13px;
  outline: none;
}

.link-field input:focus {
  border-color: var(--vscode-focusBorder, #007acc);
}

.link-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
}

.link-actions button {
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
