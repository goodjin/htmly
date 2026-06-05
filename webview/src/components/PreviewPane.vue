<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { createBatchedUpdater, usePerformanceMonitor, throttleRAF } from '../composables/usePerformanceMonitor';

// Cursor position type for scroll sync
interface CursorPosition {
  percentage: number;
  offset: number;
  blockIndex: number;
  totalBlocks: number;
}

const props = defineProps<{
  html: string;
  cursorPosition?: CursorPosition;
  /** Enable performance monitoring overlay (for stress testing) */
  enablePerfMonitor?: boolean;
}>();

// Default to disabled for performance
const enablePerfMonitor = props.enablePerfMonitor ?? false;

type Device = 'desktop' | 'tablet' | 'mobile' | 'custom';

interface DevicePreset {
  width: number;
  label: string;
}

// Device presets with real device sizes (DPR is controlled independently)
const devicePresets: Record<Device, DevicePreset | null> = {
  desktop: { width: 1440, label: 'Desktop' },
  tablet: { width: 768, label: 'Tablet' },
  mobile: { width: 375, label: 'Mobile' },
  custom: null,
};

const selectedDevice = ref<Device>('desktop');
const customWidth = ref(800);
const selectedDpr = ref<1 | 2 | 3>(1);

// Performance monitoring for stress testing (VAL-CROSS-002)
const perfMonitor = usePerformanceMonitor({
  samplingWindow: 60,
  targetFps: 60,
  trackMemory: true,
});

// Track performance metrics for display
const showPerfOverlay = ref(false);
const perfMetrics = ref({
  fps: 60,
  avgFps: 60,
  updateCount: 0,
  lastUpdateTime: 0,
});

// Performance metrics update counter
let perfUpdateCount = 0;
let lastPerfUpdateTime = performance.now();

// Debounce/throttle configuration for preview updates
const DEBOUNCE_DELAY = 200; // ms - primary debounce for typing
const THROTTLE_DELAY = 16; // ms - ~60fps rate limiting

// Track last rendered content to avoid unnecessary refreshes
const lastRenderedHtml = ref('');

// Batched updater for preview refreshes - ensures smooth updates without jank
const batchedPreviewUpdater = createBatchedUpdater<string>((newHtml) => {
  lastRenderedHtml.value = newHtml;
  refreshKey.value++;
  
  // Track update for performance monitoring
  perfUpdateCount++;
  lastPerfUpdateTime = performance.now();
  perfMetrics.value.updateCount = perfUpdateCount;
  perfMetrics.value.lastUpdateTime = lastPerfUpdateTime;
}, {
  batchWindow: DEBOUNCE_DELAY,
  maxBatchSize: 5, // Flush after 5 rapid updates to prevent staleness
});

// Throttled update function for smoother preview during rapid typing
const throttledUpdate = throttleRAF((newHtml: string) => {
  batchedPreviewUpdater.update(newHtml);
}, { leading: true, trailing: true });

// Watch for HTML changes and batch/throttle preview updates
watch(() => props.html, (newHtml) => {
  // Skip if content hasn't actually changed
  if (newHtml === lastRenderedHtml.value) return;
  
  // Use throttled update for smoother rendering during rapid input
  throttledUpdate(newHtml);
});

// Start performance monitoring when enabled
onMounted(() => {
  if (enablePerfMonitor) {
    perfMonitor.start();
    showPerfOverlay.value = true;
    
    // Update perf metrics periodically
    const metricsInterval = setInterval(() => {
      if (perfMonitor.isActive.value) {
        const metrics = perfMonitor.getMetrics();
        perfMetrics.value.fps = metrics.fps;
        perfMetrics.value.avgFps = metrics.averageFps;
      }
    }, 100);
    
    // Store interval for cleanup
    (window as any).__perfInterval = metricsInterval;
  }
});

onBeforeUnmount(() => {
  perfMonitor.stop();
  batchedPreviewUpdater.cancel();
  
  // Clear performance monitoring interval
  const interval = (window as any).__perfInterval;
  if (interval) {
    clearInterval(interval);
  }
});

// Force immediate refresh (bypasses batching)
function forceRefresh() {
  batchedPreviewUpdater.flush();
}

// Compute base width without DPR
const baseWidth = computed<number>(() => {
  if (selectedDevice.value === 'custom') {
    return customWidth.value;
  }
  return devicePresets[selectedDevice.value]!.width;
});

// Compute device label
const deviceLabel = computed<string>(() => {
  if (selectedDevice.value === 'custom') {
    return 'Custom';
  }
  return devicePresets[selectedDevice.value]!.label;
});

// Current preset with independent DPR control
const currentPreset = computed<DevicePreset & { dpr: number }>(() => ({
  width: baseWidth.value,
  label: deviceLabel.value,
  dpr: selectedDpr.value,
}));

// Calculate iframe dimensions based on DPR for zoom
const frameDimensions = computed(() => {
  const preset = currentPreset.value;
  return {
    width: preset.width,
    height: Math.round(preset.width * 0.6), // Default aspect ratio
    scale: preset.dpr, // DPR now behaves as a zoom factor (1x = 100%, 2x = 200%, 3x = 300%)
  };
});

// Apply DPR scaling via CSS transform
// The wrapper's outer dimensions grow with the scale so the parent viewport's
// overflow:auto scroll area matches the rendered content. The transform itself
// is applied to the iframe (not the wrapper) so the layout size of the wrapper
// equals the visual size of the content.
const frameStyle = computed(() => {
  const dims = frameDimensions.value;
  const scale = dims.scale;

  if (scale === 1) {
    // No scaling needed for 1x
    return {
      width: `${dims.width}px`,
      height: `${dims.height}px`,
      transform: 'none',
    };
  }

  // For 2x/3x zoom, grow the wrapper to the visual content size and scale the iframe inside
  return {
    width: `${dims.width * scale}px`,
    height: `${dims.height * scale}px`,
    transform: 'none',
  };
});

// Style for the iframe: keep its layout size at the original width/height and
// use a CSS transform to scale it visually to match the wrapper. This keeps
// the wrapper's layout box equal to the rendered content's visual box.
const iframeStyle = computed(() => {
  const dims = frameDimensions.value;
  const scale = dims.scale;

  if (scale === 1) {
    return {
      width: `${dims.width}px`,
      height: `${dims.height}px`,
      transform: 'none',
    };
  }

  return {
    width: `${dims.width}px`,
    height: `${dims.height}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  };
});

const refreshKey = ref(0);

// Ref for iframe element (used for scroll sync)
const iframeRef = ref<HTMLIFrameElement | null>(null);

// Scroll sync: track cursor position changes and scroll iframe accordingly
let lastScrollPercentage = -1;

function refresh() {
  refreshKey.value++;
  // Reset scroll sync when content refreshes
  lastScrollPercentage = -1;
}

/**
 * Apply scroll sync based on cursor position.
 * Uses smooth scrolling for better UX.
 */
function applyScrollSync(position: CursorPosition) {
  if (!iframeRef.value || !position) return;
  
  // Avoid unnecessary scroll updates if percentage hasn't changed
  if (position.percentage === lastScrollPercentage) return;
  lastScrollPercentage = position.percentage;
  
  // Get the iframe's content document
  const iframe = iframeRef.value;
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) return;
  
  // Get the body/scrollable element
  const scrollTarget = iframeDoc.documentElement || iframeDoc.body;
  if (!scrollTarget) return;
  
  // Calculate target scroll position
  const maxScroll = scrollTarget.scrollHeight - scrollTarget.clientHeight;
  const targetScroll = maxScroll * position.percentage;
  
  // Apply smooth scroll with requestAnimationFrame for smooth animation
  const startScroll = scrollTarget.scrollTop;
  const scrollDelta = targetScroll - startScroll;
  const duration = 200; // ms for smooth animation
  const startTime = performance.now();
  
  function animateScroll(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-out cubic for smooth deceleration
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    const currentScroll = startScroll + scrollDelta * easeOut;
    scrollTarget.scrollTop = currentScroll;
    
    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }
  
  requestAnimationFrame(animateScroll);
}

// Watch for cursor position changes
watch(() => props.cursorPosition, (newPosition) => {
  if (newPosition) {
    // Defer scroll to next tick to ensure iframe is loaded
    nextTick(() => {
      applyScrollSync(newPosition);
    });
  }
}, { deep: true });

/**
 * Inject preview styles into the HTML content for proper rendering of new blocks.
 * This ensures callout, columns, embed, and other custom blocks render correctly
 * in the preview pane. Includes print-ready CSS with proper margins and page breaks.
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
      
      /* Print-ready stylesheet */
      @media print {
        body {
          font-size: 12pt;
          line-height: 1.5;
          padding: 0.5in 0.5in;
          color: #000;
          background: white;
        }
        
        /* Proper margins for print */
        @page {
          margin: 0.75in;
          size: auto;
        }
        
        /* Page breaks */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          orphans: 3;
          widows: 3;
        }
        
        p {
          orphans: 3;
          widows: 3;
        }
        
        /* Allow page breaks inside these elements */
        pre, blockquote, table, figure {
          page-break-inside: avoid;
        }
        
        /* Ensure links are visible in print */
        a {
          color: #0066cc;
          text-decoration: underline;
        }
        
        /* Hide non-essential elements */
        .embed-block iframe {
          display: none;
        }
        
        /* Columns print layout */
        .columns {
          display: block;
        }
        .column {
          width: 100% !important;
          border: none;
          margin-bottom: 1em;
        }
        
        /* Preserve images */
        img {
          max-width: 100%;
          page-break-inside: avoid;
        }
        
        /* Force background colors to print */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
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
      <div class="preview-controls">
        <div class="preview-devices">
          <button
            v-for="(info, key) in devicePresets"
            :key="key"
            v-show="info !== null"
            :class="{ active: selectedDevice === key }"
            @click="selectedDevice = key as Device"
          >{{ info?.label }}</button>
          <button
            :class="{ active: selectedDevice === 'custom' }"
            @click="selectedDevice = 'custom'"
          >Custom</button>
        </div>
        
        <!-- Custom width input -->
        <div v-if="selectedDevice === 'custom'" class="custom-controls">
          <label>
            Width:
            <input
              v-model.number="customWidth"
              type="number"
              min="100"
              max="2560"
              step="10"
              class="width-input"
            />
            <span class="unit">px</span>
          </label>
        </div>
        
        <!-- DPR selector -->
        <div class="dpr-controls">
          <span class="dpr-label">DPR:</span>
          <button
            v-for="dpr in [1, 2, 3]"
            :key="dpr"
            :class="{ active: selectedDpr === dpr }"
            @click="selectedDpr = dpr as 1 | 2 | 3"
          >{{ dpr }}x</button>
        </div>
      </div>
      
      <button class="refresh-btn" title="Refresh preview" @click="forceRefresh">↻</button>
    </div>
    
    <div class="preview-viewport">
      <div 
        class="preview-frame-wrapper" 
        :style="frameStyle"
        :data-device="currentPreset.label"
        :data-width="currentPreset.width"
        :data-dpr="currentPreset.dpr"
      >
        <iframe
          ref="iframeRef"
          :key="refreshKey"
          class="preview-frame"
          :style="iframeStyle"
          :title="`HTML Preview - ${currentPreset.label} (${currentPreset.width}px @ ${currentPreset.dpr}x)`"
          sandbox="allow-scripts allow-same-origin"
          :srcdoc="previewContent"
        />
      </div>
    </div>
    
    <!-- Performance monitoring overlay (visible when enablePerfMonitor=true) -->
    <div v-if="showPerfOverlay" class="perf-overlay">
      <div class="perf-stat">
        <span class="perf-label">FPS</span>
        <span class="perf-value" :class="{ warning: perfMetrics.avgFps < 54 }">
          {{ perfMetrics.fps }}/{{ perfMetrics.avgFps }}
        </span>
      </div>
      <div class="perf-stat">
        <span class="perf-label">Updates</span>
        <span class="perf-value">{{ perfMetrics.updateCount }}</span>
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
  flex-wrap: wrap;
  gap: 4px;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-devices {
  display: flex;
  gap: 2px;
}

.preview-devices button,
.dpr-controls button,
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
.dpr-controls button:hover,
.refresh-btn:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
  border-color: var(--vscode-panel-border, #3c3c3c);
}

.preview-devices button.active,
.dpr-controls button.active {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #fff);
}

.custom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.custom-controls label {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--vscode-editor-foreground, #ccc);
  font-size: 12px;
}

.width-input {
  width: 70px;
  padding: 2px 6px;
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  border-radius: 3px;
  background: var(--vscode-editor-background, #1e1e1e);
  color: var(--vscode-editor-foreground, #ccc);
  font-size: 12px;
}

.width-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder, #007acc);
}

.unit {
  color: var(--vscode-editor-foreground, #999);
}

.dpr-controls {
  display: flex;
  align-items: center;
  gap: 2px;
}

.dpr-label {
  color: var(--vscode-editor-foreground, #999);
  font-size: 11px;
  margin-right: 4px;
}

.preview-viewport {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow: auto;
  padding: 8px;
}

.preview-frame-wrapper {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.preview-frame {
  display: block;
  border: 0;
  background: white;
}

/* Performance monitoring overlay */
.perf-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  padding: 6px 10px;
  display: flex;
  gap: 12px;
  font-size: 11px;
  font-family: monospace;
  z-index: 100;
  pointer-events: none;
}

.perf-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.perf-label {
  color: #888;
  font-size: 9px;
  text-transform: uppercase;
}

.perf-value {
  color: #4caf50;
  font-weight: bold;
}

.perf-value.warning {
  color: #ff9800;
}

.perf-value.critical {
  color: #f44336;
}
</style>
