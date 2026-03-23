<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { EditorMode } from '../../src/shared/types';
import { useVSCode } from './composables/useVSCode';
import Toolbar from './components/Toolbar.vue';
import TiptapEditor from './components/TiptapEditor.vue';
import CodeEditor from './components/CodeEditor.vue';

const { onMessage, notifyReady, sendContentUpdate, sendModeChanged, isDark } = useVSCode();

const content = ref('');
const mode = ref<EditorMode>('wysiwyg');
const initialized = ref(false);

// Debounce content updates sent to extension
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function onContentChange(newHtml: string) {
  content.value = newHtml;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    sendContentUpdate(newHtml);
  }, 300);
}

function toggleMode() {
  const next: EditorMode = mode.value === 'wysiwyg' ? 'source' : 'wysiwyg';
  mode.value = next;
  sendModeChanged(next);
}

const tiptapRef = ref<InstanceType<typeof TiptapEditor> | null>(null);

// Register message handler
const unsubscribe = onMessage((msg) => {
  switch (msg.type) {
    case 'init':
      content.value = msg.content;
      mode.value = msg.mode;
      initialized.value = true;
      break;

    case 'contentChanged':
      // External file change (e.g. git checkout) — only update if not actively editing
      content.value = msg.content;
      break;

    case 'setMode':
      mode.value = msg.mode;
      break;

    case 'theme':
      isDark.value = msg.isDark;
      break;
  }
});

onMounted(() => {
  notifyReady();
});

onBeforeUnmount(() => {
  unsubscribe();
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="app" :class="{ dark: isDark, light: !isDark }">
    <Toolbar
      :editor="tiptapRef?.editor"
      :mode="mode"
      @toggle-mode="toggleMode"
    />

    <div class="editor-area" v-if="initialized">
      <TiptapEditor
        v-if="mode === 'wysiwyg'"
        ref="tiptapRef"
        :model-value="content"
        @update:model-value="onContentChange"
      />
      <CodeEditor
        v-else
        :model-value="content"
        :is-dark="isDark"
        @update:model-value="onContentChange"
      />
    </div>

    <div class="loading" v-else>Loading…</div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vscode-descriptionForeground, #888);
}
</style>
