<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
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

/**
 * Inject preview styles into the HTML content for proper rendering of new blocks.
 * This ensures callout, columns, embed, and other custom blocks render correctly
 * in the preview pane.
 */
const previewContent = computed(() => {
  // Styles needed for proper preview rendering of all block types
  const previewStyles = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        padding: 16px 24px;
        color: #333;
        background: white;
      }
      h1 { font-size: 2em; font-weight: 700; margin: 0.5em 0; }
      h2 { font-size: 1.5em; font-weight: 600; margin: 0.5em 0; }
      h3 { font-size: 1.25em; font-weight: 600; margin: 0.5em 0; }
      p { margin: 0.5em 0; }
      ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
      li { margin: 0.25em 0; }
      a { color: #0066cc; text-decoration: underline; }
      code { background: #f4f4f4; border-radius: 3px; padding: 2px 5px; font-family: monospace; }
      pre { background: #f4f4f4; border-radius: 6px; padding: 1em; overflow-x: auto; }
      pre code { background: none; padding: 0; }
      blockquote { border-left: 3px solid #007acc; padding-left: 1em; color: #666; margin: 0.5em 0; }
      table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
      th, td { border: 1px solid #ddd; padding: 6px 12px; }
      th { background: #f4f4f4; font-weight: 600; }
      
      /* Callout block styles */
      .callout {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        border-radius: 6px;
        margin: 8px 0;
      }
      .callout::before {
        content: attr(data-icon);
        font-size: 24px;
        line-height: 1.4;
        flex-shrink: 0;
        user-select: none;
      }
      
      /* Embed block styles */
      .embed-block {
        position: relative;
        width: 100%;
        max-width: 100%;
        margin: 12px 0;
        padding-bottom: 56.25%;
        height: 0;
        overflow: hidden;
        border-radius: 8px;
        background: #000;
      }
      .embed-block iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: none;
      }
      .embed-block--empty {
        background: #f4f4f4;
        display: flex;
        align-items: center;
        justify-content: center;
        padding-bottom: 0;
        height: auto;
        min-height: 200px;
      }
      
      /* Columns layout styles */
      .columns {
        display: flex;
        flex-direction: row;
        gap: 16px;
        margin: 12px 0;
      }
      .column {
        flex: 1;
        min-width: 100px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-sizing: border-box;
      }
      .column > * + * { margin-top: 0.5em; }
      
      /* Nested columns */
      .column .columns { margin: 8px 0; }
      .column .column { border: 1px dashed #ccc; }
      
      /* Tables and images in columns */
      .column table { max-width: 100%; overflow-x: auto; }
      .column img { max-width: 100%; height: auto; }
    </style>
  `;
  
  const html = props.html;
  
  // Check if the content already has a <head> section
  const hasHead = /<head\b/i.test(html);
  
  if (hasHead) {
    // Insert styles before </head>
    return html.replace(/<\/head>/i, `${previewStyles}</head>`);
  } else if (/<html\b/i.test(html)) {
    // Insert head before body or html closing
    if (/<body\b/i.test(html)) {
      return html.replace(/(<body\b[^>]*>)/i, `<head>${previewStyles}</head>$1`);
    }
    return html.replace(/(<\/html>)/i, `<head>${previewStyles}</head><body>$1</body>`);
  } else if (/<body\b/i.test(html)) {
    // Fragment with body
    return `<!DOCTYPE html><html><head>${previewStyles}</head>${html}</html>`;
  } else {
    // Pure fragment - wrap with head and body
    return `<!DOCTYPE html><html><head>${previewStyles}</head><body>${html}</body></html>`;
  }
});
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
          sandbox="allow-scripts allow-same-origin"
          :srcdoc="previewContent"
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
