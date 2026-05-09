<script setup lang="ts">
import { ref, computed } from 'vue';

defineProps<{
  html: string;
}>();

type Device = 'desktop' | 'tablet' | 'mobile';

const device = ref<Device>('desktop');

const deviceSizes: Record<Device, { width: string; label: string }> = {
  desktop: { width: '100%', label: 'Desktop' },
  tablet: { width: '768px', label: 'Tablet' },
  mobile: { width: '375px', label: 'Mobile' },
};

const frameStyle = computed(() => {
  const size = deviceSizes[device.value];
  return {
    width: size.width,
    maxWidth: size.width === '100%' ? '100%' : size.width,
  };
});

const refreshKey = ref(0);

function refresh() {
  refreshKey.value++;
}
</script>

<template>
  <div class="preview-shell">
    <div class="preview-toolbar">
      <div class="preview-devices">
        <button
          v-for="(info, key) in deviceSizes"
          :key="key"
          :class="{ active: device === key }"
          @click="device = key as Device"
        >{{ info.label }}</button>
      </div>
      <button class="refresh-btn" title="Refresh preview" @click="refresh">↻</button>
    </div>
    <div class="preview-viewport">
      <div class="preview-frame-wrapper" :style="frameStyle">
        <iframe
          :key="refreshKey"
          class="preview-frame"
          title="HTML Preview"
          sandbox="allow-scripts"
          :srcdoc="html"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  overflow: hidden;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: var(--vscode-editorGroupHeader-tabsBackground, #252526);
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
  flex-shrink: 0;
}

.preview-devices {
  display: flex;
  gap: 2px;
}

.preview-devices button,
.refresh-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--vscode-editor-foreground, #ccc);
  border-radius: 3px;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 12px;
}

.preview-devices button:hover,
.refresh-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.preview-devices button.active {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #fff);
}

.preview-viewport {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  overflow: auto;
  padding: 8px;
}

.preview-frame-wrapper {
  height: 100%;
  transition: width 0.2s ease;
  flex-shrink: 0;
}

.preview-frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: white;
}
</style>
