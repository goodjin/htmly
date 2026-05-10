import { describe, it, expect, beforeEach } from 'vitest';
import { useSharedHistory } from './useSharedHistory';

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
