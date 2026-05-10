<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { isAllowedEmbedUrl, getEmbedDomainLabel } from '../extensions/Embed';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  confirm: [payload: { url: string }];
  cancel: [];
}>();

const urlInput = ref<HTMLInputElement | null>(null);
const url = ref('');
const error = ref('');

watch(() => props.visible, (v) => {
  if (v) {
    url.value = '';
    error.value = '';
    nextTick(() => urlInput.value?.focus());
  }
});

function validateUrl(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  if (!isAllowedEmbedUrl(value.trim())) {
    return `Domain not allowed. Supported: YouTube, Vimeo, CodePen, CodeSandbox`;
  }
  return null;
}

function submit() {
  const trimmedUrl = url.value.trim();
  if (!trimmedUrl) return;

  const validationError = validateUrl(trimmedUrl);
  if (validationError) {
    error.value = validationError;
    return;
  }

  emit('confirm', { url: trimmedUrl });
  url.value = '';
  error.value = '';
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') submit();
  if (e.key === 'Escape') emit('cancel');
}

function onInput() {
  // Clear error on input
  if (error.value) {
    error.value = '';
  }
}
</script>

<template>
  <div v-if="visible" class="embed-dialog-backdrop" @mousedown.self="emit('cancel')">
    <div class="embed-dialog" @keydown="onKeydown">
      <div class="embed-dialog-header">
        <span class="embed-dialog-icon">🔗</span>
        <span class="embed-dialog-title">Embed URL</span>
      </div>

      <label class="embed-field">
        <span>URL</span>
        <input
          ref="urlInput"
          v-model="url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          spellcheck="false"
          @input="onInput"
        />
      </label>

      <div v-if="error" class="embed-error">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ error }}</span>
      </div>

      <div class="embed-supported">
        <span class="supported-label">Supported:</span>
        <span class="supported-domains">YouTube, Vimeo, CodePen, CodeSandbox</span>
      </div>

      <div class="embed-actions">
        <button class="btn-cancel" @click="emit('cancel')">Cancel</button>
        <button class="btn-confirm" :disabled="!url.trim()" @click="submit">Embed</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.embed-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
}

.embed-dialog {
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 6px;
  padding: 14px 16px;
  min-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.embed-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.embed-dialog-icon {
  font-size: 20px;
}

.embed-dialog-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #ccc);
}

.embed-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #aaa);
}

.embed-field input {
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #ccc);
  border: 1px solid var(--vscode-input-border, #555);
  border-radius: 3px;
  padding: 6px 8px;
  font-size: 13px;
  outline: none;
}

.embed-field input:focus {
  border-color: var(--vscode-focusBorder, #007acc);
}

.embed-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
  font-size: 12px;
  color: #fca5a5;
}

.error-icon {
  font-size: 14px;
}

.error-text {
  flex: 1;
}

.embed-supported {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #888);
}

.supported-label {
  font-weight: 500;
}

.supported-domains {
  color: var(--vscode-textLink-foreground, #4fc1ff);
}

.embed-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
}

.embed-actions button {
  padding: 5px 14px;
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
