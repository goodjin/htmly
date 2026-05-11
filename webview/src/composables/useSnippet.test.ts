/**
 * User Snippet Management Tests
 * 
 * Tests for user snippet CRUD operations in the webview.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock VS Code API
const mockPostMessage = vi.fn();
const mockGetVsApi = vi.fn(() => ({
  postMessage: mockPostMessage,
  getState: vi.fn(() => ({})),
  setState: vi.fn(),
}));

// Set up the mock before importing the module
vi.stubGlobal('acquireVsCodeApi', mockGetVsApi);

// Now import the module
import { useVSCode, __resetVsApiForTest } from './useVSCode';

describe('useVSCode - Snippet Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetVsApiForTest();
  });

  describe('loadUserSnippets', () => {
    it('should send loadUserSnippets message', () => {
      const vscode = useVSCode();
      vscode.loadUserSnippets();
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'loadUserSnippets'
      });
    });
  });

  describe('saveAsSnippet', () => {
    it('should send saveAsSnippet message with correct payload', () => {
      const vscode = useVSCode();
      vscode.saveAsSnippet({
        name: 'My Snippet',
        category: 'cards',
        html: '<div class="card">Test content</div>',
        description: 'A test snippet'
      });
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'saveAsSnippet',
        name: 'My Snippet',
        category: 'cards',
        html: '<div class="card">Test content</div>',
        description: 'A test snippet',
        preview: undefined
      });
    });

    it('should handle save with preview', () => {
      const vscode = useVSCode();
      vscode.saveAsSnippet({
        name: 'Snippet with Preview',
        category: 'buttons',
        html: '<button>Click</button>',
        description: 'A button snippet',
        preview: 'data:image/svg+xml;base64,test'
      });
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'saveAsSnippet',
        name: 'Snippet with Preview',
        category: 'buttons',
        html: '<button>Click</button>',
        description: 'A button snippet',
        preview: 'data:image/svg+xml;base64,test'
      });
    });

    it('should handle save without description', () => {
      const vscode = useVSCode();
      vscode.saveAsSnippet({
        name: 'Simple Snippet',
        category: 'forms',
        html: '<form>...</form>'
      });
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'saveAsSnippet',
        name: 'Simple Snippet',
        category: 'forms',
        html: '<form>...</form>',
        description: undefined,
        preview: undefined
      });
    });

    it('should support all snippet categories', () => {
      const vscode = useVSCode();
      const categories = ['cards', 'buttons', 'navbars', 'tables', 'forms'] as const;
      
      categories.forEach(category => {
        vi.clearAllMocks();
        vscode.saveAsSnippet({
          name: `${category} snippet`,
          category,
          html: '<div></div>'
        });
        
        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
          category
        }));
      });
    });
  });

  describe('deleteSnippet', () => {
    it('should send deleteSnippet message with correct id', () => {
      const vscode = useVSCode();
      vscode.deleteSnippet('snippet-123');
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'deleteSnippet',
        id: 'snippet-123'
      });
    });

    it('should handle deleting different snippets', () => {
      const vscode = useVSCode();
      
      vscode.deleteSnippet('user-snippet-1');
      expect(mockPostMessage).toHaveBeenLastCalledWith({
        type: 'deleteSnippet',
        id: 'user-snippet-1'
      });
      
      vscode.deleteSnippet('my-custom-card');
      expect(mockPostMessage).toHaveBeenLastCalledWith({
        type: 'deleteSnippet',
        id: 'my-custom-card'
      });
    });
  });

  describe('userSnippets state', () => {
    it('should initialize with empty array', () => {
      const vscode = useVSCode();
      expect(vscode.userSnippets.value).toEqual([]);
    });

    it('should expose userSnippets in the returned object', () => {
      const vscode = useVSCode();
      expect(vscode.userSnippets).toBeDefined();
      expect(typeof vscode.userSnippets.value).toBe('object');
    });
  });
});

describe('Snippet CRUD Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetVsApiForTest();
  });

  it('should handle full CRUD flow', () => {
    const vscode = useVSCode();
    
    // Create a snippet
    vscode.saveAsSnippet({
      name: 'Test Snippet',
      category: 'cards',
      html: '<div>Test</div>',
      description: 'For testing'
    });
    expect(mockPostMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'saveAsSnippet',
      name: 'Test Snippet'
    }));
    
    // Delete the snippet
    vscode.deleteSnippet('test-snippet-id');
    expect(mockPostMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'deleteSnippet',
      id: 'test-snippet-id'
    }));
    
    // Load user snippets
    vscode.loadUserSnippets();
    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: 'loadUserSnippets'
    });
  });

  it('should handle multiple snippet operations in sequence', () => {
    const vscode = useVSCode();
    
    // Save first snippet
    vscode.saveAsSnippet({
      name: 'First Snippet',
      category: 'buttons',
      html: '<button>Button 1</button>'
    });
    
    // Save second snippet
    vscode.saveAsSnippet({
      name: 'Second Snippet',
      category: 'buttons',
      html: '<button>Button 2</button>'
    });
    
    // Delete first snippet
    vscode.deleteSnippet('first-snippet-id');
    
    // Load snippets
    vscode.loadUserSnippets();
    
    // Verify the sequence of messages
    const calls = mockPostMessage.mock.calls;
    expect(calls[0][0]).toEqual(expect.objectContaining({ type: 'saveAsSnippet', name: 'First Snippet' }));
    expect(calls[1][0]).toEqual(expect.objectContaining({ type: 'saveAsSnippet', name: 'Second Snippet' }));
    expect(calls[2][0]).toEqual(expect.objectContaining({ type: 'deleteSnippet', id: 'first-snippet-id' }));
    expect(calls[3][0]).toEqual({ type: 'loadUserSnippets' });
  });
});
