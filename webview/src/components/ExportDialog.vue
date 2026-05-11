<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { ExportFormat } from '../../../src/shared/types';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  export: [format: ExportFormat];
  cancel: [];
}>();

// Export options configuration
const exportOptions: { format: ExportFormat; label: string; icon: string; description: string }[] = [
  { format: 'pdf', label: 'Export as PDF', icon: '📄', description: 'Export document as PDF using browser print' },
  { format: 'markdown', label: 'Export as Markdown', icon: '📝', description: 'Convert to .md file with formatting' },
  { format: 'plaintext', label: 'Export as Plain Text', icon: '📃', description: 'Export as plain text file' },
  { format: 'embedded', label: 'Export as Embedded HTML', icon: '🔗', description: 'Single HTML file with inlined styles' },
];

// Track hover state for keyboard navigation
const hoveredIndex = ref(-1);

watch(() => props.visible, (v) => {
  if (v) {
    hoveredIndex.value = -1;
  }
});

function onExport(format: ExportFormat) {
  emit('export', format);
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('cancel');
    return;
  }
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    hoveredIndex.value = Math.min(hoveredIndex.value + 1, exportOptions.length - 1);
    return;
  }
  
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    hoveredIndex.value = Math.max(hoveredIndex.value - 1, 0);
    return;
  }
  
  if (e.key === 'Enter' && hoveredIndex.value >= 0) {
    e.preventDefault();
    onExport(exportOptions[hoveredIndex.value].format);
    return;
  }
}
</script>

<template>
  <div v-if="visible" class="export-dialog-backdrop" @mousedown.self="emit('cancel')">
    <div class="export-dialog" @keydown="onKeydown">
      <div class="export-header">
        <span class="export-title">Export Document</span>
      </div>
      <div class="export-options" role="menu">
        <button
          v-for="(option, index) in exportOptions"
          :key="option.format"
          class="export-option"
          :class="{ hovered: hoveredIndex === index }"
          role="menuitem"
          :aria-label="option.label"
          @click="onExport(option.format)"
          @mouseenter="hoveredIndex = index"
          @mouseleave="hoveredIndex = -1"
        >
          <span class="option-icon">{{ option.icon }}</span>
          <div class="option-content">
            <span class="option-label">{{ option.label }}</span>
            <span class="option-description">{{ option.description }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 60px;
}

.export-dialog {
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 6px;
  padding: 8px 0;
  min-width: 320px;
  max-width: 400px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.export-header {
  padding: 8px 14px 10px;
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
}

.export-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.export-options {
  display: flex;
  flex-direction: column;
}

.export-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  text-align: left;
  transition: background-color 100ms ease;
  font-family: inherit;
}

.export-option:hover,
.export-option.hovered {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.export-option:focus {
  outline: none;
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.export-option:focus-visible {
  outline: 1px solid var(--vscode-focusBorder, #007acc);
  outline-offset: -1px;
}

.option-icon {
  font-size: 18px;
  line-height: 1.2;
  flex-shrink: 0;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.option-label {
  font-size: 13px;
  color: var(--vscode-editor-foreground, #cccccc);
  line-height: 1.3;
}

.option-description {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #aaaaaa);
  line-height: 1.3;
}
</style>
