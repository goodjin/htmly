/**
 * Spell Check Composable
 * Manages spell check integration with VS Code's built-in spell checker
 * and custom dictionary support
 */
import { ref, watch } from 'vue';
import { useVSCode } from './useVSCode';

export interface SpellCheckState {
  enabled: boolean;
  customDictionary: string[];
  suggestions: SpellSuggestion[];
}

export interface SpellSuggestion {
  word: string;
  replacements: string[];
}

export interface MisspelledWordPosition {
  word: string;
  start: number;
  end: number;
}

// Common words for suggestions
const COMMON_WORDS = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
];

/**
 * Hook to manage spell check functionality
 */
export function useSpellCheck() {
  const { onMessage, postMessage } = useVSCode();

  // State
  const enabled = ref(true);
  const customDictionary = ref<string[]>([]);
  const suggestions = ref<SpellSuggestion[]>([]);
  const currentMisspelling = ref<string | null>(null);
  const misspelledWords = ref<MisspelledWordPosition[]>([]);

  // Spell check state
  const isChecking = ref(false);
  const lastCheckedText = ref<string>('');

  /**
   * Initialize spell check from settings
   */
  function initialize(settings: { spellCheckEnabled?: boolean; customDictionary?: string[] }) {
    enabled.value = settings.spellCheckEnabled ?? true;
    customDictionary.value = settings.customDictionary ?? [];
  }

  /**
   * Add a word to the custom dictionary
   */
  function addToDictionary(word: string): void {
    const normalizedWord = word.toLowerCase().trim();
    if (normalizedWord && !customDictionary.value.includes(normalizedWord)) {
      customDictionary.value = [...customDictionary.value, normalizedWord];
      // Remove the word from misspelled words
      misspelledWords.value = misspelledWords.value.filter(m => m.word.toLowerCase() !== normalizedWord);
      // Notify extension to persist the dictionary
      postMessage({
        type: 'addToSpellDictionary',
        word: normalizedWord,
      });
    }
  }

  /**
   * Remove a word from the custom dictionary
   */
  function removeFromDictionary(word: string): void {
    const normalizedWord = word.toLowerCase().trim();
    customDictionary.value = customDictionary.value.filter(w => w !== normalizedWord);
    // Notify extension to persist the change
    postMessage({
      type: 'removeFromSpellDictionary',
      word: normalizedWord,
    });
  }

  /**
   * Check if a word is in the custom dictionary
   */
  function isInDictionary(word: string): boolean {
    return customDictionary.value.includes(word.toLowerCase().trim());
  }

  /**
   * Get spell check state for settings
   */
  function getSettings(): { spellCheckEnabled: boolean; customDictionary: string[] } {
    return {
      spellCheckEnabled: enabled.value,
      customDictionary: customDictionary.value,
    };
  }

  /**
   * Set spell check enabled/disabled
   */
  function setEnabled(value: boolean): void {
    enabled.value = value;
    postMessage({
      type: 'setSpellCheckEnabled',
      enabled: value,
    });
  }

  /**
   * Extract text content from HTML for spell checking
   * This is used to provide text to VS Code's spell checker
   */
  function extractTextForSpellCheck(html: string): string {
    // Remove HTML tags but keep text content
    const text = html
      // Remove script and style elements
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Remove all HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  }

  /**
   * Get words from text with their positions
   */
  function getWordsWithPositions(text: string): { word: string; start: number; end: number }[] {
    const results: { word: string; start: number; end: number }[] = [];
    // Match words (letters and apostrophes)
    const wordRegex = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      if (match[0].length >= 3) {
        results.push({
          word: match[0],
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }

    return results;
  }

  /**
   * Get words from text that might be misspelled
   */
  function getWordsFromText(text: string): string[] {
    const words = getWordsWithPositions(text);
    return words.map(w => w.word);
  }

  /**
   * Find misspelled words with their positions in plain text
   * Uses a simplified dictionary-based approach
   */
  function findMisspelledWordsInText(text: string): { word: string; start: number; end: number }[] {
    const words = getWordsWithPositions(text);
    
    return words.filter(({ word }) => {
      const lowerWord = word.toLowerCase();
      // Skip if in custom dictionary
      if (isInDictionary(lowerWord)) return false;
      // Skip if it's a common word
      if (COMMON_WORDS.includes(lowerWord)) return false;
      return true;
    });
  }

  /**
   * Check spelling of text content
   * Returns list of potentially misspelled words
   */
  function checkSpelling(html: string): string[] {
    const text = extractTextForSpellCheck(html);
    const words = getWordsFromText(text);
    
    // Filter out words in custom dictionary and common words
    const potentiallyMisspelled = words.filter(word => {
      const lowerWord = word.toLowerCase();
      return !isInDictionary(lowerWord) && !COMMON_WORDS.includes(lowerWord);
    });
    
    return potentiallyMisspelled;
  }

  /**
   * Find misspelled words with positions for editor decorations
   * Returns positions relative to the plain text content
   */
  function findMisspelledWords(html: string): MisspelledWordPosition[] {
    const text = extractTextForSpellCheck(html);
    return findMisspelledWordsInText(text);
  }

  /**
   * Set misspelled words with positions (for decorations)
   */
  function setMisspelledWords(words: MisspelledWordPosition[]): void {
    misspelledWords.value = words;
  }

  /**
   * Set current misspelling (for context menu display)
   */
  function setCurrentMisspelling(word: string | null): void {
    currentMisspelling.value = word;
    if (word) {
      // Generate simple suggestions
      suggestions.value = [{
        word,
        replacements: generateSuggestions(word),
      }];
    } else {
      suggestions.value = [];
    }
  }

  /**
   * Set suggestions from external source (e.g., VS Code)
   */
  function setSuggestions(newSuggestions: SpellSuggestion[]): void {
    suggestions.value = newSuggestions;
  }

  /**
   * Generate spelling suggestions
   */
  function generateSuggestions(word: string): string[] {
    const result: string[] = [];
    const lowerWord = word.toLowerCase();

    // Find similar words from common words
    for (const common of COMMON_WORDS) {
      if (common.startsWith(lowerWord.slice(0, 2)) && common !== lowerWord) {
        if (levenshteinDistance(lowerWord, common) <= 2) {
          result.push(common);
        }
      }
    }

    // If no suggestions found, return a few similar common words
    if (result.length === 0) {
      for (const common of COMMON_WORDS) {
        if (common.startsWith(lowerWord[0]) && common !== lowerWord) {
          result.push(common);
          if (result.length >= 3) break;
        }
      }
    }

    return result.slice(0, 5);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Replace misspelled word with suggestion
   */
  function applySuggestion(original: string, replacement: string, html: string): string {
    // Case-insensitive replacement while preserving case
    const regex = new RegExp(`\\b${escapeRegExp(original)}\\b`, 'gi');
    return html.replace(regex, (match) => {
      if (match[0] === match[0].toUpperCase()) {
        // First letter uppercase - capitalize replacement
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }

  /**
   * Escape special regex characters in string
   */
  function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Request spell check for content
   */
  function requestSpellCheck(content: string): void {
    isChecking.value = true;
    postMessage({
      type: 'requestSpellCheck',
      content,
    });
  }

  /**
   * Request suggestions for a specific word
   */
  function requestWordSuggestions(word: string): void {
    postMessage({
      type: 'requestSpellCheckWord',
      word,
    });
  }

  // Listen for spell check related messages from extension
  onMessage((msg) => {
    switch (msg.type) {
      case 'spellCheckSettings':
        enabled.value = msg.enabled ?? true;
        customDictionary.value = msg.customDictionary ?? [];
        break;

      case 'spellCheckSuggestions':
        suggestions.value = msg.suggestions ?? [];
        break;

      case 'spellCheckWord':
        currentMisspelling.value = msg.word;
        suggestions.value = msg.suggestions 
          ? [{ word: msg.word, replacements: msg.suggestions }]
          : generateSuggestions(msg.word);
        break;

      case 'spellCheckMisspelledWords':
        misspelledWords.value = msg.words ?? [];
        isChecking.value = false;
        break;
    }
  });

  return {
    // State
    enabled,
    customDictionary,
    suggestions,
    currentMisspelling,
    misspelledWords,
    isChecking,

    // Methods
    initialize,
    addToDictionary,
    removeFromDictionary,
    isInDictionary,
    getSettings,
    setEnabled,
    extractTextForSpellCheck,
    getWordsFromText,
    checkSpelling,
    findMisspelledWords,
    findMisspelledWordsInText,
    setMisspelledWords,
    setCurrentMisspelling,
    setSuggestions,
    applySuggestion,
    generateSuggestions,
    requestSpellCheck,
    requestWordSuggestions,
  };
}
