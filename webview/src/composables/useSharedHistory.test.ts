import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSharedHistory, onHistoryChange } from './useSharedHistory';

describe('useSharedHistory', () => {
  // Note: Each test creates a new instance but they share module-level state
  // Tests should be written to handle this

  it('should initialize with empty history', () => {
    const history = useSharedHistory();
    expect(history.historySize.value).toBe(0);
    expect(history.canUndo.value).toBe(false);
    expect(history.canRedo.value).toBe(false);
  });

  it('should push content to history', () => {
    const history = useSharedHistory();
    history.initialize('<p>Initial</p>');
    
    expect(history.historySize.value).toBe(1);
    expect(history.currentEntry.value?.content).toBe('<p>Initial</p>');
    expect(history.canUndo.value).toBe(false);
    expect(history.canRedo.value).toBe(false);
  });

  it('should not push duplicate content', () => {
    const history = useSharedHistory();
    history.initialize('<p>Initial</p>');
    history.push('<p>Initial</p>'); // Same content
    
    expect(history.historySize.value).toBe(1);
  });

  it('should clear history', () => {
    const history = useSharedHistory();
    history.initialize('<p>Initial</p>');
    history.clear();
    
    expect(history.historySize.value).toBe(0);
    expect(history.currentEntry.value).toBeNull();
  });
});

describe('Cross-Mode Undo/Redo Behavior', () => {
  let history: ReturnType<typeof useSharedHistory>;
  
  beforeEach(() => {
    history = useSharedHistory();
    history.clear(); // Clear state before each test
  });

  it('tracks position in history', () => {
    history.initialize('<p>Start</p>');
    history.push('<p>Edit 1</p>');
    history.push('<p>Edit 2</p>');
    
    expect(history.position.value).toBe(2);
    expect(history.historySize.value).toBe(3);
  });

  it('supports undo operations', () => {
    history.initialize('<p>Start</p>');
    history.push('<p>Edit 1</p>');
    history.push('<p>Edit 2</p>');
    
    const undone = history.undo('<p>Edit 2</p>');
    expect(undone).toBe('<p>Edit 1</p>');
    expect(history.position.value).toBe(1);
  });

  it('supports redo operations', () => {
    history.initialize('<p>Start</p>');
    history.push('<p>Edit 1</p>');
    history.push('<p>Edit 2</p>');
    
    // Undo twice
    history.undo('<p>Edit 2</p>');
    history.undo('<p>Edit 1</p>');
    expect(history.position.value).toBe(0);
    
    // Redo once
    const redone = history.redo('<p>Start</p>');
    expect(redone).toBe('<p>Edit 1</p>');
    expect(history.position.value).toBe(1);
  });

  it('clears redo stack when new content is pushed after undo', () => {
    history.initialize('<p>Start</p>');
    history.push('<p>Edit 1</p>');
    history.push('<p>Edit 2</p>');
    
    // Undo
    history.undo('<p>Edit 2</p>');
    expect(history.canRedo.value).toBe(true);
    
    // Push new content (should clear redo stack)
    history.push('<p>Different edit</p>');
    expect(history.canRedo.value).toBe(false);
    expect(history.currentEntry.value?.content).toBe('<p>Different edit</p>');
  });

  it('returns null when undo is not available', () => {
    history.initialize('<p>Start</p>');
    expect(history.canUndo.value).toBe(false);
    
    const result = history.undo('<p>Start</p>');
    expect(result).toBeNull();
  });

  it('returns null when redo is not available', () => {
    history.initialize('<p>Start</p>');
    expect(history.canRedo.value).toBe(false);
    
    const result = history.redo('<p>Start</p>');
    expect(result).toBeNull();
  });

  it('stores cursor position with history entry via push', () => {
    history.initialize('<p>Start</p>');
    history.push('<p>Edit 1</p>', 0.5);
    expect(history.currentEntry.value?.cursorPosition).toBe(0.5);
  });

  it('limits history to 100 entries', () => {
    // Create more than 100 entries
    for (let i = 0; i < 150; i++) {
      history.push(`<p>Edit ${i}</p>`);
    }
    
    // Should be capped at 100 entries
    expect(history.historySize.value).toBe(100);
  });
});

describe('History Entry Content', () => {
  let history: ReturnType<typeof useSharedHistory>;
  
  beforeEach(() => {
    history = useSharedHistory();
    history.clear();
  });

  it('preserves full HTML content', () => {
    const fullHtml = '<!DOCTYPE html><html><body><p>Test</p></body></html>';
    history.initialize(fullHtml);
    
    expect(history.currentEntry.value?.content).toBe(fullHtml);
  });

  it('preserves content with special characters', () => {
    const htmlWithSpecial = '<p>Test &amp; "quotes" &lt;tags&gt;</p>';
    history.initialize(htmlWithSpecial);
    
    expect(history.currentEntry.value?.content).toBe(htmlWithSpecial);
  });

  it('preserves content with Unicode', () => {
    const htmlWithUnicode = '<p>Hello 你好 🌍</p>';
    history.initialize(htmlWithUnicode);
    
    expect(history.currentEntry.value?.content).toBe(htmlWithUnicode);
  });

  it('preserves empty content', () => {
    history.initialize('');
    expect(history.currentEntry.value?.content).toBe('');
  });
});

describe('History Persistence & Recovery', () => {
  let history: ReturnType<typeof useSharedHistory>;
  
  beforeEach(() => {
    history = useSharedHistory();
    history.clear();
  });

  describe('initializeFromPersisted', () => {
    it('restores history from persisted state', () => {
      const persistedState = {
        entries: [
          { content: '<p>Start</p>', timestamp: 1000 },
          { content: '<p>Edit 1</p>', timestamp: 2000 },
          { content: '<p>Edit 2</p>', timestamp: 3000 },
        ],
        currentIndex: 2,
      };

      history.initializeFromPersisted(persistedState);

      expect(history.historySize.value).toBe(3);
      expect(history.position.value).toBe(2);
      expect(history.currentEntry.value?.content).toBe('<p>Edit 2</p>');
    });

    it('clamps currentIndex to valid range', () => {
      const persistedState = {
        entries: [
          { content: '<p>Start</p>', timestamp: 1000 },
          { content: '<p>Edit 1</p>', timestamp: 2000 },
        ],
        currentIndex: 5, // Invalid index
      };

      history.initializeFromPersisted(persistedState);

      expect(history.historySize.value).toBe(2);
      expect(history.position.value).toBe(1); // Should be clamped to max valid index
    });

    it('handles empty entries gracefully', () => {
      const persistedState = {
        entries: [],
        currentIndex: 0,
      };

      history.initializeFromPersisted(persistedState);

      expect(history.historySize.value).toBe(0);
      expect(history.position.value).toBe(-1);
    });
  });

  describe('restoreToIndex (Selective Undo)', () => {
    it('restores to specific history index', () => {
      history.initialize('<p>Start</p>');
      history.push('<p>Edit 1</p>');
      history.push('<p>Edit 2</p>');
      history.push('<p>Edit 3</p>');

      // Currently at index 3
      expect(history.position.value).toBe(3);

      // Restore to index 1
      const restored = history.restoreToIndex(1);
      
      expect(restored).toBe('<p>Edit 1</p>');
      expect(history.position.value).toBe(1);
      expect(history.currentEntry.value?.content).toBe('<p>Edit 1</p>');
    });

    it('returns null for invalid index', () => {
      history.initialize('<p>Start</p>');
      
      const restored = history.restoreToIndex(5);
      expect(restored).toBeNull();
    });

    it('returns null for negative index', () => {
      history.initialize('<p>Start</p>');
      
      const restored = history.restoreToIndex(-1);
      expect(restored).toBeNull();
    });

    it('allows moving forward again after selective undo', () => {
      history.initialize('<p>Start</p>');
      history.push('<p>Edit 1</p>');
      history.push('<p>Edit 2</p>');
      history.push('<p>Edit 3</p>');

      // Selectively restore to index 1
      history.restoreToIndex(1);
      expect(history.position.value).toBe(1);

      // Should be able to redo to index 2
      const redone = history.redo('<p>Edit 1</p>');
      expect(redone).toBe('<p>Edit 2</p>');
      expect(history.position.value).toBe(2);
    });
  });

  describe('exportAsJson', () => {
    it('exports history as serializable state', () => {
      history.initialize('<p>Start</p>');
      history.push('<p>Edit 1</p>');
      history.push('<p>Edit 2</p>');
      history.restoreToIndex(1);

      const exported = history.exportAsJson();

      expect(exported.entries).toHaveLength(3);
      expect(exported.currentIndex).toBe(1);
      expect(exported.entries[0].content).toBe('<p>Start</p>');
      expect(exported.entries[1].content).toBe('<p>Edit 1</p>');
      expect(exported.entries[2].content).toBe('<p>Edit 2</p>');
    });

    it('exports valid JSON-serializable data', () => {
      history.initialize('<p>Test</p>');
      
      const exported = history.exportAsJson();
      const jsonString = JSON.stringify(exported);
      const parsed = JSON.parse(jsonString);

      expect(parsed.entries).toHaveLength(1);
      expect(parsed.currentIndex).toBe(0);
    });
  });

  describe('allEntries computed', () => {
    it('returns all entries with metadata', () => {
      history.initialize('<p>Start</p>');
      history.push('<p>Edit 1</p>');
      history.push('<p>Edit 2</p>');
      history.restoreToIndex(1);

      const entries = history.allEntries.value;

      expect(entries).toHaveLength(3);
      expect(entries[0]).toEqual({
        index: 0,
        content: '<p>Start</p>',
        timestamp: expect.any(Number),
        isCurrent: false,
        isPast: true,
        isFuture: false,
      });
      expect(entries[1]).toEqual({
        index: 1,
        content: '<p>Edit 1</p>',
        timestamp: expect.any(Number),
        isCurrent: true,
        isPast: false,
        isFuture: false,
      });
      expect(entries[2]).toEqual({
        index: 2,
        content: '<p>Edit 2</p>',
        timestamp: expect.any(Number),
        isCurrent: false,
        isPast: false,
        isFuture: true,
      });
    });
  });
});

describe('History Change Notifications', () => {
  let history: ReturnType<typeof useSharedHistory>;
  
  beforeEach(() => {
    history = useSharedHistory();
    history.clear();
  });

  afterEach(() => {
    // Clean up any registered callbacks
  });

  it('calls registered callback on initialize', () => {
    const callback = vi.fn();
    const unsubscribe = onHistoryChange(callback);

    history.initialize('<p>Test</p>');

    expect(callback).toHaveBeenCalledWith({
      entries: expect.arrayContaining([
        expect.objectContaining({ content: '<p>Test</p>' })
      ]),
      currentIndex: 0,
    });

    unsubscribe();
  });

  it('calls registered callback on push', () => {
    const callback = vi.fn();
    const unsubscribe = onHistoryChange(callback);

    history.initialize('<p>Start</p>');
    callback.mockClear();
    history.push('<p>Edit</p>');

    expect(callback).toHaveBeenCalledWith({
      entries: expect.arrayContaining([
        expect.objectContaining({ content: '<p>Start</p>' }),
        expect.objectContaining({ content: '<p>Edit</p>' }),
      ]),
      currentIndex: 1,
    });

    unsubscribe();
  });

  it('calls registered callback on undo', () => {
    const callback = vi.fn();
    const unsubscribe = onHistoryChange(callback);

    history.initialize('<p>Start</p>');
    history.push('<p>Edit</p>');
    callback.mockClear();
    history.undo('<p>Edit</p>');

    expect(callback).toHaveBeenCalled();

    unsubscribe();
  });

  it('calls registered callback on redo', () => {
    const callback = vi.fn();
    const unsubscribe = onHistoryChange(callback);

    history.initialize('<p>Start</p>');
    history.push('<p>Edit</p>');
    history.undo('<p>Edit</p>');
    callback.mockClear();
    history.redo('<p>Start</p>');

    expect(callback).toHaveBeenCalled();

    unsubscribe();
  });

  it('calls registered callback on restoreToIndex', () => {
    const callback = vi.fn();
    const unsubscribe = onHistoryChange(callback);

    history.initialize('<p>Start</p>');
    history.push('<p>Edit 1</p>');
    history.push('<p>Edit 2</p>');
    callback.mockClear();
    history.restoreToIndex(0);

    expect(callback).toHaveBeenCalled();

    unsubscribe();
  });

  it('allows unsubscribing', () => {
    const callback = vi.fn();
    const unsubscribe = onHistoryChange(callback);

    history.initialize('<p>Test</p>');
    callback.mockClear();
    unsubscribe();
    history.push('<p>Edit</p>');

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('History Memory Optimization', () => {
  let history: ReturnType<typeof useSharedHistory>;
  
  beforeEach(() => {
    history = useSharedHistory();
    history.clear();
  });

  it('limits to 100 entries exactly', () => {
    // Add exactly 100 entries
    for (let i = 0; i < 100; i++) {
      history.push(`<p>Edit ${i}</p>`);
    }

    expect(history.historySize.value).toBe(100);
    expect(history.canUndo.value).toBe(true);
  });

  it('removes oldest entries when limit exceeded', () => {
    history.initialize('<p>Initial</p>');
    
    // Add 150 more entries (151 total, but limited to 100)
    for (let i = 0; i < 150; i++) {
      history.push(`<p>Edit ${i}</p>`);
    }

    expect(history.historySize.value).toBe(100);
    
    // First entry should be gone, oldest remaining should be the 51st
    expect(history.historyStack.value[0].content).toBe('<p>Edit 50</p>');
  });

  it('maintains relative positions when trimming', () => {
    history.initialize('<p>Start</p>');
    for (let i = 0; i < 150; i++) {
      history.push(`<p>Edit ${i}</p>`);
    }

    // Current position should have been adjusted
    expect(history.position.value).toBe(99); // 100 entries, 0-indexed
    expect(history.currentEntry.value?.content).toBe('<p>Edit 149</p>');
  });
});
