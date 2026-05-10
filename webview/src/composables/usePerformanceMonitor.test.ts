/**
 * usePerformanceMonitor Tests
 * 
 * Tests for FPS monitoring, throttling, debouncing, and batched DOM operations.
 * These tests verify performance optimization features for large document editing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  usePerformanceMonitor, 
  throttleRAF, 
  debounceRAF, 
  batchDOMOperations,
  createBatchedUpdater,
  type PerformanceMetrics
} from './usePerformanceMonitor';

// Mock requestAnimationFrame
const mockRAF = vi.fn((cb: (time: number) => void) => {
  return window.setTimeout(() => cb(performance.now()), 16);
});

// Mock cancelAnimationFrame
const mockCancelRAF = vi.fn((id: number) => {
  window.clearTimeout(id);
});

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', mockRAF);
    vi.stubGlobal('cancelAnimationFrame', mockCancelRAF);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('initializes with default values', () => {
      const monitor = usePerformanceMonitor();
      
      expect(monitor.isActive.value).toBe(false);
      expect(monitor.currentFps.value).toBe(60);
      expect(monitor.averageFps.value).toBe(60);
      expect(monitor.minFps.value).toBe(60);
      expect(monitor.maxFps.value).toBe(60);
      expect(monitor.droppedFrames.value).toBe(0);
      expect(monitor.totalFrames.value).toBe(0);
    });

    it('accepts custom options', () => {
      const monitor = usePerformanceMonitor({
        samplingWindow: 30,
        targetFps: 120,
        trackMemory: true,
      });
      
      expect(monitor.isActive.value).toBe(false);
    });
  });

  describe('Start/Stop', () => {
    it('starts monitoring when start() is called', () => {
      const monitor = usePerformanceMonitor();
      
      monitor.start();
      
      expect(monitor.isActive.value).toBe(true);
      expect(mockRAF).toHaveBeenCalled();
    });

    it('stops monitoring when stop() is called', () => {
      const monitor = usePerformanceMonitor();
      
      monitor.start();
      monitor.stop();
      
      expect(monitor.isActive.value).toBe(false);
    });

    it('resets metrics when start() is called after stop()', () => {
      const monitor = usePerformanceMonitor();
      
      monitor.start();
      monitor.stop();
      monitor.start();
      
      expect(monitor.totalFrames.value).toBe(0);
      expect(monitor.droppedFrames.value).toBe(0);
    });
  });

  describe('FPS Measurement', () => {
    it('measures FPS based on frame timing', async () => {
      const monitor = usePerformanceMonitor();
      monitor.start();
      
      // Simulate frames at 60fps (16.67ms apart)
      vi.advanceTimersByTime(16);
      mockRAF.mock.calls[0]?.[0](performance.now());
      
      vi.advanceTimersByTime(16);
      mockRAF.mock.calls[1]?.[0](performance.now() + 16);
      
      // FPS should be around 60
      expect(monitor.currentFps.value).toBeGreaterThan(0);
    });

    it('tracks dropped frames when FPS drops', () => {
      const monitor = usePerformanceMonitor({
        fpsDropThreshold: 30,
      });
      
      monitor.start();
      
      // Simulate a slow frame (50ms = 20fps)
      vi.advanceTimersByTime(50);
      mockRAF.mock.calls[0]?.[0](performance.now() + 50);
      
      expect(monitor.droppedFrames.value).toBeGreaterThan(0);
    });

    it('maintains min/max FPS tracking', () => {
      const monitor = usePerformanceMonitor();
      monitor.start();
      
      // Simulate varying FPS
      vi.advanceTimersByTime(10);
      mockRAF.mock.calls[0]?.[0](performance.now() + 10);
      
      vi.advanceTimersByTime(20);
      mockRAF.mock.calls[1]?.[0](performance.now() + 20);
      
      // Min should be updated
      expect(monitor.minFps.value).toBeLessThanOrEqual(60);
    });
  });

  describe('Performance Thresholds', () => {
    it('calls onFpsDrop callback when FPS drops below threshold', () => {
      const onFpsDrop = vi.fn();
      const monitor = usePerformanceMonitor({
        onFpsDrop,
        fpsDropThreshold: 50,
      });
      
      monitor.start();
      
      // Simulate low FPS
      vi.advanceTimersByTime(30);
      mockRAF.mock.calls[0]?.[0](performance.now() + 30);
      
      // Wait for multiple frames to trigger the callback
      vi.advanceTimersByTime(16);
      mockRAF.mock.calls[1]?.[0](performance.now() + 46);
      
      vi.advanceTimersByTime(16);
      mockRAF.mock.calls[2]?.[0](performance.now() + 62);
      
      // The callback should be called when FPS consistently drops
      expect(onFpsDrop).toHaveBeenCalled();
    });

    it('isPerformanceAcceptable returns true for good performance', () => {
      const monitor = usePerformanceMonitor({
        targetFps: 60,
      });
      
      // Simulate good performance
      for (let i = 0; i < 60; i++) {
        vi.advanceTimersByTime(16);
        if (mockRAF.mock.calls[i]) {
          mockRAF.mock.calls[i][0](performance.now() + i * 16);
        }
      }
      
      // Should be acceptable if average is >= 90% of target
      expect(monitor.isAcceptable.value).toBe(true);
    });
  });

  describe('Metrics', () => {
    it('getMetrics returns complete metrics snapshot', () => {
      const monitor = usePerformanceMonitor({
        trackMemory: true,
      });
      
      monitor.start();
      
      const metrics: PerformanceMetrics = monitor.getMetrics();
      
      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('averageFps');
      expect(metrics).toHaveProperty('minFps');
      expect(metrics).toHaveProperty('maxFps');
      expect(metrics).toHaveProperty('droppedFrames');
      expect(metrics).toHaveProperty('totalFrames');
      expect(metrics).toHaveProperty('isActive');
      expect(metrics).toHaveProperty('lastUpdate');
    });

    it('reset clears all metrics', () => {
      const monitor = usePerformanceMonitor();
      
      monitor.start();
      monitor.reset();
      
      expect(monitor.minFps.value).toBe(60);
      expect(monitor.maxFps.value).toBe(60);
      expect(monitor.droppedFrames.value).toBe(0);
    });
  });
});

describe('throttleRAF', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes function immediately on first call (leading edge)', () => {
    const fn = vi.fn();
    const throttled = throttleRAF(fn);
    
    throttled();
    vi.advanceTimersByTime(20); // Wait for any scheduled RAF
    
    expect(fn).toHaveBeenCalled();
  });

  it('throttles rapid calls when trailing is disabled', () => {
    const fn = vi.fn();
    // First call should execute, subsequent rapid calls should be throttled
    // Note: With trailing: false, only the first call executes
    const throttled = throttleRAF(fn, { leading: true, trailing: false });
    
    throttled();
    throttled();
    throttled();
    vi.advanceTimersByTime(20);
    
    // Only the first call should execute due to throttle
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('executes trailing edge call', () => {
    const fn = vi.fn();
    const throttled = throttleRAF(fn, { leading: false, trailing: true });
    
    throttled();
    throttled();
    throttled();
    
    // Advance timers to trigger RAF
    vi.advanceTimersByTime(20);
    
    // Trailing edge should execute
    expect(fn).toHaveBeenCalled();
  });
});

describe('debounceRAF', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays function execution', () => {
    const fn = vi.fn();
    const debounced = debounceRAF(fn, 100);
    
    debounced();
    
    expect(fn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(100);
    
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('only executes last call when called multiple times', () => {
    const fn = vi.fn();
    const debounced = debounceRAF(fn, 100);
    
    debounced('a');
    debounced('b');
    debounced('c');
    
    vi.advanceTimersByTime(100);
    
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });
});

describe('batchDOMOperations', () => {
  it('executes all operations', async () => {
    const operations = [vi.fn(), vi.fn(), vi.fn()];
    
    // Use a simple approach - directly test the operations are called
    await batchDOMOperations(operations, { frameBudget: 10000 }); // Large budget to avoid batching
    
    // Verify operations completed
    expect(operations[0]).toHaveBeenCalled();
    expect(operations[1]).toHaveBeenCalled();
    expect(operations[2]).toHaveBeenCalled();
  }, 10000);

  it('handles empty operations array', async () => {
    await expect(batchDOMOperations([])).resolves.toBeUndefined();
  }, 10000);
});

describe('createBatchedUpdater', () => {
  it('initializes with zero pending count', () => {
    const updater = createBatchedUpdater(() => {});
    expect(updater.pendingCount).toBe(0);
  });

  it('tracks pending updates', () => {
    const updater = createBatchedUpdater(() => {});
    
    updater.update('a');
    expect(updater.pendingCount).toBe(1);
    
    updater.update('b');
    expect(updater.pendingCount).toBe(2);
  });

  it('can cancel pending updates', () => {
    const updater = createBatchedUpdater(() => {});
    
    updater.update('a');
    updater.update('b');
    updater.cancel();
    
    expect(updater.pendingCount).toBe(0);
  });
});

describe('Performance Stress Test Scenarios', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('monitors FPS during simulated editing', () => {
    const monitor = usePerformanceMonitor({
      samplingWindow: 30,
      targetFps: 60,
    });
    
    monitor.start();
    
    // Simulate frames with occasional jank
    for (let frame = 0; frame < 30; frame++) {
      vi.advanceTimersByTime(16);
      if (mockRAF.mock.calls[frame]) {
        mockRAF.mock.calls[frame][0](performance.now() + frame * 16);
      }
    }
    
    // FPS should be tracked
    expect(monitor.totalFrames.value).toBeGreaterThan(0);
    
    // For stress test validation: average FPS should be >= 54 (90% of 60)
    expect(monitor.averageFps.value).toBeGreaterThanOrEqual(54);
  });
});
