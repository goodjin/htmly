/**
 * Export presets composable for managing PDF export presets
 * Handles saving, loading, and applying export presets
 */
import { ref, readonly, watch } from 'vue';
import type { ExportPreset, ExportPresetType, PdfExportOptions } from '../../../src/shared/types';

// Default presets
const DEFAULT_PRESETS: ExportPreset[] = [
  {
    id: 'print',
    name: 'Print',
    type: 'print',
    options: {
      includePageNumbers: true,
      headerText: '',
      footerText: '',
      preset: 'print',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 70, right: 70, bottom: 70, left: 70 },
    },
    isBuiltIn: true,
  },
  {
    id: 'screen',
    name: 'Screen',
    type: 'screen',
    options: {
      includePageNumbers: false,
      headerText: '',
      footerText: '',
      preset: 'screen',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 70, right: 70, bottom: 70, left: 70 },
    },
    isBuiltIn: true,
  },
  {
    id: 'ebook',
    name: 'eBook',
    type: 'ebook',
    options: {
      includePageNumbers: true,
      headerText: '',
      footerText: 'Page {page} of {total}',
      preset: 'ebook',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 70, right: 70, bottom: 70, left: 70 },
    },
    isBuiltIn: true,
  },
];

// Local storage key for custom presets
const STORAGE_KEY = 'htmly.exportPresets';

export interface UseExportPresetsReturn {
  presets: Readonly<typeof presets>;
  selectedPresetId: Readonly<typeof selectedPresetId>;
  selectedPreset: typeof selectedPreset;
  loadPresets: () => void;
  savePreset: (preset: Omit<ExportPreset, 'id' | 'isBuiltIn'>) => void;
  deletePreset: (id: string) => void;
  selectPreset: (id: string) => void;
  updateSelectedPresetOptions: (options: Partial<PdfExportOptions>) => void;
  applyPreset: (id: string) => void;
  getCurrentOptions: () => PdfExportOptions;
}

export function useExportPresets(): UseExportPresetsReturn {
  const presets = ref<ExportPreset[]>([...DEFAULT_PRESETS]);
  const selectedPresetId = ref<string>('print');
  const selectedPreset = ref<ExportPreset>(DEFAULT_PRESETS[0]);

  // Load presets from localStorage
  function loadPresets(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const customPresets = JSON.parse(stored) as ExportPreset[];
        // Merge with default presets (custom presets take precedence for same id)
        const mergedPresets = [...DEFAULT_PRESETS];
        for (const custom of customPresets) {
          const existingIndex = mergedPresets.findIndex(p => p.id === custom.id);
          if (existingIndex >= 0) {
            mergedPresets[existingIndex] = custom;
          } else {
            mergedPresets.push(custom);
          }
        }
        presets.value = mergedPresets;
      }
    } catch (error) {
      console.error('[useExportPresets] Failed to load presets:', error);
    }

    // Ensure selected preset is valid
    const validSelection = presets.value.find(p => p.id === selectedPresetId.value);
    if (!validSelection) {
      selectedPresetId.value = 'print';
      selectedPreset.value = presets.value[0];
    } else {
      selectedPreset.value = validSelection;
    }
  }

  // Save custom presets to localStorage
  function persistCustomPresets(): void {
    try {
      const customPresets = presets.value.filter(p => !p.isBuiltIn);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
    } catch (error) {
      console.error('[useExportPresets] Failed to save presets:', error);
    }
  }

  // Save a new preset
  function savePreset(preset: Omit<ExportPreset, 'id' | 'isBuiltIn'>): void {
    const id = `custom-${Date.now()}`;
    const newPreset: ExportPreset = {
      ...preset,
      id,
      isBuiltIn: false,
    };
    presets.value.push(newPreset);
    selectedPresetId.value = id;
    selectedPreset.value = newPreset;
    persistCustomPresets();
  }

  // Delete a preset (only custom presets can be deleted)
  function deletePreset(id: string): void {
    const preset = presets.value.find(p => p.id === id);
    if (!preset || preset.isBuiltIn) {
      return; // Cannot delete built-in presets
    }

    presets.value = presets.value.filter(p => p.id !== id);

    // If deleted preset was selected, switch to print
    if (selectedPresetId.value === id) {
      selectedPresetId.value = 'print';
      selectedPreset.value = presets.value[0];
    }

    persistCustomPresets();
  }

  // Select a preset
  function selectPreset(id: string): void {
    const preset = presets.value.find(p => p.id === id);
    if (preset) {
      selectedPresetId.value = id;
      selectedPreset.value = preset;
    }
  }

  // Update options of the currently selected preset
  function updateSelectedPresetOptions(options: Partial<PdfExportOptions>): void {
    const preset = presets.value.find(p => p.id === selectedPresetId.value);
    if (preset) {
      preset.options = { ...preset.options, ...options };
      selectedPreset.value = { ...preset };
      
      // If it's a custom preset, persist changes
      if (!preset.isBuiltIn) {
        persistCustomPresets();
      }
    }
  }

  // Apply a preset (select and return its options)
  function applyPreset(id: string): PdfExportOptions {
    const preset = presets.value.find(p => p.id === id);
    if (preset) {
      selectedPresetId.value = id;
      selectedPreset.value = preset;
      return { ...preset.options };
    }
    return DEFAULT_PRESETS[0].options;
  }

  // Get current export options
  function getCurrentOptions(): PdfExportOptions {
    return { ...selectedPreset.value.options };
  }

  // Load presets on initialization
  loadPresets();

  return {
    presets: readonly(presets),
    selectedPresetId: readonly(selectedPresetId),
    selectedPreset,
    loadPresets,
    savePreset,
    deletePreset,
    selectPreset,
    updateSelectedPresetOptions,
    applyPreset,
    getCurrentOptions,
  };
}
