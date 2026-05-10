/**
 * usePerformanceMonitor Composable
 * 
 * Provides FPS monitoring and performance metrics for stress testing.
 * Used to verify 60fps performance during editing of large documents.
 * 
 * Performance targets (VAL-CROSS-002):
 * - 60fps maintained during simultaneous editing and preview
 * - Preview updates batched and throttled
 * - No jank during rapid typing
 */

import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

export interface PerformanceMetrics {
  /** Current FPS */
  fps: number;
  /** Average FPS over the sampling window */
  averageFps: number;
  /** Minimum FPS in the sampling window */
  minFps: number;
  /** Maximum FPS in the sampling window */
  maxFps: number;
  /** Number of dropped frames in the sampling window */
  droppedFrames: number;
  /** Total frames rendered */
  totalFrames: number;
  /** Memory usage in bytes (if available) */
  memoryUsage: number | null;
  /** Whether performance monitoring is active */
  isActive: boolean;
  /** Last update timestamp */
  lastUpdate: number;
}

export interface PerformanceMonitorOptions {
  /** FPS sampling window size (number of frames to average) */
  samplingWindow?: number;
  /** Target FPS (default 60) */
  targetFps?: number;
  /** Enable memory monitoring (default false) */
  trackMemory?: boolean;
  /** Callback when FPS drops below target */
  onFpsDrop?: (fps: number) => void;
  /** FPS drop threshold for triggering callback */
  fpsDropThreshold?: number;
}

const DEFAULT_OPTIONS: Required<PerformanceMonitorOptions> = {
  samplingWindow: 60,
  targetFps: 60,
  trackMemory: false,
  onFpsDrop: () => {},
  fpsDropThreshold: 30,
};

// FPS measurement state
let lastFrameTime = 0;
let frameCount = 0;
let fpsHistory: number[] = [];
let animationFrameId: number | null = null;
let dropThreshold = DEFAULT_OPTIONS.fpsDropThreshold;
let onFpsDropCallback = DEFAULT_OPTIONS.onFpsDrop;

/**
 * Measure FPS using requestAnimationFrame
 */
function measureFps(currentTime: number): number {
  if (lastFrameTime === 0) {
    lastFrameTime = currentTime;
    return 60; // Assume 60fps on first frame
  }

  const delta = currentTime - lastFrameTime;
  lastFrameTime = currentTime;

  // Calculate FPS from delta (cap at 120 to avoid unrealistic values)
  const fps = Math.min(120, Math.round(1000 / delta));
  return fps;
}

/**
 * Composable for monitoring performance metrics
 */
export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Set up callbacks
  dropThreshold = opts.fpsDropThreshold;
  onFpsDropCallback = opts.onFpsDrop;
  
  // State
  const isActive = ref(false);
  const currentFps = ref(60);
  const averageFps = ref(60);
  const minFps = ref(60);
  const maxFps = ref(60);
  const droppedFrames = ref(0);
  const totalFrames = ref(0);
  const memoryUsage = ref<number | null>(null);
  const lastUpdate = ref(performance.now());
  
  // Internal state for FPS tracking
  let localFpsHistory: number[] = [];
  let localMinFps = 60;
  let localMaxFps = 60;
  let localDroppedFrames = 0;
  let localTotalFrames = 0;
  let localLastFrameTime = 0;
  
  /**
   * Get current memory usage (if available)
   */
  function getMemoryUsage(): number | null {
    // Check for performance.memory API (Chrome only)
    const perf = performance as any;
    if (perf.memory) {
      return perf.memory.usedJSHeapSize;
    }
    return null;
  }
  
  /**
   * Animation frame callback for FPS measurement
   */
  function frameCallback(currentTime: number) {
    if (!isActive.value) return;
    
    // Measure FPS
    let fps = 60;
    if (localLastFrameTime > 0) {
      const delta = currentTime - localLastFrameTime;
      fps = Math.min(120, Math.round(1000 / delta));
      
      // Track dropped frames (frames that took longer than expected)
      const expectedDelta = 1000 / opts.targetFps;
      if (delta > expectedDelta * 1.5) {
        localDroppedFrames++;
      }
    }
    localLastFrameTime = currentTime;
    
    // Update FPS history
    localFpsHistory.push(fps);
    localTotalFrames++;
    
    // Maintain sampling window
    if (localFpsHistory.length > opts.samplingWindow) {
      localFpsHistory.shift();
    }
    
    // Update min/max
    if (fps < localMinFps) localMinFps = fps;
    if (fps > localMaxFps) localMaxFps = fps;
    
    // Calculate average
    const avg = localFpsHistory.reduce((a, b) => a + b, 0) / localFpsHistory.length;
    
    // Check for FPS drop
    if (fps < dropThreshold && localFpsHistory.length > 1) {
      // FPS is significantly below target
      onFpsDropCallback(fps);
    }
    
    // Update reactive state (throttled to reduce reactivity overhead)
    currentFps.value = fps;
    averageFps.value = Math.round(avg);
    minFps.value = localMinFps;
    maxFps.value = localMaxFps;
    droppedFrames.value = localDroppedFrames;
    totalFrames.value = localTotalFrames;
    lastUpdate.value = currentTime;
    
    // Update memory if tracking
    if (opts.trackMemory) {
      memoryUsage.value = getMemoryUsage();
    }
    
    // Schedule next frame
    animationFrameId = requestAnimationFrame(frameCallback);
  }
  
  /**
   * Start performance monitoring
   */
  function start() {
    if (isActive.value) return;
    
    // Reset state
    localFpsHistory = [];
    localMinFps = 60;
    localMaxFps = 60;
    localDroppedFrames = 0;
    localTotalFrames = 0;
    localLastFrameTime = 0;
    lastFrameTime = 0;
    frameCount = 0;
    
    isActive.value = true;
    animationFrameId = requestAnimationFrame(frameCallback);
    
    console.log('[PerformanceMonitor] Started');
  }
  
  /**
   * Stop performance monitoring
   */
  function stop() {
    isActive.value = false;
    
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    console.log('[PerformanceMonitor] Stopped');
  }
  
  /**
   * Reset all metrics
   */
  function reset() {
    localFpsHistory = [];
    localMinFps = 60;
    localMaxFps = 60;
    localDroppedFrames = 0;
    localTotalFrames = 0;
    
    currentFps.value = 60;
    averageFps.value = 60;
    minFps.value = 60;
    maxFps.value = 60;
    droppedFrames.value = 0;
    totalFrames.value = 0;
  }
  
  /**
   * Get current metrics snapshot
   */
  function getMetrics(): PerformanceMetrics {
    return {
      fps: currentFps.value,
      averageFps: averageFps.value,
      minFps: minFps.value,
      maxFps: maxFps.value,
      droppedFrames: droppedFrames.value,
      totalFrames: totalFrames.value,
      memoryUsage: memoryUsage.value,
      isActive: isActive.value,
      lastUpdate: lastUpdate.value,
    };
  }
  
  /**
   * Check if performance is acceptable
   */
  function isPerformanceAcceptable(): boolean {
    // Consider acceptable if average FPS is >= 90% of target
    return averageFps.value >= opts.targetFps * 0.9;
  }
  
  // Auto-stop on unmount
  onBeforeUnmount(() => {
    stop();
  });
  
  return {
    // State
    isActive,
    currentFps,
    averageFps,
    minFps,
    maxFps,
    droppedFrames,
    totalFrames,
    memoryUsage,
    
    // Computed
    isAcceptable: computed(() => isPerformanceAcceptable()),
    metrics: computed(() => getMetrics()),
    
    // Methods
    start,
    stop,
    reset,
    getMetrics,
    isPerformanceAcceptable,
    getMemoryUsage,
  };
}

/**
 * Create a throttled function that uses requestAnimationFrame
 * for smooth, frame-aligned execution.
 */
export function throttleRAF<T extends (...args: any[]) => any>(
  fn: T,
  options: { leading?: boolean; trailing?: boolean } = {}
): T {
  const { leading = true, trailing = true } = options;
  let lastCall = 0;
  let lastArgs: Parameters<T> | null = null;
  let rafId: number | null = null;
  let hasCalled = false;
  
  const throttled = (...args: Parameters<T>) => {
    const now = performance.now();
    const timeSinceLastCall = now - lastCall;
    
    lastArgs = args;
    
    // Leading edge: execute immediately if enough time has passed or if this is the first call
    if (leading && (!hasCalled || timeSinceLastCall >= 16)) {
      lastCall = now;
      hasCalled = true;
      fn(...args);
      return;
    }
    
    // Schedule trailing edge
    if (trailing && rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (lastArgs !== null) {
          lastCall = performance.now();
          fn(...lastArgs);
        }
      });
    }
    
    // Update last call time for leading edge
    if (leading && !hasCalled) {
      lastCall = now;
    }
  };
  
  // Cast to T for proper typing
  return throttled as T;
}

/**
 * Create a debounced function with optional RAF batching
 */
export function debounceRAF<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  
  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (lastArgs !== null) {
        fn(...lastArgs);
      }
    }, delay);
  };
  
  return debounced as T;
}

/**
 * Batch DOM operations using requestAnimationFrame
 */
export function batchDOMOperations(
  operations: (() => void)[],
  options: { frameBudget?: number } = {}
): Promise<void> {
  const { frameBudget = 16 } = options; // ~60fps by default
  
  return new Promise((resolve) => {
    let index = 0;
    const startTime = performance.now();
    
    function processBatch() {
      const batchStartTime = performance.now();
      
      while (index < operations.length) {
        const op = operations[index];
        op();
        index++;
        
        // Check if we're exceeding frame budget
        if (performance.now() - batchStartTime > frameBudget) {
          // Schedule next batch in next frame
          requestAnimationFrame(processBatch);
          return;
        }
      }
      
      // All operations complete
      resolve();
    }
    
    requestAnimationFrame(processBatch);
  });
}

/**
 * Create a performance-aware update function that batches
 * rapid updates and only applies the latest value.
 */
export function createBatchedUpdater<T>(
  applyUpdate: (value: T) => void,
  options: {
    batchWindow?: number;
    maxBatchSize?: number;
  } = {}
) {
  const { batchWindow = 16, maxBatchSize = 10 } = options;
  
  let pendingUpdate: T | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;
  let batchCount = 0;
  
  return {
    /**
     * Queue an update (only the latest value will be applied)
     */
    update(value: T) {
      pendingUpdate = value;
      batchCount++;
      
      // If we've accumulated too many updates, flush immediately
      if (batchCount >= maxBatchSize) {
        this.flush();
        return;
      }
      
      // Schedule flush after batch window
      if (timeoutId === null) {
        timeoutId = setTimeout(() => {
          this.flush();
        }, batchWindow);
      }
    },
    
    /**
     * Flush pending update immediately
     */
    flush() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      if (pendingUpdate !== null) {
        // Apply update in next animation frame for smooth rendering
        rafId = requestAnimationFrame(() => {
          rafId = null;
          applyUpdate(pendingUpdate!);
          pendingUpdate = null;
          batchCount = 0;
        });
      }
    },
    
    /**
     * Cancel any pending updates
     */
    cancel() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      pendingUpdate = null;
      batchCount = 0;
    },
    
    /**
     * Get pending update count
     */
    get pendingCount(): number {
      return batchCount;
    },
  };
}
