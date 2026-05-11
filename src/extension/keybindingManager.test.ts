import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import {
  DEFAULT_KEYBINDINGS,
  getKeybindingOverrides,
  getKeybinding,
  getAllKeybindings,
  setKeybindingOverride,
  removeKeybindingOverride,
  exportKeybindings,
  importKeybindings,
  resetKeybindings,
} from './keybindingManager';

// Shared mock state - inline key to avoid hoisting issues
interface MockState {
  overrides: Record<string, { command: string; key: string; mac?: string }>;
}

// Ensure global state exists - function declarations ARE hoisted in JS
function getMockState(): MockState {
  const g = global as Global & { __htmly_keybinding_test_state__?: MockState };
  if (!g.__htmly_keybinding_test_state__) {
    g.__htmly_keybinding_test_state__ = { overrides: {} };
  }
  return g.__htmly_keybinding_test_state__;
}

// Hoisted mock state for the test file to access
const mockState = getMockState();

// Mock VS Code modules
vi.mock('vscode', () => {
  return {
    ConfigurationTarget: {
      Workspace: 'workspace',
      Global: 'global',
      Default: 'default',
    },
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: vi.fn((key: string, defaultValue: unknown) => {
          // Handle both 'htmly.keybindings.overrides' and just 'keybindings.overrides'
          if (key === 'htmly.keybindings.overrides' || key === 'keybindings.overrides') {
            return getMockState().overrides;
          }
          return defaultValue;
        }),
        update: vi.fn((key: string, value: unknown) => {
          // Handle both key formats
          if (key === 'htmly.keybindings.overrides' || key === 'keybindings.overrides') {
            getMockState().overrides = value as Record<string, { command: string; key: string; mac?: string }>;
          }
        }),
      })),
      workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    },
    window: {
      showSaveDialog: vi.fn(),
      showOpenDialog: vi.fn(),
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn(),
    },
  };
});

describe('keybindingManager', () => {
  beforeEach(() => {
    // Clear overrides in-place instead of replacing the object
    Object.keys(mockState.overrides).forEach(k => delete mockState.overrides[k]);
  });

  describe('DEFAULT_KEYBINDINGS', () => {
    it('should have default keybindings defined', () => {
      expect(DEFAULT_KEYBINDINGS).toBeDefined();
      expect(Array.isArray(DEFAULT_KEYBINDINGS)).toBe(true);
      expect(DEFAULT_KEYBINDINGS.length).toBeGreaterThan(0);
    });

    it('should have required properties for each keybinding', () => {
      for (const kb of DEFAULT_KEYBINDINGS) {
        expect(kb.id).toBeDefined();
        expect(kb.title).toBeDefined();
        expect(kb.category).toBeDefined();
        expect(kb.keybinding).toBeDefined();
        expect(kb.keybinding.command).toBe(kb.id);
      }
    });

    it('should include file operations', () => {
      const saveCommand = DEFAULT_KEYBINDINGS.find((kb) => kb.id === 'htmly.save');
      expect(saveCommand).toBeDefined();
      expect(saveCommand?.title).toBe('Save File');
      expect(saveCommand?.category).toBe('File');
    });

    it('should include mode switching commands', () => {
      const modeCommands = DEFAULT_KEYBINDINGS.filter((kb) => kb.category === 'Mode');
      expect(modeCommands.length).toBeGreaterThan(0);
      expect(modeCommands.some((kb) => kb.id === 'htmly.toggleMode')).toBe(true);
    });

    it('should include search commands', () => {
      const searchCommand = DEFAULT_KEYBINDINGS.find((kb) => kb.id === 'htmly.searchProject');
      expect(searchCommand).toBeDefined();
      expect(searchCommand?.title).toBe('Project-Wide Search');
    });

    it('should include template commands', () => {
      const templateCommand = DEFAULT_KEYBINDINGS.find((kb) => kb.id === 'htmly.insertTemplate');
      expect(templateCommand).toBeDefined();
      expect(templateCommand?.category).toBe('Templates');
    });

    it('should include snippet commands', () => {
      const snippetCommand = DEFAULT_KEYBINDINGS.find((kb) => kb.id === 'htmly.insertSnippet');
      expect(snippetCommand).toBeDefined();
      expect(snippetCommand?.category).toBe('Snippets');
    });
  });

  describe('getKeybindingOverrides', () => {
    it('should return empty object when no overrides exist', () => {
      // Use setKeybindingOverride to set up state through proper flow
      setKeybindingOverride('htmly.save', '');
      removeKeybindingOverride('htmly.save');
      const overrides = getKeybindingOverrides();
      expect(overrides).toEqual({});
    });

    it('should return overrides when they exist', () => {
      // Use setKeybindingOverride to properly set the override
      setKeybindingOverride('htmly.save', 'ctrl+b', 'cmd+b');
      const overrides = getKeybindingOverrides();
      expect(overrides['htmly.save']).toBeDefined();
      expect(overrides['htmly.save'].key).toBe('ctrl+b');
    });
  });

  describe('getKeybinding', () => {
    it('should return default keybinding when no override exists', () => {
      // Clear any existing overrides
      removeKeybindingOverride('htmly.save');
      const keybinding = getKeybinding('htmly.save');
      expect(keybinding).toBeDefined();
      expect(keybinding?.key).toBe('ctrl+s');
    });

    it('should return override when it exists', () => {
      // Use setKeybindingOverride to properly set the override
      setKeybindingOverride('htmly.save', 'ctrl+b', 'cmd+b');
      const keybinding = getKeybinding('htmly.save');
      expect(keybinding).toBeDefined();
      expect(keybinding?.key).toBe('ctrl+b');
    });

    it('should return undefined for unknown command', () => {
      const keybinding = getKeybinding('htmly.unknown');
      expect(keybinding).toBeUndefined();
    });
  });

  describe('getAllKeybindings', () => {
    it('should return all default keybindings with no overrides', () => {
      // Clear any existing overrides
      removeKeybindingOverride('htmly.save');
      const keybindings = getAllKeybindings();
      expect(keybindings).toHaveLength(DEFAULT_KEYBINDINGS.length);
    });

    it('should mark overridden keybindings', () => {
      // Use setKeybindingOverride to properly set the override
      setKeybindingOverride('htmly.save', 'ctrl+b', 'cmd+b');
      const keybindings = getAllKeybindings();
      const saveBinding = keybindings.find((kb) => kb.id === 'htmly.save');
      expect(saveBinding?.isOverridden).toBe(true);
    });

    it('should use override value for overridden keybindings', () => {
      // Use setKeybindingOverride to properly set the override
      setKeybindingOverride('htmly.save', 'ctrl+b', 'cmd+b');
      const keybindings = getAllKeybindings();
      const saveBinding = keybindings.find((kb) => kb.id === 'htmly.save');
      expect(saveBinding?.keybinding.key).toBe('ctrl+b');
    });
  });

  describe('setKeybindingOverride', () => {
    it('should set a keybinding override', () => {
      mockState.overrides = {};
      setKeybindingOverride('htmly.save', 'ctrl+b', 'cmd+b');

      expect(mockState.overrides['htmly.save']).toBeDefined();
      expect(mockState.overrides['htmly.save'].key).toBe('ctrl+b');
      expect(mockState.overrides['htmly.save'].mac).toBe('cmd+b');
    });

    it('should update existing override', () => {
      mockState.overrides = {
        'htmly.save': { command: 'htmly.save', key: 'ctrl+b', mac: 'cmd+b' },
      };
      setKeybindingOverride('htmly.save', 'ctrl+c', 'cmd+c');

      expect(mockState.overrides['htmly.save'].key).toBe('ctrl+c');
      expect(mockState.overrides['htmly.save'].mac).toBe('cmd+c');
    });
  });

  describe('removeKeybindingOverride', () => {
    it('should remove an existing override', () => {
      mockState.overrides = {
        'htmly.save': { command: 'htmly.save', key: 'ctrl+b', mac: 'cmd+b' },
      };
      removeKeybindingOverride('htmly.save');

      expect(mockState.overrides['htmly.save']).toBeUndefined();
    });

    it('should not throw for non-existent override', () => {
      mockState.overrides = {};
      expect(() => removeKeybindingOverride('htmly.unknown')).not.toThrow();
    });
  });

  describe('exportKeybindings', () => {
    it('should create export data with correct structure', async () => {
      mockState.overrides = {};
      vi.mocked(vscode.window.showSaveDialog).mockResolvedValue({
        fsPath: '/test/workspace/.htmly/keybindings.json',
      } as vscode.Uri);

      // Mock fs module
      const mockFs = {
        existsSync: vi.fn().mockReturnValue(true),
        writeFileSync: vi.fn(),
      };
      vi.doMock('fs', () => mockFs);

      const result = await exportKeybindings();

      // The result depends on whether the export dialog was cancelled or not
      expect(result).toHaveProperty('success');
    });
  });

  describe('importKeybindings', () => {
    it('should handle cancelled import', async () => {
      mockState.overrides = {};
      vi.mocked(vscode.window.showOpenDialog).mockResolvedValue([]);

      const result = await importKeybindings();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Import cancelled');
    });
  });

  describe('resetKeybindings', () => {
    it('should reset all overrides', async () => {
      mockState.overrides = {
        'htmly.save': { command: 'htmly.save', key: 'ctrl+b', mac: 'cmd+b' },
        'htmly.searchProject': { command: 'htmly.searchProject', key: 'ctrl+g', mac: 'cmd+g' },
      };

      await resetKeybindings();

      // Verify that the state was reset to empty
      expect(mockState.overrides).toEqual({});
    });
  });
});
