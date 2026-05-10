/**
 * Stress Test Utilities Tests
 * 
 * Tests for large document generation, rapid typing simulation,
 * and stress test utilities for performance testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateLargeHtmlContent,
  simulateRapidTyping,
  simulateContinuousEditing,
  createStressTestDocument,
  requiresOptimization,
  getRecommendedSettings,
  STRESS_TEST_SIZES,
  type StressTestResult,
} from './useStressTest';

describe('generateLargeHtmlContent', () => {
  it('generates HTML content of approximately the target size', () => {
    const content = generateLargeHtmlContent(50);
    const sizeKb = new Blob([content]).size / 1024;
    
    // Allow 10% tolerance
    expect(sizeKb).toBeGreaterThan(45);
    expect(sizeKb).toBeLessThan(60);
  });

  it('generates valid HTML structure', () => {
    const content = generateLargeHtmlContent(50);
    
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('<html>');
    expect(content).toContain('<head>');
    expect(content).toContain('<body>');
    expect(content).toContain('</body>');
    expect(content).toContain('</html>');
  });

  it('includes various HTML elements', () => {
    const content = generateLargeHtmlContent(100);
    
    expect(content).toContain('<p>');
    // Headings are generated with varying levels h1-h6
    expect(content).toMatch(/<h[1-6]>/);
    expect(content).toContain('<ul>');
    expect(content).toContain('<li>');
    expect(content).toContain('<table>');
  });

  it('generates >200KB content for stress test', () => {
    const content = generateLargeHtmlContent(200);
    const sizeKb = new Blob([content]).size / 1024;
    
    expect(sizeKb).toBeGreaterThan(190);
  });
});

describe('STRESS_TEST_SIZES', () => {
  it('has correct size constants', () => {
    expect(STRESS_TEST_SIZES.SMALL).toBe(50 * 1024);
    expect(STRESS_TEST_SIZES.MEDIUM).toBe(100 * 1024);
    expect(STRESS_TEST_SIZES.LARGE).toBe(200 * 1024);
    expect(STRESS_TEST_SIZES.XLARGE).toBe(500 * 1024);
  });
});

describe('simulateRapidTyping', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('simulates typing with callback', () => {
    const callback = vi.fn();
    const stop = simulateRapidTyping(callback, {
      keystrokeCount: 10,
      delayPerKeystroke: 10,
    });
    
    vi.advanceTimersByTime(100);
    
    expect(callback).toHaveBeenCalled();
    expect(callback.mock.calls.length).toBeGreaterThan(0);
    
    stop.stop();
  });

  it('respects keystroke count', () => {
    const callback = vi.fn();
    const stop = simulateRapidTyping(callback, {
      keystrokeCount: 5,
      delayPerKeystroke: 10,
    });
    
    vi.advanceTimersByTime(50);
    
    expect(callback.mock.calls.length).toBeLessThanOrEqual(6); // May have one more due to timing
    
    stop.stop();
  });

  it('can be stopped early', () => {
    const callback = vi.fn();
    const { stop } = simulateRapidTyping(callback, {
      keystrokeCount: 100,
      delayPerKeystroke: 10,
    });
    
    vi.advanceTimersByTime(50);
    stop();
    vi.advanceTimersByTime(500);
    
    const callCountBeforeStop = callback.mock.calls.length;
    vi.advanceTimersByTime(1000);
    
    // Should not have many more calls after stop
    expect(callback.mock.calls.length).toBe(callCountBeforeStop);
  });
});

describe('simulateContinuousEditing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('performs edits for specified duration', () => {
    const callback = vi.fn();
    const initialContent = '<html><body><p>Initial</p></body></html>';
    
    const { stop } = simulateContinuousEditing(initialContent, callback, {
      duration: 100,
      editInterval: 20,
      editSize: 50,
    });
    
    vi.advanceTimersByTime(100);
    
    expect(callback).toHaveBeenCalled();
    
    stop();
  });

  it('modifies content during editing', () => {
    const callback = vi.fn();
    const initialContent = '<html><body><p>Initial</p></body></html>';
    
    const { stop } = simulateContinuousEditing(initialContent, callback, {
      duration: 100,
      editInterval: 20,
      editSize: 100,
    });
    
    vi.advanceTimersByTime(100);
    
    // Last call should have different content
    const lastCall = callback.mock.calls[callback.mock.calls.length - 1];
    const finalContent = lastCall[0] as string;
    
    expect(finalContent.length).toBeGreaterThan(initialContent.length);
    
    stop();
  });

  it('can be stopped early', () => {
    const callback = vi.fn();
    const initialContent = '<html><body><p>Initial</p></body></html>';
    
    const { stop } = simulateContinuousEditing(initialContent, callback, {
      duration: 10000,
      editInterval: 100,
    });
    
    vi.advanceTimersByTime(200);
    
    const callCountBeforeStop = callback.mock.calls.length;
    stop();
    
    vi.advanceTimersByTime(1000);
    
    // Should not have many more calls after stop
    expect(callback.mock.calls.length).toBe(callCountBeforeStop);
  });
});

describe('createStressTestDocument', () => {
  it('creates a 200KB document by default', () => {
    const doc = createStressTestDocument();
    const sizeKb = new Blob([doc]).size / 1024;
    
    expect(sizeKb).toBeGreaterThan(190);
  });

  it('creates document of specified size', () => {
    const doc = createStressTestDocument(100);
    const sizeKb = new Blob([doc]).size / 1024;
    
    expect(sizeKb).toBeGreaterThan(95);
    expect(sizeKb).toBeLessThan(110);
  });
});

describe('requiresOptimization', () => {
  it('returns true for documents >= 100KB', () => {
    expect(requiresOptimization(100)).toBe(true);
    expect(requiresOptimization(150)).toBe(true);
    expect(requiresOptimization(200)).toBe(true);
    expect(requiresOptimization(500)).toBe(true);
  });

  it('returns false for documents < 100KB', () => {
    expect(requiresOptimization(50)).toBe(false);
    expect(requiresOptimization(99)).toBe(false);
  });
});

describe('getRecommendedSettings', () => {
  it('returns conservative settings for very large documents (>=500KB)', () => {
    const settings = getRecommendedSettings(500);
    
    expect(settings.virtualScroll).toBe(true);
    expect(settings.debounceDelay).toBe(300);
    expect(settings.batchSize).toBe(10);
    expect(settings.previewUpdatesEnabled).toBe(false);
  });

  it('returns balanced settings for large documents (200-500KB)', () => {
    const settings = getRecommendedSettings(200);
    
    expect(settings.virtualScroll).toBe(true);
    expect(settings.debounceDelay).toBe(200);
    expect(settings.batchSize).toBe(5);
    expect(settings.previewUpdatesEnabled).toBe(true);
  });

  it('returns moderate settings for medium documents (100-200KB)', () => {
    const settings = getRecommendedSettings(100);
    
    expect(settings.virtualScroll).toBe(true);
    expect(settings.debounceDelay).toBe(150);
    expect(settings.batchSize).toBe(3);
    expect(settings.previewUpdatesEnabled).toBe(true);
  });

  it('returns minimal settings for small documents (<100KB)', () => {
    const settings = getRecommendedSettings(50);
    
    expect(settings.virtualScroll).toBe(false);
    expect(settings.debounceDelay).toBe(100);
    expect(settings.batchSize).toBe(1);
    expect(settings.previewUpdatesEnabled).toBe(true);
  });
});

describe('Stress Test Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('can generate and type in a 200KB document', () => {
    const doc = createStressTestDocument(200);
    const docSize = new Blob([doc]).size / 1024;
    
    expect(docSize).toBeGreaterThan(190);
    
    // Should be able to simulate typing
    const callback = vi.fn();
    const result = simulateRapidTyping(callback, {
      keystrokeCount: 10,
      delayPerKeystroke: 5,
    });
    
    vi.advanceTimersByTime(50);
    
    expect(callback).toHaveBeenCalled();
    
    result.stop();
  });

  it('document meets >200KB requirement for stress testing', () => {
    const largeDoc = generateLargeHtmlContent(200);
    const size = new Blob([largeDoc]).size;
    
    // 200KB = 200 * 1024 bytes
    expect(size).toBeGreaterThan(200 * 1024);
  });
});
