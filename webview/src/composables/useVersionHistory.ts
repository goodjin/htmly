/**
 * Version History Composable
 * 
 * Manages version history state for the VersionHistoryPanel.
 * Communicates with the extension via postMessage to request versions
 * and restore previous versions.
 */
import { ref, computed } from 'vue';
import { useVSCode } from './useVSCode';
import type { VersionHistoryEntry } from '../../../src/shared/types';

export function useVersionHistory() {
  const { onMessage, postMessage } = useVSCode();

  // State
  const versions = ref<VersionHistoryEntry[]>([]);
  const isLoading = ref(false);
  const selectedVersionNumber = ref<number | null>(null);
  const isRestoring = ref(false);

  // Set up listener for version history messages
  onMessage((msg) => {
    switch (msg.type) {
      case 'versionHistory':
        versions.value = msg.versions;
        isLoading.value = false;
        break;

      case 'versionRestored':
        isRestoring.value = false;
        // Clear selection after restore
        selectedVersionNumber.value = null;
        break;
    }
  });

  /**
   * Request version history from extension
   */
  function requestVersionHistory(): void {
    isLoading.value = true;
    postMessage({ type: 'requestVersionHistory' });
  }

  /**
   * Request to restore a specific version
   */
  function restoreVersion(versionNumber: number): void {
    if (isRestoring.value) return;
    isRestoring.value = true;
    selectedVersionNumber.value = versionNumber;
    postMessage({ type: 'restoreVersion', versionNumber });
  }

  /**
   * Select a version for preview
   */
  function selectVersion(versionNumber: number | null): void {
    selectedVersionNumber.value = versionNumber;
  }

  /**
   * Dismiss preview and return to version list
   */
  function dismissPreview(): void {
    selectedVersionNumber.value = null;
  }

  /**
   * Get version count
   */
  const versionCount = computed(() => versions.value.length);

  /**
   * Get the most recent version number
   */
  const latestVersionNumber = computed(() => {
    if (versions.value.length === 0) return null;
    return versions.value[0].versionNumber;
  });

  /**
   * Check if there are versions available
   */
  const hasVersions = computed(() => versions.value.length > 0);

  /**
   * Get a specific version by number
   */
  function getVersion(versionNumber: number): VersionHistoryEntry | undefined {
    return versions.value.find(v => v.versionNumber === versionNumber);
  }

  /**
   * Get the currently selected/previewed version object
   */
  const previewVersion = computed(() => {
    if (selectedVersionNumber.value === null) return null;
    return versions.value.find(v => v.versionNumber === selectedVersionNumber.value) || null;
  });

  return {
    // State
    versions,
    isLoading,
    selectedVersionNumber,
    isRestoring,
    versionCount,
    latestVersionNumber,
    hasVersions,
    previewVersion,

    // Actions
    requestVersionHistory,
    restoreVersion,
    selectVersion,
    dismissPreview,
    getVersion,
  };
}
