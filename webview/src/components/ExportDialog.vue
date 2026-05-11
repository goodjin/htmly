<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { ExportFormat, ExportPreset, PdfExportOptions, SeoSettings } from '../../../src/shared/types';
import { useExportPresets } from '../composables/useExportPresets';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  export: [format: ExportFormat, options?: PdfExportOptions, seoSettings?: SeoSettings];
  cancel: [];
}>();

// Use export presets composable
const {
  presets,
  selectedPresetId,
  selectedPreset,
  loadPresets,
  savePreset,
  deletePreset,
  selectPreset,
  updateSelectedPresetOptions,
  getCurrentOptions,
} = useExportPresets();

// Export format options
const exportOptions: { format: ExportFormat; label: string; icon: string; description: string }[] = [
  { format: 'pdf', label: 'Export as PDF', icon: '📄', description: 'Export document as PDF using browser print' },
  { format: 'markdown', label: 'Export as Markdown', icon: '📝', description: 'Convert to .md file with formatting' },
  { format: 'plaintext', label: 'Export as Plain Text', icon: '📃', description: 'Export as plain text file' },
  { format: 'embedded', label: 'Export as Embedded HTML', icon: '🔗', description: 'Single HTML file with inlined styles' },
  { format: 'site', label: 'Export as Static Site', icon: '🌐', description: 'Export all pages as a self-contained static website' },
];

// PDF-specific options (for when PDF format is selected)
const showPdfOptions = ref(false);
const includePageNumbers = ref(true);
const headerText = ref('');
const footerText = ref('');
const newPresetName = ref('');
const showSavePresetDialog = ref(false);

// SEO-specific options (for when static site format is selected)
const showSeoOptions = ref(false);
const seoTitle = ref('');
const seoDescription = ref('');
const ogImage = ref('');
const customDomain = ref('');
const domainValidationError = ref('');

// Track hover state for keyboard navigation
const hoveredIndex = ref(-1);

// Current export options (merged from selected preset and manual changes)
const currentOptions = computed<PdfExportOptions>(() => ({
  includePageNumbers: includePageNumbers.value,
  headerText: headerText.value,
  footerText: footerText.value,
  preset: selectedPreset.value.type,
}));

// SEO settings for static site export
const currentSeoSettings = computed<SeoSettings>(() => ({
  seoTitle: seoTitle.value,
  seoDescription: seoDescription.value,
  ogImage: ogImage.value,
  customDomain: customDomain.value,
}));

// Domain validation function (mirrors extension-side validation)
function validateDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    domainValidationError.value = 'Domain is required';
    return false;
  }

  const trimmedDomain = domain.trim().toLowerCase();

  if (trimmedDomain.length === 0) {
    domainValidationError.value = 'Domain cannot be empty';
    return false;
  }

  if (trimmedDomain.startsWith('http://') || trimmedDomain.startsWith('https://')) {
    domainValidationError.value = 'Do not include protocol (http:// or https://)';
    return false;
  }

  if (trimmedDomain.includes('/')) {
    domainValidationError.value = 'Domain should not include a path';
    return false;
  }

  if (trimmedDomain.includes(':')) {
    domainValidationError.value = 'Domain should not include a port number';
    return false;
  }

  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(trimmedDomain)) {
    domainValidationError.value = 'IP addresses are not supported';
    return false;
  }

  const domainPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!domainPattern.test(trimmedDomain)) {
    domainValidationError.value = 'Invalid domain format (e.g., example.com)';
    return false;
  }

  if (trimmedDomain !== 'localhost' && !trimmedDomain.includes('.')) {
    domainValidationError.value = 'Domain must include a top-level domain';
    return false;
  }

  const labels = trimmedDomain.split('.');
  for (const label of labels) {
    if (label.length > 63) {
      domainValidationError.value = 'Domain label exceeds 63 characters';
      return false;
    }
    if (label.length === 0) {
      domainValidationError.value = 'Domain contains empty label';
      return false;
    }
  }

  if (trimmedDomain.length > 253) {
    domainValidationError.value = 'Domain exceeds 253 characters';
    return false;
  }

  domainValidationError.value = '';
  return true;
}

// Watch for preset changes and update local options
watch(selectedPresetId, (id) => {
  const preset = presets.value.find(p => p.id === id);
  if (preset) {
    includePageNumbers.value = preset.options.includePageNumbers;
    headerText.value = preset.options.headerText;
    footerText.value = preset.options.footerText;
  }
});

// Watch for visible changes to reset state
watch(() => props.visible, (v) => {
  if (v) {
    hoveredIndex.value = -1;
    showPdfOptions.value = false;
    showSeoOptions.value = false;
    loadPresets();
    // Reset to selected preset values
    const preset = presets.value.find(p => p.id === selectedPresetId.value);
    if (preset) {
      includePageNumbers.value = preset.options.includePageNumbers;
      headerText.value = preset.options.headerText;
      footerText.value = preset.options.footerText;
    }
  }
});

// Update options when user changes them
watch([includePageNumbers, headerText, footerText], () => {
  updateSelectedPresetOptions({
    includePageNumbers: includePageNumbers.value,
    headerText: headerText.value,
    footerText: footerText.value,
  });
});

function onExport(format: ExportFormat) {
  if (format === 'pdf') {
    emit('export', format, currentOptions.value);
  } else if (format === 'site') {
    // Validate custom domain before export
    if (customDomain.value && !validateDomain(customDomain.value)) {
      // Don't proceed with export if domain is invalid
      return;
    }
    emit('export', format, undefined, currentSeoSettings.value);
  } else {
    emit('export', format);
  }
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

function onPresetChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  selectPreset(target.value);
}

function onSavePreset() {
  if (newPresetName.value.trim()) {
    savePreset({
      name: newPresetName.value.trim(),
      type: 'custom',
      options: {
        includePageNumbers: includePageNumbers.value,
        headerText: headerText.value,
        footerText: footerText.value,
        preset: 'custom',
      },
    });
    newPresetName.value = '';
    showSavePresetDialog.value = false;
  }
}

function onDeletePreset() {
  if (selectedPreset.value && !selectedPreset.value.isBuiltIn) {
    deletePreset(selectedPreset.value.id);
  }
}

function togglePdfOptions() {
  showPdfOptions.value = !showPdfOptions.value;
}

function toggleSeoOptions() {
  showSeoOptions.value = !showSeoOptions.value;
}
</script>

<template>
  <div v-if="visible" class="export-dialog-backdrop" @mousedown.self="emit('cancel')">
    <div class="export-dialog" @keydown="onKeydown">
      <div class="export-header">
        <span class="export-title">Export Document</span>
      </div>
      
      <!-- Format Selection -->
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

      <!-- PDF Options Section -->
      <div class="pdf-options-section">
        <button 
          class="pdf-options-toggle"
          @click="togglePdfOptions"
        >
          <span class="toggle-icon">{{ showPdfOptions ? '▼' : '▶' }}</span>
          <span>PDF Options</span>
        </button>
        
        <div v-if="showPdfOptions" class="pdf-options-content">
          <!-- Preset Selector -->
          <div class="option-row">
            <label class="option-label" for="preset-select">Preset:</label>
            <select 
              id="preset-select"
              class="option-select"
              :value="selectedPresetId"
              @change="onPresetChange"
            >
              <option 
                v-for="preset in presets" 
                :key="preset.id" 
                :value="preset.id"
              >
                {{ preset.name }}
              </option>
            </select>
            <button 
              v-if="!selectedPreset?.isBuiltIn"
              class="delete-preset-btn"
              title="Delete preset"
              @click="onDeletePreset"
            >
              🗑
            </button>
          </div>

          <!-- Page Numbers Toggle -->
          <div class="option-row">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="includePageNumbers"
              />
              <span>Include page numbers</span>
            </label>
          </div>

          <!-- Header Text -->
          <div class="option-row">
            <label class="option-label" for="header-text">Header:</label>
            <input 
              id="header-text"
              type="text"
              class="option-input"
              v-model="headerText"
              placeholder="Header text (optional)"
            />
          </div>

          <!-- Footer Text -->
          <div class="option-row">
            <label class="option-label" for="footer-text">Footer:</label>
            <input 
              id="footer-text"
              type="text"
              class="option-input"
              v-model="footerText"
              placeholder="Use {page} and {total} for page numbers"
            />
          </div>

          <!-- Save as Preset -->
          <div class="option-row save-preset-row">
            <button 
              class="save-preset-btn"
              @click="showSavePresetDialog = true"
            >
              Save as Preset
            </button>
          </div>
        </div>
      </div>

      <!-- SEO Options Section (for Static Site export) -->
      <div class="seo-options-section">
        <button 
          class="seo-options-toggle"
          @click="toggleSeoOptions"
        >
          <span class="toggle-icon">{{ showSeoOptions ? '▼' : '▶' }}</span>
          <span>SEO Settings</span>
        </button>
        
        <div v-if="showSeoOptions" class="seo-options-content">
          <p class="seo-help-text">Configure search engine optimization settings for your static site.</p>
          
          <!-- SEO Title -->
          <div class="option-row">
            <label class="option-label" for="seo-title">Title:</label>
            <input 
              id="seo-title"
              type="text"
              class="option-input"
              v-model="seoTitle"
              placeholder="Custom SEO title (optional)"
            />
          </div>
          
          <!-- SEO Description -->
          <div class="option-row">
            <label class="option-label" for="seo-description">Description:</label>
            <textarea 
              id="seo-description"
              class="option-textarea"
              v-model="seoDescription"
              placeholder="Meta description for search engines"
              rows="2"
            ></textarea>
          </div>
          
          <!-- OG Image URL -->
          <div class="option-row">
            <label class="option-label" for="og-image">OG Image:</label>
            <input 
              id="og-image"
              type="text"
              class="option-input"
              v-model="ogImage"
              placeholder="https://example.com/image.png"
            />
          </div>
          
          <p class="seo-help-hint">The OG image is used when sharing on social media like Facebook, Twitter, and LinkedIn.</p>
          
          <!-- Custom Domain for GitHub Pages -->
          <div class="option-row domain-row">
            <label class="option-label" for="custom-domain">Domain:</label>
            <input 
              id="custom-domain"
              type="text"
              class="option-input"
              :class="{ 'input-error': domainValidationError }"
              v-model="customDomain"
              placeholder="example.com"
              @blur="validateDomain(customDomain)"
              @input="domainValidationError = ''"
            />
          </div>
          
          <p v-if="domainValidationError" class="domain-error">{{ domainValidationError }}</p>
          <p class="seo-help-hint domain-help">Custom domain for GitHub Pages. A CNAME file will be generated for your deployment.</p>
        </div>
      </div>

      <!-- Save Preset Dialog -->
      <div v-if="showSavePresetDialog" class="save-preset-dialog">
        <div class="dialog-header">
          <span class="dialog-title">Save Preset</span>
        </div>
        <div class="dialog-body">
          <label class="option-label" for="preset-name">Preset Name:</label>
          <input 
            id="preset-name"
            type="text"
            class="option-input"
            v-model="newPresetName"
            placeholder="My Custom Preset"
            @keydown.enter="onSavePreset"
            @keydown.escape="showSavePresetDialog = false"
          />
        </div>
        <div class="dialog-actions">
          <button 
            class="btn btn-secondary"
            @click="showSavePresetDialog = false"
          >
            Cancel
          </button>
          <button 
            class="btn btn-primary"
            @click="onSavePreset"
            :disabled="!newPresetName.trim()"
          >
            Save
          </button>
        </div>
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
  max-width: 420px;
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

/* PDF Options Section */
.pdf-options-section {
  border-top: 1px solid var(--vscode-panel-border, #3c3c3c);
  padding: 8px 14px;
}

.pdf-options-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--vscode-editor-foreground, #cccccc);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
  font-family: inherit;
}

.pdf-options-toggle:hover {
  color: var(--vscode-textLink-foreground, #4fc1ff);
}

.toggle-icon {
  font-size: 10px;
  color: var(--vscode-descriptionForeground, #aaaaaa);
}

.pdf-options-content {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* SEO Options Section */
.seo-options-section {
  border-top: 1px solid var(--vscode-panel-border, #3c3c3c);
  padding: 8px 14px;
}

.seo-options-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--vscode-editor-foreground, #cccccc);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
  font-family: inherit;
}

.seo-options-toggle:hover {
  color: var(--vscode-textLink-foreground, #4fc1ff);
}

.seo-options-content {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.seo-help-text {
  font-size: 11px;
  color: var(--vscode-descriptionForeground, #aaaaaa);
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.seo-help-hint {
  font-size: 10px;
  color: var(--vscode-descriptionForeground, #aaaaaa);
  margin: 4px 0 0 0;
  line-height: 1.3;
}

.option-textarea {
  flex: 1;
  background: var(--vscode-input-background, #3c3c3c);
  border: 1px solid var(--vscode-input-border, #454545);
  border-radius: 4px;
  padding: 6px 8px;
  color: var(--vscode-input-foreground, #cccccc);
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
  min-height: 40px;
}

.option-textarea:focus {
  outline: none;
  border-color: var(--vscode-focusBorder, #007acc);
}

.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-row .option-label {
  min-width: 60px;
  font-size: 12px;
}

.option-select,
.option-input {
  flex: 1;
  background: var(--vscode-input-background, #3c3c3c);
  border: 1px solid var(--vscode-input-border, #454545);
  border-radius: 4px;
  padding: 6px 8px;
  color: var(--vscode-input-foreground, #cccccc);
  font-size: 12px;
  font-family: inherit;
}

.option-select:focus,
.option-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder, #007acc);
}

.option-select {
  cursor: pointer;
}

.delete-preset-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 14px;
  opacity: 0.7;
  transition: opacity 100ms;
}

.delete-preset-btn:hover {
  opacity: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--vscode-editor-foreground, #cccccc);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.save-preset-row {
  justify-content: flex-end;
  margin-top: 4px;
}

.save-preset-btn {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

.save-preset-btn:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}

/* Save Preset Dialog */
.save-preset-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--vscode-editorWidget-background, #252526);
  border: 1px solid var(--vscode-editorWidget-border, #454545);
  border-radius: 6px;
  padding: 16px;
  min-width: 280px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.dialog-header {
  margin-bottom: 12px;
}

.dialog-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.dialog-body {
  margin-bottom: 16px;
}

.dialog-body .option-label {
  display: block;
  margin-bottom: 6px;
}

.dialog-body .option-input {
  width: 100%;
  box-sizing: border-box;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: none;
  font-family: inherit;
}

.btn-primary {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
}

.btn-primary:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--vscode-toolbar-hoverBackground, #2d2d2d);
  color: var(--vscode-editor-foreground, #cccccc);
  border: 1px solid var(--vscode-widget-border, #3c3c3c);
}

.btn-secondary:hover {
  background: var(--vscode-toolbar-hoverBackground, #3d3d3d);
}

/* Custom Domain Input Styles */
.domain-row {
  margin-top: 8px;
}

.option-input.input-error {
  border-color: var(--vscode-errorForeground, #f48771);
}

.domain-error {
  font-size: 11px;
  color: var(--vscode-errorForeground, #f48771);
  margin: 4px 0 0 70px;
  padding: 4px 8px;
  background: rgba(244, 135, 113, 0.1);
  border-radius: 4px;
}

.domain-help {
  margin-left: 70px;
}
</style>
