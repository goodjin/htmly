<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import CodeEditor from './CodeEditor.vue';
import PreviewPane from './PreviewPane.vue';
import type { CursorPosition } from './TiptapEditor.vue';

const props = defineProps<{
  content: string;
  isDark: boolean;
  splitDirection: 'horizontal' | 'vertical';
  cursorPosition?: CursorPosition | null;
}>();

const emit = defineEmits<{
  'update:content': [content: string];
}>();

// Split ratio: 0.0 to 1.0 (source pane's share)
const MIN_PANE_SIZE = 200; // px
const splitRatio = ref(0.5);

const sourceStyle = computed(() => {
  if (props.splitDirection === 'horizontal') {
    return { width: `calc(${splitRatio.value * 100}% - 4px)` };
  } else {
    return { height: `calc(${splitRatio.value * 100}% - 4px)` };
  }
});

const previewStyle = computed(() => {
  if (props.splitDirection === 'horizontal') {
    return { width: `calc(${(1 - splitRatio.value) * 100}% - 4px)` };
  } else {
    return { height: `calc(${(1 - splitRatio.value) * 100}% - 4px)` };
  }
});

// Draggable divider handling
const isDragging = ref(false);
const containerRef = ref<HTMLElement | null>(null);

function onDividerMouseDown(e: MouseEvent) {
  e.preventDefault();
  isDragging.value = true;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value || !containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  let ratio: number;

  if (props.splitDirection === 'horizontal') {
    const x = e.clientX - rect.left;
    ratio = x / rect.width;
  } else {
    const y = e.clientY - rect.top;
    ratio = y / rect.height;
  }

  // Clamp ratio to keep both panes at least MIN_PANE_SIZE
  const containerSize = props.splitDirection === 'horizontal' ? rect.width : rect.height;
  const minRatio = MIN_PANE_SIZE / containerSize;
  const maxRatio = 1 - minRatio;

  splitRatio.value = Math.max(minRatio, Math.min(maxRatio, ratio));
}

function onMouseUp() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

// Reset split ratio when direction changes
watch(() => props.splitDirection, () => {
  splitRatio.value = 0.5;
});

function onSourceChange(newContent: string) {
  emit('update:content', newContent);
}
</script>

<template>
  <div
    ref="containerRef"
    class="split-pane"
    :class="[splitDirection, { dragging: isDragging }]"
  >
    <div class="pane source-pane" :style="sourceStyle">
      <CodeEditor
        :model-value="content"
        :is-dark="isDark"
        @update:model-value="onSourceChange"
      />
    </div>

    <div
      class="divider"
      :class="splitDirection"
      @mousedown="onDividerMouseDown"
    >
      <div class="divider-handle" />
    </div>

    <div class="pane preview-pane" :style="previewStyle">
      <PreviewPane :html="content" :cursor-position="cursorPosition ?? undefined" />
    </div>
  </div>
</template>

<style scoped>
.split-pane {
  flex: 1;
  display: flex;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.split-pane.horizontal {
  flex-direction: row;
}

.split-pane.vertical {
  flex-direction: column;
}

.pane {
  min-width: 200px;
  min-height: 200px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.source-pane {
  flex: 0 0 auto;
}

.preview-pane {
  flex: 1 1 auto;
}

.divider {
  flex-shrink: 0;
  background: var(--vscode-panel-border, #3c3c3c);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.divider:hover,
.split-pane.dragging .divider {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.divider.horizontal {
  width: 8px;
  cursor: col-resize;
}

.divider.vertical {
  height: 8px;
  cursor: row-resize;
}

.divider-handle {
  background: var(--vscode-editor-foreground, #ccc);
  border-radius: 2px;
  opacity: 0.5;
}

.divider.horizontal .divider-handle {
  width: 4px;
  height: 40px;
}

.divider.vertical .divider-handle {
  width: 40px;
  height: 4px;
}

.divider:hover .divider-handle,
.split-pane.dragging .divider-handle {
  opacity: 0.8;
}
</style>
