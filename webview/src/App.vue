<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { EditorMode, HtmlySettings, TemplateCategory, UserTemplateMetadata, SnippetCategory } from '../../src/shared/types';
import { useVSCode } from './composables/useVSCode';
import { useSharedHistory, onHistoryChange } from './composables/useSharedHistory';
import { useProjectSearch } from './composables/useProjectSearch';
import { useSpellCheck } from './composables/useSpellCheck';
import { extractBodyContent, replaceBodyContent } from './core/htmlUtils';
import Toolbar from './components/Toolbar.vue';
import TiptapEditor, { type CursorPosition } from './components/TiptapEditor.vue';
import CodeEditor, { type CodeEditorCursorPosition } from './components/CodeEditor.vue';
import PreviewPane from './components/PreviewPane.vue';
import SplitPane from './components/SplitPane.vue';
import SearchBar from './components/SearchBar.vue';
import SourceSearchBar from './components/SourceSearchBar.vue';
import TOCPanel from './components/TOCPanel.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import TemplateSelector from './components/TemplateSelector.vue';
import SnippetSelector from './components/SnippetSelector.vue';
import ProjectSearchPanel from './components/ProjectSearchPanel.vue';
import KeybindingManager from './components/KeybindingManager.vue';
import type { Template, Snippet } from './core/types';
import { TEMPLATE_CATEGORIES } from './core/template';
import { SNIPPET_CATEGORIES } from './core/snippet';
import { setSnippetSelectorOpener } from './extensions/slashCommands';
import { setPageIndex, setWikiLinkClickCallback, addPage } from './extensions/WikiLink';
import BacklinksPanel from './components/BacklinksPanel.vue';
import { useBacklinks } from './composables/useBacklinks';
import type { BacklinkInfo } from './composables/useBacklinks';

const { 
  onMessage, 
  notifyReady, 
  sendContentUpdate, 
  sendModeChanged, 
  sendImmediateSave, 
  isDark, 
  syncHistory,
  crashRecoveryData,
  historyExportedPath,
  requestSelectiveUndo,
  requestExportHistory,
  clearCrashRecoveryData,
  clearHistoryExportedPath,
  requestExport,
  userTemplates,
  userSnippets,
  loadUserTemplates,
  loadUserSnippets,
  saveAsTemplate,
  deleteTemplate,
  renameTemplate,
  saveAsSnippet,
  deleteSnippet,
  loadSnippetContent,
  handleWikiLinkClick
} = useVSCode();

// Project search composable
const {
  isSearching: isProjectSearching,
  query: projectQuery,
  results: projectResults,
  currentResultIndex: projectCurrentIndex,
  isRegex: projectIsRegex,
  error: projectError,
  search: projectSearch,
  nextResult: projectNextResult,
  previousResult: projectPreviousResult,
  goToResult: projectGoToResult,
  openCurrentResult: projectOpenResult,
  clearResults: projectClearResults,
  toggleRegex: projectToggleRegex,
} = useProjectSearch();

// Spell check composable
const {
  enabled: spellCheckEnabled,
  customDictionary,
  suggestions: spellCheckSuggestions,
  findMisspelledWords,
  setMisspelledWords,
  addToDictionary,
  setCurrentMisspelling,
  setSuggestions,
  requestWordSuggestions,
} = useSpellCheck();

// Spell check state for context menu
const showSpellCheckMenu = ref(false);
const spellCheckMenuPosition = ref({ x: 0, y: 0 });
const spellCheckWord = ref<string>('');

// Backlinks panel state
const showBacklinksPanel = ref(false);
const { setBacklinks, setCurrentPage, totalBacklinks } = useBacklinks();

// Shared history for cross-mode undo/redo
const sharedHistory = useSharedHistory();

const content = ref('');
const mode = ref<EditorMode>('wysiwyg');
const initialized = ref(false);
const isDirty = ref(false);
const readOnly = ref(false);
const settings = ref<HtmlySettings>({ showButtonLabels: true });
const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');
const modeOrder: EditorMode[] = ['wysiwyg', 'source', 'split', 'preview'];

// Previous mode for cursor preservation
const previousMode = ref<EditorMode | null>(null);
const savedCursorPosition = ref<number | null>(null);

// CodeEditor ref for cursor operations
const codeEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null);

const visualHtml = computed(() => extractBodyContent(content.value));

// Debounce content updates sent to extension
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let spellCheckDebounceTimer: ReturnType<typeof setTimeout> | null = null;
function onContentChange(newHtml: string) {
  content.value = newHtml;
  // Push to shared history for cross-mode undo
  sharedHistory.push(newHtml, calculateCursorPercentage());
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    sendContentUpdate(newHtml);
  }, 300);
  
  // Update spell check decorations with debounce
  if (spellCheckEnabled.value) {
    if (spellCheckDebounceTimer) clearTimeout(spellCheckDebounceTimer);
    spellCheckDebounceTimer = setTimeout(() => {
      updateSpellCheckDecorations(newHtml);
    }, 500);
  }
}

// Update spell check decorations in both editors
function updateSpellCheckDecorations(html: string) {
  const misspelledWords = findMisspelledWords(html);
  
  if (mode.value === 'wysiwyg' && tiptapRef.value) {
    // Convert HTML positions to text positions for Tiptap
    const marks = misspelledWords.map(w => ({
      from: w.start,
      to: w.end,
      word: w.word,
    }));
    tiptapRef.value.setMisspelledWords(marks);
  } else if (mode.value === 'source' && codeEditorRef.value) {
    // For source mode, find misspelled words in the raw HTML text
    const text = extractBodyContent(html);
    const marks = misspelledWords.map(w => ({
      from: w.start,
      to: w.end,
      word: w.word,
    }));
    codeEditorRef.value.setMisspelled(marks);
  }
}

// Handle spell check word click
function onSpellCheckWordClick(word: string, position: { from: number; to: number }) {
  spellCheckWord.value = word;
  setCurrentMisspelling(word);
  requestWordSuggestions(word);
  // Position will be set by the menu handler
}

// Handle spell check add to dictionary
function onSpellCheckAddToDictionary(word: string) {
  addToDictionary(word);
  // Update decorations to remove the word
  if (spellCheckEnabled.value) {
    updateSpellCheckDecorations(content.value);
  }
}

// Apply spell check suggestion
function applySpellCheckSuggestion(replacement: string) {
  if (!spellCheckWord.value) return;
  
  const html = content.value;
  const newHtml = html.replace(
    new RegExp(`\\b${spellCheckWord.value}\\b`, 'gi'),
    (match) => {
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    }
  );
  
  onContentChange(newHtml);
  showSpellCheckMenu.value = false;
}

// Calculate cursor position as percentage (0-1) across all modes
function calculateCursorPercentage(): number {
  if (!content.value) return 0;
  
  if (mode.value === 'wysiwyg' && tiptapRef.value?.editor) {
    const editor = tiptapRef.value.editor;
    const { from } = editor.state.selection;
    const docSize = editor.state.doc.content.size;
    return docSize > 0 ? from / docSize : 0;
  }
  
  if (mode.value === 'source' && codeEditorRef.value) {
    const pos = codeEditorRef.value.getCursorPosition();
    return pos.percentage;
  }
  
  return savedCursorPosition.value ?? 0;
}

// Convert cursor percentage to Tiptap-compatible position
function percentageToTiptapCursor(percentage: number): CursorPosition {
  if (!content.value) {
    return { percentage: 0, offset: 0, blockIndex: 0, totalBlocks: 1 };
  }
  
  // For visual mode, we need to estimate block positions
  const bodyContent = extractBodyContent(content.value);
  const blocks = bodyContent.split(/(?=<(?:p|h[1-6]|ul|ol|blockquote|pre|div|table|details))/g);
  const totalBlocks = blocks.length || 1;
  const targetBlockIndex = Math.floor(percentage * totalBlocks);
  
  return {
    percentage,
    offset: Math.round(percentage * bodyContent.length),
    blockIndex: Math.min(targetBlockIndex, totalBlocks - 1),
    totalBlocks,
  };
}

// Convert cursor percentage to CodeEditor position
function percentageToCodeCursor(percentage: number): CodeEditorCursorPosition {
  if (!content.value) {
    return { percentage: 0, offset: 0, line: 1, totalLines: 1 };
  }
  
  const lines = content.value.split('\n');
  const totalLines = lines.length || 1;
  const targetLine = Math.ceil(percentage * totalLines);
  
  // Calculate offset by counting characters up to target line
  let offset = 0;
  for (let i = 0; i < Math.min(targetLine - 1, lines.length); i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  
  return {
    percentage,
    offset: Math.round(percentage * content.value.length),
    line: Math.min(targetLine, totalLines),
    totalLines,
  };
}

// Handle mode switch with cursor preservation
function switchModeWithCursorPreservation(next: EditorMode) {
  // Save current cursor position before switching
  if (mode.value === 'wysiwyg' && tiptapRef.value?.editor) {
    savedCursorPosition.value = calculateCursorPercentage();
  } else if (mode.value === 'source' && codeEditorRef.value) {
    savedCursorPosition.value = codeEditorRef.value.getCursorPosition().percentage;
  }
  
  previousMode.value = mode.value;
  setMode(next);
  
  // Restore cursor position after mode switch (deferred to allow component mount)
  nextTick(() => {
    if (savedCursorPosition.value !== null) {
      if (next === 'wysiwyg' && tiptapRef.value?.editor) {
        // Tiptap cursor restoration is handled via percentage-based positioning
        cursorPosition.value = percentageToTiptapCursor(savedCursorPosition.value);
      } else if (next === 'source' && codeEditorRef.value) {
        // Restore cursor in CodeEditor
        codeEditorRef.value.setContent(content.value, savedCursorPosition.value);
      }
    }
  });
}

function setMode(next: EditorMode) {
  if (readOnly.value && next !== 'source') return;
  mode.value = next;
  sendModeChanged(next);
}

function cycleMode() {
  const currentIndex = modeOrder.indexOf(mode.value);
  const next = modeOrder[(currentIndex + 1) % modeOrder.length];
  switchModeWithCursorPreservation(next);
}

function onVisualContentChange(bodyHtml: string) {
  const newContent = replaceBodyContent(content.value, bodyHtml);
  onContentChange(newContent);
  
  // In split mode, sync is automatic via content prop
  // In preview mode, PreviewPane handles debounced updates
}

const tiptapRef = ref<InstanceType<typeof TiptapEditor> | null>(null);
const showSearch = ref(false);
const showSourceSearch = ref(false);
const showProjectSearch = ref(false);
const showTOC = ref(false);
const showHistoryPanel = ref(false);
const showTemplateSelector = ref(false);
const showSnippetSelector = ref(false);
const showCrashRecoveryDialog = ref(false);
const showKeybindingManager = ref(false);
const keybindingsList = ref<import('../../src/shared/types').KeybindingCommand[]>([]);

// Save template dialog state
const showSaveTemplateDialog = ref(false);
const saveTemplateName = ref('');
const saveTemplateCategory = ref<TemplateCategory>('docs');
const saveTemplateDescription = ref('');

// Cursor position for scroll sync
const cursorPosition = ref<CursorPosition | null>(null);

// Track cursor position changes from TiptapEditor
function onCursorPositionUpdate(position: CursorPosition) {
  cursorPosition.value = position;
  // Also update saved position for cross-mode preservation
  savedCursorPosition.value = position.percentage;
}

// Track cursor position changes from CodeEditor
function onSourceCursorChange(position: CodeEditorCursorPosition) {
  savedCursorPosition.value = position.percentage;
}

function toggleTOC() {
  showTOC.value = !showTOC.value;
}

// Backlinks panel functions
function toggleBacklinksPanel() {
  showBacklinksPanel.value = !showBacklinksPanel.value;
  // When opening the panel, we need to extract the current page name from the document
  if (showBacklinksPanel.value) {
    updateCurrentPageForBacklinks();
  }
}

function updateCurrentPageForBacklinks() {
  // Extract page name from document title or first heading
  const bodyMatch = content.value.match(/<title>([^<]*)<\/title>/i);
  const pageName = bodyMatch ? bodyMatch[1].trim() : '';
  
  if (pageName) {
    setCurrentPage(pageName);
  }
}

function handleOpenBacklink(pageName: string, pagePath?: string) {
  // Send message to extension to open the page
  postMessage({ type: 'openFile', filePath: pagePath || `${pageName}.html` });
  showBacklinksPanel.value = false;
}

// Format painter state
const formatPainterActive = ref(false);
const formatPainterMultiUse = ref(false);

interface FormatPainterState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  highlight: boolean;
  link: { href: string } | null;
  textColor: string | null;
  textAlign: 'left' | 'center' | 'right' | null;
}

const formatPainterState = ref<FormatPainterState | null>(null);

function activateFormatPainter(multiUse: boolean) {
  if (!tiptapRef.value?.editor) return;
  
  const editor = tiptapRef.value.editor;
  const state = editor.state;
  const { from, to } = state.selection;
  
  // Capture formatting at current selection
  const marks = state.doc.resolve(from).marks();
  const linkMark = marks.find(m => m.type.name === 'link');
  
  formatPainterState.value = {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    code: editor.isActive('code'),
    highlight: editor.isActive('highlight'),
    link: linkMark ? { href: linkMark.attrs.href } : null,
    textColor: editor.getAttributes('textStyle').color ?? null,
    textAlign: editor.isActive({ textAlign: 'left' }) ? 'left' 
             : editor.isActive({ textAlign: 'center' }) ? 'center'
             : editor.isActive({ textAlign: 'right' }) ? 'right'
             : null,
  };
  
  formatPainterMultiUse.value = multiUse;
  formatPainterActive.value = true;
}

function deactivateFormatPainter() {
  formatPainterActive.value = false;
  formatPainterMultiUse.value = false;
  formatPainterState.value = null;
}

function onFormatPainterApplied() {
  // If not multi-use mode, deactivate after applying
  if (!formatPainterMultiUse.value) {
    deactivateFormatPainter();
  }
}

// History panel functions
function toggleHistoryPanel() {
  showHistoryPanel.value = !showHistoryPanel.value;
}

function handleHistorySelect(index: number) {
  // Restore to selected history position
  const restoredContent = sharedHistory.restoreToIndex(index);
  if (restoredContent !== null) {
    content.value = restoredContent;
  }
  showHistoryPanel.value = false;
}

function handleHistoryExport() {
  requestExportHistory();
}

// Template selector functions
function toggleTemplateSelector() {
  showTemplateSelector.value = !showTemplateSelector.value;
}

function handleTemplateSelect(template: Template) {
  // Extract body content from the template HTML
  const bodyMatch = template.content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : template.content;
  
  // Replace the current document content with the template
  const newContent = replaceBodyContent(content.value, bodyContent);
  onContentChange(newContent);
  
  // Switch to WYSIWYG mode to show the template
  if (mode.value !== 'wysiwyg') {
    setMode('wysiwyg');
  }
  
  showTemplateSelector.value = false;
}

// Handle save as template request from template selector
function handleSaveAsTemplateRequest(options: { name: string; category: TemplateCategory; description?: string }) {
  saveTemplateName.value = options.name;
  saveTemplateCategory.value = options.category;
  saveTemplateDescription.value = options.description || '';
  showSaveTemplateDialog.value = true;
  showTemplateSelector.value = false;
}

// Confirm save template
function confirmSaveTemplate() {
  if (saveTemplateName.value.trim()) {
    // Get body content from the document
    const bodyContent = extractBodyContent(content.value);
    
    saveAsTemplate({
      name: saveTemplateName.value.trim(),
      category: saveTemplateCategory.value,
      content: bodyContent,
      description: saveTemplateDescription.value.trim() || undefined,
    });
    
    showSaveTemplateDialog.value = false;
    saveTemplateName.value = '';
    saveTemplateDescription.value = '';
  }
}

// Cancel save template
function cancelSaveTemplate() {
  showSaveTemplateDialog.value = false;
  saveTemplateName.value = '';
  saveTemplateDescription.value = '';
}

// Snippet selector functions
function toggleSnippetSelector() {
  showSnippetSelector.value = !showSnippetSelector.value;
}

function handleSnippetSelect(snippet: Snippet) {
  // Check if this is a built-in snippet (has full HTML) or a user snippet (needs content fetch)
  const isBuiltIn = snippet.html && snippet.html.length > 0;
  
  if (isBuiltIn) {
    // Built-in snippet: insert directly
    insertSnippetContent(snippet.html);
    showSnippetSelector.value = false;
  } else {
    // User snippet: need to fetch content from extension
    const userSnippet = userSnippets.value.find(s => s.id === snippet.id);
    if (!userSnippet) {
      console.error('User snippet not found:', snippet.id);
      showSnippetSelector.value = false;
      return;
    }
    
    // Register callback for the response
    snippetContentCallbacks.set(snippet.id, {
      success: (content: string) => {
        insertSnippetContent(content);
        showSnippetSelector.value = false;
      },
      error: (error: string) => {
        console.error('Failed to load snippet content:', error);
        showSnippetSelector.value = false;
      }
    });
    
    // Request the content from extension
    loadSnippetContent(snippet.id);
  }
}

// Insert snippet content at current cursor position
function insertSnippetContent(html: string) {
  if (tiptapRef.value?.editor) {
    const editor = tiptapRef.value.editor;
    editor.chain().focus().insertContent(html).run();
  }
}

function handleSaveAsSnippetRequest(options: { name: string; category: SnippetCategory; html: string; description?: string }) {
  // Save the snippet
  saveAsSnippet({
    name: options.name,
    category: options.category,
    html: options.html,
    description: options.description
  });
  showSnippetSelector.value = false;
}

// Handle delete snippet
function handleDeleteSnippet(id: string) {
  deleteSnippet(id);
}

// Export handler
function handleExportRequest(format: 'pdf' | 'markdown' | 'plaintext' | 'embedded', options?: import('../../src/shared/types').PdfExportOptions) {
  if (format === 'pdf') {
    // PDF export with options
    if (options) {
      applyPdfExportOptions(options);
    }
    // PDF export is handled directly in the webview using window.print()
    // The print CSS in global.css hides the editor UI and shows clean document
    window.print();
    return;
  }
  // Get the full HTML content for export
  requestExport(format, content.value);
}

// Store print media query and cleanup handler for proper cleanup
const printMediaQuery = ref<MediaQueryList | null>(null);
const printCleanupHandler = ref<(() => void) | null>(null);

// Apply PDF export options to the document for printing
function applyPdfExportOptions(options: import('../../src/shared/types').PdfExportOptions): void {
  const body = document.body;
  
  // Remove any existing print elements
  const existingElements = body.querySelectorAll('.print-header, .print-footer, .print-page-number');
  existingElements.forEach(el => el.remove());
  
  // Remove existing classes
  body.classList.remove('show-page-numbers', 'print-has-header', 'print-has-footer');
  
  // Apply page numbers
  if (options.includePageNumbers) {
    body.classList.add('show-page-numbers');
    const pageNumberEl = document.createElement('div');
    pageNumberEl.className = 'print-page-number';
    pageNumberEl.textContent = `Page {page} of {total}`;
    body.appendChild(pageNumberEl);
  }
  
  // Apply header text
  if (options.headerText && options.headerText.trim()) {
    body.classList.add('print-has-header');
    const headerEl = document.createElement('div');
    headerEl.className = 'print-header';
    headerEl.textContent = options.headerText;
    body.appendChild(headerEl);
  }
  
  // Apply footer text (supports {page} and {total} placeholders)
  if (options.footerText && options.footerText.trim()) {
    body.classList.add('print-has-footer');
    const footerEl = document.createElement('div');
    footerEl.className = 'print-footer';
    
    // Replace placeholders with actual page numbers
    footerEl.textContent = options.footerText
      .replace('{page}', '<span class="page-number"></span>')
      .replace('{total}', '<span class="total-pages"></span>');
    
    body.appendChild(footerEl);
  }
  
  // Clean up after print is done (when printing dialog closes)
  // First, remove any existing listener to prevent memory leaks
  if (printMediaQuery.value && printCleanupHandler.value) {
    printMediaQuery.value.removeEventListener('change', printCleanupHandler.value);
  }
  
  const mediaQuery = window.matchMedia('print');
  const cleanupHandler = () => {
    // Remove print elements
    const elements = document.body.querySelectorAll('.print-header, .print-footer, .print-page-number');
    elements.forEach(el => el.remove());
    document.body.classList.remove('show-page-numbers', 'print-has-header', 'print-has-footer');
    mediaQuery.removeEventListener('change', cleanupHandler);
    // Clear stored references after cleanup
    printMediaQuery.value = null;
    printCleanupHandler.value = null;
  };
  
  // Store references for cleanup in onBeforeUnmount
  printMediaQuery.value = mediaQuery;
  printCleanupHandler.value = cleanupHandler;
  
  mediaQuery.addEventListener('change', cleanupHandler);
}

// Crash recovery functions
function handleRecoverDraft() {
  if (crashRecoveryData.value) {
    // Initialize history from recovered state
    sharedHistory.initializeFromPersisted(crashRecoveryData.value.history);
    // Set content to the last known content
    content.value = crashRecoveryData.value.history.entries[crashRecoveryData.value.history.currentIndex]?.content 
      || crashRecoveryData.value.lastContent;
    showCrashRecoveryDialog.value = false;
    clearCrashRecoveryData();
  }
}

function handleDiscardDraft() {
  showCrashRecoveryDialog.value = false;
  clearCrashRecoveryData();
}

// Close search bar and format painter when mode changes
watch(mode, () => { 
  showSearch.value = false;
  showSourceSearch.value = false;
  deactivateFormatPainter();
});

// Ctrl+F / Cmd+F toggles search bar in WYSIWYG and Source modes
// Escape deactivates format painter
// Ctrl+S / Cmd+S triggers immediate save
// Ctrl+T toggles template selector
function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    if (mode.value === 'wysiwyg') {
      showSearch.value = !showSearch.value;
    } else if (mode.value === 'source') {
      showSourceSearch.value = !showSourceSearch.value;
    }
  }
  
  if (e.key === 'Escape' && formatPainterActive.value) {
    deactivateFormatPainter();
  }
  
  // Ctrl+Z / Cmd+Z - Cross-mode undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    const prevContent = sharedHistory.undo(content.value);
    if (prevContent !== null) {
      content.value = prevContent;
    }
  }
  
  // Ctrl+Shift+Z / Cmd+Shift+Z - Cross-mode redo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
    e.preventDefault();
    const nextContent = sharedHistory.redo(content.value);
    if (nextContent !== null) {
      content.value = nextContent;
    }
  }

  // Ctrl+S / Cmd+S - Manual save (bypasses debounce)
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    // Cancel any pending debounced save and trigger immediate save
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    sendImmediateSave(content.value);
    // Update status to show saving
    saveStatus.value = 'saving';
  }

  // Ctrl+T / Cmd+T - Toggle template selector
  if ((e.ctrlKey || e.metaKey) && e.key === 't') {
    e.preventDefault();
    toggleTemplateSelector();
  }

  // Ctrl+Shift+F / Cmd+Shift+F - Project-wide search
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    showProjectSearch.value = !showProjectSearch.value;
  }

  // Escape - Close project search panel
  if (e.key === 'Escape' && showProjectSearch.value) {
    e.preventDefault();
    showProjectSearch.value = false;
    projectClearResults();
  }
}

// Register message handler
const unsubscribe = onMessage((msg) => {
  switch (msg.type) {
    case 'init':
      content.value = msg.content;
      mode.value = msg.mode;
      initialized.value = true;
      // Initialize shared history with initial content
      sharedHistory.initialize(msg.content);
      break;

    case 'contentChanged':
      // External file change (e.g. git checkout) — cancel any pending
      // debounced contentUpdate to avoid echoing stale content back.
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      content.value = msg.content;
      // Re-initialize history with new content
      sharedHistory.initialize(msg.content);
      break;

    case 'setMode':
      switchModeWithCursorPreservation(msg.mode);
      break;

    case 'cycleMode':
      cycleMode();
      break;

    case 'theme':
      isDark.value = msg.isDark;
      break;

    case 'dirty':
      isDirty.value = msg.isDirty;
      break;

    case 'saveStatus':
      saveStatus.value = msg.status;
      break;

    case 'readOnly':
      readOnly.value = msg.enabled;
      if (msg.enabled) {
        mode.value = 'source';
        sendModeChanged('source');
      }
      break;

    case 'settings':
      settings.value = msg.settings;
      break;

    case 'crashRecovery':
      // Store crash recovery data and show dialog
      crashRecoveryData.value = msg.data;
      showCrashRecoveryDialog.value = true;
      break;

    case 'historyUpdate':
      // Update history from extension (e.g., after selective undo)
      // The webview state should already be updated, this is for confirmation
      break;

    case 'historyExported':
      // Show notification that history was exported
      historyExportedPath.value = msg.path;
      setTimeout(() => {
        clearHistoryExportedPath();
      }, 5000);
      break;

    case 'userTemplates':
      // Update user templates list
      userTemplates.value = msg.templates;
      break;

    case 'saveTemplateResponse':
      if (msg.success) {
        // Refresh user templates list
        loadUserTemplates();
      }
      break;

    case 'deleteTemplateResponse':
      if (msg.success) {
        // Refresh user templates list
        loadUserTemplates();
      }
      break;

    case 'renameTemplateResponse':
      if (msg.success) {
        // Refresh user templates list
        loadUserTemplates();
      }
      break;

    case 'userSnippets':
      // Update user snippets list
      userSnippets.value = msg.snippets;
      break;

    case 'saveSnippetResponse':
      if (msg.success) {
        // Refresh user snippets list
        loadUserSnippets();
      }
      break;

    case 'deleteSnippetResponse':
      if (msg.success) {
        // Refresh user snippets list
        loadUserSnippets();
      }
      break;

    case 'snippetContentResponse':
      // Handle snippet content loaded from extension
      if (snippetContentCallbacks.has(msg.id)) {
        const callback = snippetContentCallbacks.get(msg.id)!;
        snippetContentCallbacks.delete(msg.id);
        if (msg.success && msg.content !== undefined) {
          callback.success(msg.content);
        } else {
          callback.error(msg.error || 'Failed to load snippet content');
        }
      }
      break;

    case 'showProjectSearch':
      // Show project search panel when command is triggered
      showProjectSearch.value = true;
      break;
    case 'keybindingManager':
      // Show keybinding manager when command is triggered
      showKeybindingManager.value = true;
      break;
    case 'keybindingsList':
      // Store keybindings list for the keybinding manager
      keybindingsList.value = msg.commands;
      break;

    case 'wikiPages':
      // Update the wiki link page index for autocomplete
      setPageIndex(msg.pages);
      break;

    case 'backlinks':
      // Update backlinks for the current page
      setCurrentPage(msg.pageName);
      setBacklinks(msg.backlinks);
      break;

    case 'pageCreated':
      // A new page was created - add it to the page index
      addPage({ name: msg.pageName, path: msg.pagePath });
      // Update the wiki link in the document to reflect the new page path
      // The wiki link already exists in the document with data-page attribute,
      // and the href will now work since the page exists
      break;
  }
});

onMounted(() => {
  notifyReady();
  document.addEventListener('keydown', onGlobalKeydown);

  // Set up snippet selector opener for slash commands
  setSnippetSelectorOpener(() => {
    // Load user snippets when opening the selector
    loadUserSnippets();
    showSnippetSelector.value = true;
  });

  // Set up wiki link click handler
  setWikiLinkClickCallback((pageName: string, existingPages: string[]) => {
    handleWikiLinkClick(pageName, existingPages);
  });

  // Also load user snippets on init for potential use
  loadUserSnippets();

  // Set up history sync with extension
  const unsubscribeHistory = onHistoryChange((state) => {
    syncHistory(state);
  });
  
  // Store unsubscribe for cleanup
  historyUnsubscribe.value = unsubscribeHistory;
});

const historyUnsubscribe = ref<(() => void) | null>(null);

// Callbacks for pending snippet content requests
const snippetContentCallbacks = new Map<string, {
  success: (content: string) => void;
  error: (error: string) => void;
}>();

onBeforeUnmount(() => {
  unsubscribe();
  document.removeEventListener('keydown', onGlobalKeydown);
  if (debounceTimer) clearTimeout(debounceTimer);
  if (historyUnsubscribe.value) {
    historyUnsubscribe.value();
  }
  // Clean up print event listener to prevent memory leaks
  if (printMediaQuery.value && printCleanupHandler.value) {
    printMediaQuery.value.removeEventListener('change', printCleanupHandler.value);
    printMediaQuery.value = null;
    printCleanupHandler.value = null;
  }
});


</script>

<template>
  <div class="app" :class="{ dark: isDark, light: !isDark }">
    <Toolbar
      :editor="tiptapRef?.editor"
      :mode="mode"
      :dirty="isDirty"
      :read-only="readOnly"
      :show-button-labels="settings.showButtonLabels"
      :auto-hide-toolbar-in-preview="settings.autoHideToolbarInPreview"
      :format-painter-active="formatPainterActive"
      :show-toc="showTOC"
      :show-history="showHistoryPanel"
      :show-backlinks="showBacklinksPanel"
      :save-status="saveStatus"
      @set-mode="setMode"
      @activate-format-painter="activateFormatPainter"
      @toggle-toc="toggleTOC"
      @toggle-history="toggleHistoryPanel"
      @toggle-backlinks="toggleBacklinksPanel"
      @toggle-template="toggleTemplateSelector"
      @open-cover-dialog="tiptapRef?.openCoverImageDialog()"
      @export-request="handleExportRequest"
    />

    <div v-if="initialized" :key="mode" class="editor-area">
      <div v-if="readOnly" class="large-file-banner">
        Large file — Source-only mode (WYSIWYG disabled for files over 500 KB)
      </div>
      <SearchBar
        v-if="mode === 'wysiwyg'"
        :editor="tiptapRef?.editor"
        :visible="showSearch"
        @close="showSearch = false"
      />
      <SourceSearchBar
        v-if="mode === 'source'"
        :editor-view="codeEditorRef?.getEditorView()"
        :visible="showSourceSearch"
        @close="showSourceSearch = false"
      />
      <TiptapEditor
        v-if="mode === 'wysiwyg'"
        ref="tiptapRef"
        :model-value="visualHtml"
        :enable-markdown-shortcuts="settings.enableMarkdownShortcuts"
        :format-painter-active="formatPainterActive"
        :format-painter-state="formatPainterState"
        :cursor-position="cursorPosition"
        :cloud-storage-config="settings.cloudStorage"
        :spell-check-enabled="spellCheckEnabled"
        :custom-dictionary="customDictionary"
        @update:model-value="onVisualContentChange"
        @format-painter-applied="onFormatPainterApplied"
        @cursor-position-update="onCursorPositionUpdate"
        @spell-check-word-click="onSpellCheckWordClick"
        @spell-check-add-to-dictionary="onSpellCheckAddToDictionary"
      />
      <SplitPane
        v-else-if="mode === 'split'"
        :content="content"
        :is-dark="isDark"
        :split-direction="settings.splitScreenDirection"
        :cursor-position="cursorPosition"
        @update:content="onContentChange"
      />
      <CodeEditor
        v-else-if="mode === 'source'"
        ref="codeEditorRef"
        :model-value="content"
        :is-dark="isDark"
        :spell-check-enabled="spellCheckEnabled"
        :custom-dictionary="customDictionary"
        @update:model-value="onContentChange"
        @cursor-change="onSourceCursorChange"
        @spell-check-word-click="onSpellCheckWordClick"
        @spell-check-add-to-dictionary="onSpellCheckAddToDictionary"
      />
      <PreviewPane
        v-else
        :html="content"
        :cursor-position="cursorPosition"
      />
    </div>

    <div class="loading" v-else>Loading…</div>

    <!-- Table of Contents Panel -->
    <TOCPanel
      v-if="showTOC && mode === 'wysiwyg'"
      :editor="tiptapRef?.editor"
    />

    <!-- History Panel -->
    <HistoryPanel
      v-if="showHistoryPanel"
      :entries="sharedHistory.allEntries.value"
      :visible="showHistoryPanel"
      @close="showHistoryPanel = false"
      @select="handleHistorySelect"
      @export="handleHistoryExport"
    />

    <!-- Backlinks Panel -->
    <BacklinksPanel
      :visible="showBacklinksPanel"
      @close="showBacklinksPanel = false"
      @open-page="handleOpenBacklink"
    />

    <!-- Template Selector -->
    <TemplateSelector
      :visible="showTemplateSelector"
      :current-content="content"
      @select="handleTemplateSelect"
      @cancel="showTemplateSelector = false"
      @save-as-template="handleSaveAsTemplateRequest"
    />

    <!-- Snippet Selector -->
    <SnippetSelector
      :visible="showSnippetSelector"
      :current-content="content"
      :user-snippets="userSnippets"
      @select="handleSnippetSelect"
      @cancel="showSnippetSelector = false"
      @save-as-snippet="handleSaveAsSnippetRequest"
      @delete-snippet="handleDeleteSnippet"
    />

    <!-- Save Template Dialog -->
    <div v-if="showSaveTemplateDialog" class="save-template-overlay" @click.self="cancelSaveTemplate">
      <div class="save-template-dialog">
        <div class="dialog-header">
          <span class="dialog-icon">📄</span>
          <span class="dialog-title">Save as Template</span>
        </div>
        <div class="dialog-body">
          <label class="input-label">
            Template Name
            <input
              type="text"
              class="input-field"
              v-model="saveTemplateName"
              @keydown.enter="confirmSaveTemplate"
              @keydown.escape="cancelSaveTemplate"
              autofocus
              placeholder="My Template"
            />
          </label>
          <label class="input-label">
            Category
            <select class="input-field" v-model="saveTemplateCategory">
              <option v-for="(label, key) in TEMPLATE_CATEGORIES" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </label>
          <label class="input-label">
            Description (optional)
            <textarea
              class="input-field textarea"
              v-model="saveTemplateDescription"
              rows="3"
              placeholder="Describe your template..."
            ></textarea>
          </label>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="cancelSaveTemplate">Cancel</button>
          <button class="btn btn-primary" @click="confirmSaveTemplate" :disabled="!saveTemplateName.trim()">
            Save Template
          </button>
        </div>
      </div>
    </div>

    <!-- Crash Recovery Dialog -->
    <div v-if="showCrashRecoveryDialog" class="crash-recovery-overlay" @click.self="handleDiscardDraft">
      <div class="crash-recovery-dialog">
        <div class="dialog-header">
          <span class="dialog-icon">💾</span>
          <span class="dialog-title">Recover Draft?</span>
        </div>
        <div class="dialog-body">
          <p>A previous editing session crashed. Would you like to recover your unsaved work?</p>
          <p class="dialog-info" v-if="crashRecoveryData">
            {{ crashRecoveryData.history.entries.length }} history steps available
          </p>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary" @click="handleRecoverDraft">
            Recover Draft
          </button>
          <button class="btn btn-secondary" @click="handleDiscardDraft">
            Discard
          </button>
        </div>
      </div>
    </div>

    <!-- History Exported Notification -->
    <div v-if="historyExportedPath" class="export-notification">
      <span>History exported to:</span>
      <code>{{ historyExportedPath }}</code>
    </div>

    <!-- Project Search Panel -->
    <ProjectSearchPanel
      :visible="showProjectSearch"
      :is-searching="isProjectSearching"
      :results="projectResults"
      :current-result-index="projectCurrentIndex"
      :query="projectQuery"
      :is-regex="projectIsRegex"
      :error="projectError"
      @close="showProjectSearch = false; projectClearResults()"
      @search="projectSearch"
      @next="projectNextResult"
      @previous="projectPreviousResult"
      @open-result="projectGoToResult"
      @toggle-regex="projectToggleRegex"
    />
    <!-- Keybinding Manager -->
    <KeybindingManager
      :visible="showKeybindingManager"
      @close="showKeybindingManager = false"
    />
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

.large-file-banner {
  padding: 6px 12px;
  font-size: 12px;
  background: var(--vscode-editorWarning-foreground, #cca700);
  color: #1e1e1e;
  text-align: center;
  flex-shrink: 0;
}

/* Crash Recovery Dialog */
.crash-recovery-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.crash-recovery-dialog {
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-widget-border, #3c3c3c);
  border-radius: 8px;
  padding: 20px;
  max-width: 400px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.dialog-icon {
  font-size: 24px;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-editor-foreground, #cccccc);
}

.dialog-body {
  margin-bottom: 20px;
}

.dialog-body p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--vscode-editor-foreground, #cccccc);
  line-height: 1.5;
}

.dialog-info {
  font-size: 12px;
  color: var(--vscode-descriptionForeground, #858585);
}

.dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
}

.btn-primary:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}

.btn-secondary {
  background: var(--vscode-toolbar-hoverBackground, #2d2d2d);
  color: var(--vscode-editor-foreground, #cccccc);
  border: 1px solid var(--vscode-widget-border, #3c3c3c);
}

.btn-secondary:hover {
  background: var(--vscode-toolbar-hoverBackground, #3d3d3d);
}

/* Export Notification */
.export-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-widget-border, #3c3c3c);
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 12px;
  color: var(--vscode-editor-foreground, #cccccc);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  max-width: 400px;
}

.export-notification span {
  display: block;
  margin-bottom: 4px;
  color: var(--vscode-descriptionForeground, #858585);
}

.export-notification code {
  display: block;
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 11px;
  word-break: break-all;
}

/* Save Template Dialog */
.save-template-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.save-template-dialog {
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-widget-border, #3c3c3c);
  border-radius: 8px;
  padding: 20px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.input-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--vscode-editor-foreground, #cccccc);
  margin-bottom: 12px;
}

.input-field {
  background: var(--vscode-input-background, #3c3c3c);
  border: 1px solid var(--vscode-input-border, #3c3c3c);
  border-radius: 4px;
  padding: 8px 10px;
  color: var(--vscode-input-foreground, #cccccc);
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.input-field:focus {
  border-color: var(--vscode-focusBorder, #007acc);
}

.input-field.textarea {
  resize: vertical;
  min-height: 60px;
}

select.input-field {
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
