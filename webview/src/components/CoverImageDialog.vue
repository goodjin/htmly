<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  visible: boolean;
  initialSrc?: string;
  initialAlt?: string;
  initialHref?: string;
  initialCaption?: string;
}>();

const emit = defineEmits<{
  confirm: [payload: { src: string; alt: string; href: string; caption: string }];
  cancel: [];
}>();

const urlInput = ref<HTMLInputElement | null>(null);
const src = ref('');
const alt = ref('');
const href = ref('');
const caption = ref('');

// Check if we're editing an existing image
const isEditing = ref(false);

watch(() => props.visible, (v) => {
  if (v) {
    // Pre-fill if editing
    src.value = props.initialSrc ?? '';
    alt.value = props.initialAlt ?? '';
    href.value = props.initialHref ?? '';
    caption.value = props.initialCaption ?? '';
    isEditing.value = !!props.initialSrc;
    nextTick(() => urlInput.value?.focus());
  }
});

function submit() {
  if (!src.value.trim()) return;
  emit('confirm', { 
    src: src.value.trim(), 
    alt: alt.value.trim(),
    href: href.value.trim(),
    caption: caption.value.trim(),
  });
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') submit();
  if (e.key === 'Escape') emit('cancel');
}
</script>

<template>
  <div v-if="visible" class="dialog-backdrop" @mousedown.self="emit('cancel')">
    <div class="dialog" @keydown="onKeydown">
      <h3 class="dialog-title">Cover Image</h3>
      
      <label class="field">
        <span>Image URL <span class="required">*</span></span>
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
          placeholder="Description of the image (for screen readers)"
          spellcheck="false"
        />
      </label>
      
      <label class="field">
        <span>Link URL (optional)</span>
        <input
          v-model="href"
          type="url"
          placeholder="https://example.com (clicking image opens this link)"
          spellcheck="false"
        />
      </label>
      
      <label class="field">
        <span>Caption (optional)</span>
        <input
          v-model="caption"
          type="text"
          placeholder="Caption text displayed below the image"
          spellcheck="false"
        />
      </label>
      
      <div class="actions">
        <button class="btn-cancel" @click="emit('cancel')">Cancel</button>
        <button class="btn-remove" v-if="isEditing" @click="emit('confirm', { src: '', alt: '', href: '', caption: '' })">Remove</button>
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
  background: rgba(0, 0, 0, 0.5);
}

.dialog {
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 6px;
  padding: 16px 20px;
  min-width: 400px;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.dialog-title {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #ccc);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #aaa);
}

.field .required {
  color: #f48771;
}

.field input {
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #ccc);
  border: 1px solid var(--vscode-input-border, #555);
  border-radius: 3px;
  padding: 6px 8px;
  font-size: 13px;
  outline: none;
}

.field input:focus {
  border-color: var(--vscode-focusBorder, #007acc);
}

.field input::placeholder {
  color: var(--vscode-input-placeholderForeground, #888);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.actions button {
  padding: 6px 14px;
  border-radius: 3px;
  border: 1px solid transparent;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-cancel {
  background: transparent;
  color: var(--vscode-editor-foreground, #ccc);
  border-color: var(--vscode-panel-border, #555);
}

.btn-cancel:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.btn-remove {
  background: transparent;
  color: #f48771;
  border-color: #f48771;
}

.btn-remove:hover {
  background: rgba(244, 135, 113, 0.1);
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
