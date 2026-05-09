import { describe, it, expect } from 'vitest';
import { expandAbbreviation, abbreviationTracker, emmetConfig } from '@emmetio/codemirror6-plugin';

// These tests verify that the Emmet package is properly imported and available
// The actual CodeMirror integration is tested via E2E tests

describe('Emmet integration', () => {
  it('expandAbbreviation is a valid function', () => {
    expect(typeof expandAbbreviation).toBe('function');
  });

  it('abbreviationTracker is a valid function', () => {
    expect(typeof abbreviationTracker).toBe('function');
  });

  it('emmetConfig is a valid Facet object', () => {
    // emmetConfig is a CodeMirror Facet, not a function
    expect(emmetConfig).toBeDefined();
    expect(typeof emmetConfig).toBe('object');
    expect(emmetConfig).toHaveProperty('of');
  });

  it('expandAbbreviation is callable as a StateCommand', () => {
    // expandAbbreviation is a StateCommand per the docs
    const cmd = expandAbbreviation;
    expect(cmd).toBeDefined();
    expect(typeof cmd).toBe('function');
  });

  it('abbreviationTracker returns an extension array', () => {
    // abbreviationTracker returns an Extension
    const ext = abbreviationTracker();
    expect(ext).toBeDefined();
    expect(typeof ext).toBe('object');
    // It returns an array of extensions
    expect(Array.isArray(ext)).toBe(true);
  });
});
