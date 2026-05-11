// Mock vscode module for testing
module.exports = {
  window: {
    showSaveDialog: vi.fn().mockResolvedValue(undefined),
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
  },
  workspace: {
    workspaceFolders: [],
    textDocuments: [],
    fs: {
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  },
  Uri: {
    joinPath: vi.fn((...args) => ({
      fsPath: args.join('/'),
    })),
    file: vi.fn((path) => ({ fsPath: path })),
  },
  commands: {
    executeCommand: vi.fn().mockResolvedValue(undefined),
  },
};
