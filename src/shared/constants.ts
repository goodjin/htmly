/**
 * Centralized constants for the Htmly editor extension
 */

// History
export const MAX_HISTORY_ENTRIES = 100;
export const HISTORY_DEBOUNCE_MS = 1000;

// Save
export const SAVE_DEBOUNCE_MS = 500;
export const LARGE_FILE_THRESHOLD = 500 * 1024; // 500 KB
export const LARGE_SAVE_THRESHOLD = 100 * 1024; // 100 KB for optimization

// Webview debounce (for cases where it's still needed)
export const CONTENT_UPDATE_DEBOUNCE_MS = 300;
