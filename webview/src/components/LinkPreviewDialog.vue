<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = withDefaults(defineProps<{
  visible?: boolean;
  initialUrl?: string;
}>(), {
  visible: false,
  initialUrl: '',
});

const emit = defineEmits<{
  confirm: [payload: { url: string }];
  cancel: [];
}>();

const url = ref('');
const error = ref('');

watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    url.value = props.initialUrl || '';
    error.value = '';
  }
});

onMounted(() => {
  url.value = props.initialUrl || '';
});

function validateUrl(value: string): boolean {
  if (!value.trim()) {
    error.value = 'URL is required';
    return false;
  }
  
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      error.value = 'URL must start with http:// or https://';
      return false;
    }
    return true;
  } catch {
    error.value = 'Please enter a valid URL';
    return false;
  }
}

function handleConfirm() {
  if (!validateUrl(url.value)) return;
  
  // Ensure URL has protocol
  let finalUrl = url.value.trim();
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = 'https://' + finalUrl;
  }
  
  emit('confirm', { url: finalUrl });
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleConfirm();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    emit('cancel');
  }
}

function handleInput() {
  if (error.value) {
    error.value = '';
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="emit('cancel')">
      <div class="dialog" @keydown="handleKeydown">
        <div class="dialog-header">
          <h3>Insert Link Preview</h3>
          <button class="close-btn" @click="emit('cancel')" title="Close">✕</button>
        </div>
        
        <div class="dialog-body">
          <div class="form-group">
            <label for="link-preview-url">URL</label>
            <input
              id="link-preview-url"
              v-model="url"
              type="url"
              placeholder="https://example.com"
              :class="{ error: error }"
              @input="handleInput"
              autofocus
            />
            <span v-if="error" class="error-message">{{ error }}</span>
          </div>
          
          <p class="help-text">
            Enter a URL to create a preview card. The preview will show the page title, 
            description, and image if available.
          </p>
        </div>
        
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="emit('cancel')">Cancel</button>
          <button class="btn btn-primary" @click="handleConfirm">Insert</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--vscode-editor-foreground, #cccccc);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.dialog-body {
  padding: 20px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-editor-foreground, #cccccc);
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  border-radius: 4px;
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #cccccc);
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder, #0e639c);
  box-shadow: 0 0 0 1px var(--vscode-focusBorder, #0e639c);
}

.form-group input.error {
  border-color: #f48771;
}

.error-message {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #f48771;
}

.help-text {
  margin: 0;
  font-size: 12px;
  color: var(--vscode-editor-foreground, #cccccc);
  opacity: 0.7;
  line-height: 1.5;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--vscode-panel-border, #3c3c3c);
}

.btn {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--vscode-button-border, #454545);
  color: var(--vscode-button-foreground, #cccccc);
}

.btn-secondary:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.btn-primary {
  background: var(--vscode-button-background, #0e639c);
  border: 1px solid var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
}

.btn-primary:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}
</style>
