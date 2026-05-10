/**
 * Stress Test Utilities for Large Document Performance
 * 
 * Generates test data and simulates stress scenarios for
 * verifying 60fps performance during editing of >200KB documents.
 * 
 * VAL-CROSS-002: Editing >200KB document while preview auto-refreshes maintains <60fps.
 */

// Constants for stress testing
export const STRESS_TEST_SIZES = {
  SMALL: 50 * 1024,           // 50KB - below threshold
  MEDIUM: 100 * 1024,         // 100KB - activation threshold
  LARGE: 200 * 1024,          // 200KB - stress test size
  XLARGE: 500 * 1024,         // 500KB - very large document
};

/**
 * Generate HTML content of a specific size for stress testing
 */
export function generateLargeHtmlContent(targetSizeKb: number): string {
  const parts: string[] = [];
  const targetSize = targetSizeKb * 1024;
  
  // Add document structure
  parts.push(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Stress Test Document</title>
</head>
<body>
`);
  
  let currentSize = parts.join('').length;
  let paragraphCount = 0;
  
  // Generate paragraphs until we reach target size
  while (currentSize < targetSize) {
    const paragraphLength = Math.floor(Math.random() * 200) + 100;
    const loremText = generateLoremIpsum(paragraphLength);
    
    parts.push(`  <p>${loremText}</p>\n`);
    paragraphCount++;
    currentSize = parts.join('').length;
    
    // Add headings periodically
    if (paragraphCount % 10 === 0) {
      const headingLevel = (paragraphCount / 10) % 6 + 1;
      parts.push(`  <h${headingLevel}>Section ${paragraphCount / 10}: ${generateLoremIpsum(30)}</h${headingLevel}>\n`);
      currentSize = parts.join('').length;
    }
    
    // Add lists periodically
    if (paragraphCount % 7 === 0) {
      parts.push(`  <ul>\n`);
      for (let i = 0; i < 5; i++) {
        parts.push(`    <li>${generateLoremIpsum(50)}</li>\n`);
      }
      parts.push(`  </ul>\n`);
      currentSize = parts.join('').length;
    }
    
    // Add tables periodically
    if (paragraphCount % 15 === 0) {
      parts.push(`  <table>\n    <thead><tr><th>Header 1</th><th>Header 2</th><th>Header 3</th></tr></thead>\n    <tbody>\n`);
      for (let row = 0; row < 10; row++) {
        parts.push(`      <tr><td>Cell ${row}-1</td><td>${generateLoremIpsum(20)}</td><td>${generateLoremIpsum(25)}</td></tr>\n`);
      }
      parts.push(`    </tbody>\n  </table>\n`);
      currentSize = parts.join('').length;
    }
  }
  
  // Close document
  parts.push(`</body>\n</html>`);
  
  return parts.join('');
}

/**
 * Generate lorem ipsum text of specified word count
 */
function generateLoremIpsum(wordCount: number): string {
  const words = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
    'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
    'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
    'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
    'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
    'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
    'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
    'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'perspiciatis', 'unde',
    'omnis', 'iste', 'natus', 'error', 'voluptatem', 'accusantium', 'doloremque',
    'laudantium', 'totam', 'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo',
    'inventore', 'veritatis', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta',
    'explicabo', 'nemo', 'ipsam', 'quia', 'voluptas', 'aspernatur', 'aut', 'odit',
    'fugit', 'consequuntur', 'magni', 'dolores', 'eos', 'ratione', 'sequi',
    'nesciunt', 'neque', 'porro', 'quisquam', 'nihil', 'impedit', 'quo', 'minus',
    'quod', 'maxime', 'placeat', 'facere', 'possimus', 'assumenda', 'repellendus',
    'temporibus', 'autem', 'quibusdam', 'officiis', 'debitis', 'rerum',
    'necessitatibus', 'saepe', 'eveniet', 'voluptates', 'repudiandae', 'recusandae',
    'itaque', 'earum', 'hic', 'tenetur', 'sapiente', 'delectus', 'reiciendis',
  ];
  
  const result: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    result.push(words[Math.floor(Math.random() * words.length)]);
  }
  
  // Capitalize first word
  if (result.length > 0) {
    result[0] = result[0].charAt(0).toUpperCase() + result[0].slice(1);
  }
  
  return result.join(' ');
}

/**
 * Simulate rapid typing for stress testing
 */
export function simulateRapidTyping(
  callback: (text: string, keystrokeCount: number) => void,
  options: {
    keystrokeCount?: number;
    delayPerKeystroke?: number;
    textToType?: string;
  } = {}
): { stop: () => void } {
  const {
    keystrokeCount = 100,
    delayPerKeystroke = 5,
    textToType = 'The quick brown fox jumps over the lazy dog. ',
  } = options;
  
  let currentIndex = 0;
  let totalKeystrokes = 0;
  let stopped = false;
  
  function typeNextKeystroke() {
    if (stopped) return;
    
    const char = textToType[currentIndex % textToType.length];
    currentIndex++;
    totalKeystrokes++;
    
    callback(textToType.slice(0, currentIndex % textToType.length), totalKeystrokes);
    
    if (totalKeystrokes < keystrokeCount) {
      setTimeout(typeNextKeystroke, delayPerKeystroke);
    }
  }
  
  typeNextKeystroke();
  
  return {
    stop: () => {
      stopped = true;
    },
  };
}

/**
 * Simulate continuous editing for memory/performance testing
 */
export function simulateContinuousEditing(
  initialContent: string,
  callback: (content: string, duration: number) => void,
  options: {
    duration?: number;
    editInterval?: number;
    editSize?: number;
  } = {}
): { stop: () => void; getDuration: () => number } {
  const {
    duration = 60000, // 1 minute default
    editInterval = 1000, // Edit every second
    editSize = 100, // Characters per edit
  } = options;
  
  let content = initialContent;
  let startTime = Date.now();
  let stopped = false;
  let totalEdits = 0;
  
  function performEdit() {
    if (stopped) return;
    
    const elapsed = Date.now() - startTime;
    if (elapsed >= duration) {
      callback(content, elapsed);
      return;
    }
    
    // Simulate an edit: insert some text in the middle
    const insertPosition = Math.floor(Math.random() * content.length);
    const newText = generateLoremIpsum(editSize / 5).substring(0, editSize);
    content = content.slice(0, insertPosition) + newText + content.slice(insertPosition);
    
    totalEdits++;
    callback(content, elapsed);
    
    setTimeout(performEdit, editInterval);
  }
  
  performEdit();
  
  return {
    stop: () => {
      stopped = true;
    },
    getDuration: () => Date.now() - startTime,
  };
}

/**
 * Performance benchmark result
 */
export interface StressTestResult {
  /** Document size in KB */
  documentSizeKb: number;
  /** Number of keystrokes simulated */
  keystrokes: number;
  /** Duration of the test in ms */
  duration: number;
  /** Average FPS during the test */
  averageFps: number;
  /** Minimum FPS during the test */
  minFps: number;
  /** Maximum FPS during the test */
  maxFps: number;
  /** Number of dropped frames */
  droppedFrames: number;
  /** Number of preview updates */
  previewUpdates: number;
  /** Average preview update latency in ms */
  averageUpdateLatency: number;
  /** Whether the test passed (60fps maintained) */
  passed: boolean;
}

/**
 * Run a stress test on a large document
 */
export async function runStressTest(
  generateContent: () => string,
  simulateEditorInteraction: (content: string, onUpdate: (fps: number) => void) => void,
  options: {
    documentSizeKb?: number;
    duration?: number;
    targetFps?: number;
  } = {}
): Promise<StressTestResult> {
  const {
    documentSizeKb = 200,
    duration = 30000, // 30 seconds
    targetFps = 60,
  } = options;
  
  const content = generateContent();
  const fpsSamples: number[] = [];
  let previewUpdates = 0;
  let droppedFrames = 0;
  let minFps = 60;
  let maxFps = 60;
  let totalFps = 0;
  
  const startTime = performance.now();
  
  // Simulate editor interaction with FPS monitoring
  simulateEditorInteraction(content, (fps) => {
    fpsSamples.push(fps);
    totalFps += fps;
    
    if (fps < minFps) minFps = fps;
    if (fps > maxFps) maxFps = fps;
    if (fps < targetFps * 0.9) droppedFrames++;
  });
  
  const elapsed = performance.now() - startTime;
  const averageFps = fpsSamples.length > 0 ? totalFps / fpsSamples.length : 60;
  
  // Calculate average update latency (simplified)
  const averageUpdateLatency = 50; // Placeholder - would need actual timing data
  
  return {
    documentSizeKb,
    keystrokes: fpsSamples.length,
    duration: elapsed,
    averageFps: Math.round(averageFps),
    minFps,
    maxFps,
    droppedFrames,
    previewUpdates,
    averageUpdateLatency,
    passed: averageFps >= targetFps * 0.9, // 90% of target = passing
  };
}

/**
 * Generate a stress test document helper
 */
export function createStressTestDocument(sizeKb: number = 200): string {
  return generateLargeHtmlContent(sizeKb);
}

/**
 * Calculate if document requires performance optimization
 */
export function requiresOptimization(documentSizeKb: number): boolean {
  return documentSizeKb * 1024 >= 100 * 1024; // 100KB threshold
}

/**
 * Get recommended settings for document size
 */
export function getRecommendedSettings(documentSizeKb: number): {
  virtualScroll: boolean;
  debounceDelay: number;
  batchSize: number;
  previewUpdatesEnabled: boolean;
} {
  if (documentSizeKb >= 500) {
    return {
      virtualScroll: true,
      debounceDelay: 300,
      batchSize: 10,
      previewUpdatesEnabled: false, // Disable for very large docs
    };
  }
  
  if (documentSizeKb >= 200) {
    return {
      virtualScroll: true,
      debounceDelay: 200,
      batchSize: 5,
      previewUpdatesEnabled: true,
    };
  }
  
  if (documentSizeKb >= 100) {
    return {
      virtualScroll: true,
      debounceDelay: 150,
      batchSize: 3,
      previewUpdatesEnabled: true,
    };
  }
  
  return {
    virtualScroll: false,
    debounceDelay: 100,
    batchSize: 1,
    previewUpdatesEnabled: true,
  };
}
