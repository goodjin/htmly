import { ref, computed } from 'vue';

export interface BacklinkInfo {
  pageName: string;
  pagePath: string;
  preview: string;
  linkCount: number;
}

export interface BacklinksState {
  backlinks: BacklinkInfo[];
  currentPage: string;
  isLoading: boolean;
}

const backlinksState = ref<BacklinksState>({
  backlinks: [],
  currentPage: '',
  isLoading: false,
});

/**
 * Composable for managing backlinks state
 */
export function useBacklinks() {
  /**
   * Set the current page name to compute backlinks for
   */
  function setCurrentPage(pageName: string) {
    backlinksState.value.currentPage = pageName;
  }

  /**
   * Set the list of backlinks for the current page
   */
  function setBacklinks(backlinks: BacklinkInfo[]) {
    backlinksState.value.backlinks = backlinks;
  }

  /**
   * Update backlinks with loading state
   */
  function setBacklinksLoading(backlinks: BacklinkInfo[], isLoading: boolean) {
    backlinksState.value.backlinks = backlinks;
    backlinksState.value.isLoading = isLoading;
  }

  /**
   * Clear all backlinks
   */
  function clearBacklinks() {
    backlinksState.value.backlinks = [];
    backlinksState.value.currentPage = '';
    backlinksState.value.isLoading = false;
  }

  /**
   * Get total count of backlinks
   */
  const totalBacklinks = computed(() => backlinksState.value.backlinks.length);

  /**
   * Get backlinks grouped by page
   */
  const groupedBacklinks = computed(() => {
    const groups = new Map<string, BacklinkInfo>();
    for (const backlink of backlinksState.value.backlinks) {
      const existing = groups.get(backlink.pageName);
      if (existing) {
        existing.linkCount += backlink.linkCount;
      } else {
        groups.set(backlink.pageName, { ...backlink });
      }
    }
    return Array.from(groups.values());
  });

  return {
    backlinksState,
    setCurrentPage,
    setBacklinks,
    setBacklinksLoading,
    clearBacklinks,
    totalBacklinks,
    groupedBacklinks,
  };
}
