import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSpellCheck } from './useSpellCheck';

// Mock the useVSCode composable
vi.mock('./useVSCode', () => ({
  useVSCode: () => ({
    onMessage: vi.fn(() => () => {}),
    postMessage: vi.fn(),
  }),
}));

describe('useSpellCheck', () => {
  let spellCheck: ReturnType<typeof useSpellCheck>;

  beforeEach(() => {
    spellCheck = useSpellCheck();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(spellCheck.enabled.value).toBe(true);
      expect(spellCheck.customDictionary.value).toEqual([]);
      expect(spellCheck.suggestions.value).toEqual([]);
      expect(spellCheck.currentMisspelling.value).toBeNull();
    });

    it('should initialize with settings', () => {
      spellCheck.initialize({
        spellCheckEnabled: false,
        customDictionary: ['test', 'word'],
      });
      expect(spellCheck.enabled.value).toBe(false);
      expect(spellCheck.customDictionary.value).toEqual(['test', 'word']);
    });
  });

  describe('dictionary management', () => {
    it('should add word to dictionary', () => {
      spellCheck.addToDictionary('test');
      expect(spellCheck.customDictionary.value).toContain('test');
    });

    it('should add lowercase word to dictionary', () => {
      spellCheck.addToDictionary('TEST');
      expect(spellCheck.customDictionary.value).toContain('test');
    });

    it('should not add duplicate words', () => {
      spellCheck.addToDictionary('test');
      spellCheck.addToDictionary('test');
      expect(spellCheck.customDictionary.value.filter(w => w === 'test').length).toBe(1);
    });

    it('should remove word from dictionary', () => {
      spellCheck.customDictionary.value = ['test', 'word'];
      spellCheck.removeFromDictionary('test');
      expect(spellCheck.customDictionary.value).not.toContain('test');
      expect(spellCheck.customDictionary.value).toContain('word');
    });

    it('should check if word is in dictionary', () => {
      spellCheck.customDictionary.value = ['test', 'word'];
      expect(spellCheck.isInDictionary('test')).toBe(true);
      expect(spellCheck.isInDictionary('unknown')).toBe(false);
    });
  });

  describe('text extraction', () => {
    it('should extract text from HTML', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const text = spellCheck.extractTextForSpellCheck(html);
      expect(text).toBe('Hello World');
    });

    it('should remove script content', () => {
      const html = '<p>Hello</p><script>alert("test")</script>';
      const text = spellCheck.extractTextForSpellCheck(html);
      expect(text).toBe('Hello');
      expect(text).not.toContain('alert');
    });

    it('should remove style content', () => {
      const html = '<style>.test { color: red; }</style><p>Hello</p>';
      const text = spellCheck.extractTextForSpellCheck(html);
      expect(text).toBe('Hello');
    });

    it('should decode HTML entities', () => {
      const html = '<p>Hello&nbsp;World &amp; More</p>';
      const text = spellCheck.extractTextForSpellCheck(html);
      expect(text).toContain('Hello World');
      expect(text).toContain('& More');
    });

    it('should extract words from text', () => {
      const html = '<p>This is a test with some words.</p>';
      const text = spellCheck.extractTextForSpellCheck(html);
      const words = spellCheck.getWordsFromText(text);
      expect(words).toContain('This');
      expect(words).toContain('test');
      expect(words).toContain('some');
      expect(words).toContain('words');
    });

    it('should filter short words', () => {
      const html = '<p>I am a test with words</p>';
      const text = spellCheck.extractTextForSpellCheck(html);
      const words = spellCheck.getWordsFromText(text);
      // Words with less than 3 characters should be filtered
      expect(words).not.toContain('am');
    });
  });

  describe('spell checking', () => {
    it('should identify potentially misspelled words', () => {
      const html = '<p>Ths is a tset of speling</p>';
      spellCheck.customDictionary.value = ['testing'];
      const misspelled = spellCheck.checkSpelling(html);
      // Words are returned as they appear in the text
      expect(misspelled).toContain('Ths');
      expect(misspelled).toContain('tset');
      expect(misspelled).toContain('speling');
      // 'is', 'a', 'of' should be filtered as short words
    });

    it('should exclude custom dictionary words from misspellings', () => {
      const html = '<p>Customword is special</p>';
      spellCheck.customDictionary.value = ['customword'];
      const misspelled = spellCheck.checkSpelling(html);
      // Custom dictionary check is case-insensitive
      expect(misspelled).not.toContain('Customword');
    });
  });

  describe('suggestions', () => {
    it('should set current misspelling', () => {
      spellCheck.setCurrentMisspelling('teh');
      expect(spellCheck.currentMisspelling.value).toBe('teh');
      expect(spellCheck.suggestions.value.length).toBeGreaterThan(0);
    });

    it('should clear misspelling', () => {
      spellCheck.setCurrentMisspelling('teh');
      spellCheck.setCurrentMisspelling(null);
      expect(spellCheck.currentMisspelling.value).toBeNull();
      expect(spellCheck.suggestions.value).toEqual([]);
    });

    it('should generate suggestions for misspelled word', () => {
      const suggestions = spellCheck.generateSuggestions('teh');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should apply suggestion with case preservation', () => {
      const html = '<p>The book is Tehre</p>';
      const result = spellCheck.applySuggestion('Tehre', 'there', html);
      expect(result).toBe('<p>The book is There</p>');
    });

    it('should apply suggestion preserving lowercase', () => {
      const html = '<p>teh book is there</p>';
      const result = spellCheck.applySuggestion('teh', 'the', html);
      expect(result).toBe('<p>the book is there</p>');
    });
  });

  describe('settings', () => {
    it('should get settings', () => {
      spellCheck.enabled.value = false;
      spellCheck.customDictionary.value = ['test', 'word'];
      const settings = spellCheck.getSettings();
      expect(settings.spellCheckEnabled).toBe(false);
      expect(settings.customDictionary).toEqual(['test', 'word']);
    });

    it('should set enabled state', () => {
      spellCheck.setEnabled(false);
      expect(spellCheck.enabled.value).toBe(false);
    });
  });
});
