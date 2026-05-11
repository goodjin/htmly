/**
 * User Template Management Tests
 * 
 * Tests for user template CRUD operations in the webview.
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
import { ref } from 'vue';

describe('useVSCode - Template Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetVsApiForTest();
  });

  describe('loadUserTemplates', () => {
    it('should send loadUserTemplates message', () => {
      const vscode = useVSCode();
      vscode.loadUserTemplates();
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'loadUserTemplates'
      });
    });
  });

  describe('saveAsTemplate', () => {
    it('should send saveAsTemplate message with correct payload', () => {
      const vscode = useVSCode();
      vscode.saveAsTemplate({
        name: 'My Template',
        category: 'blog',
        content: '<html><body>Test content</body></html>',
        description: 'A test template'
      });
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'saveAsTemplate',
        name: 'My Template',
        category: 'blog',
        content: '<html><body>Test content</body></html>',
        description: 'A test template'
      });
    });

    it('should handle save without description', () => {
      const vscode = useVSCode();
      vscode.saveAsTemplate({
        name: 'Simple Template',
        category: 'docs',
        content: '<p>Simple</p>'
      });
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'saveAsTemplate',
        name: 'Simple Template',
        category: 'docs',
        content: '<p>Simple</p>',
        description: undefined
      });
    });
  });

  describe('deleteTemplate', () => {
    it('should send deleteTemplate message with correct id', () => {
      const vscode = useVSCode();
      vscode.deleteTemplate('template-123');
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'deleteTemplate',
        id: 'template-123'
      });
    });
  });

  describe('renameTemplate', () => {
    it('should send renameTemplate message with correct payload', () => {
      const vscode = useVSCode();
      vscode.renameTemplate('template-123', 'New Name');
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'renameTemplate',
        id: 'template-123',
        newName: 'New Name'
      });
    });
  });

  describe('userTemplates state', () => {
    it('should initialize with empty array', () => {
      const vscode = useVSCode();
      expect(vscode.userTemplates.value).toEqual([]);
    });
  });
});

describe('Template CRUD Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetVsApiForTest();
  });

  it('should handle full CRUD flow', () => {
    const vscode = useVSCode();
    
    // Create a template
    vscode.saveAsTemplate({
      name: 'Test Template',
      category: 'product',
      content: '<div>Test</div>',
      description: 'For testing'
    });
    expect(mockPostMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'saveAsTemplate',
      name: 'Test Template'
    }));
    
    // Rename the template
    vscode.renameTemplate('test-id', 'Renamed Template');
    expect(mockPostMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'renameTemplate',
      newName: 'Renamed Template'
    }));
    
    // Delete the template
    vscode.deleteTemplate('test-id');
    expect(mockPostMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'deleteTemplate',
      id: 'test-id'
    }));
    
    // Load user templates
    vscode.loadUserTemplates();
    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: 'loadUserTemplates'
    });
  });
});
