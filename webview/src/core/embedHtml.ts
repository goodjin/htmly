/**
 * HTML to Embedded HTML converter.
 * Converts external resources (images, CSS, fonts) to inline/embedded format
 * for standalone HTML files that work without network access.
 */

import { JSDOM } from 'jsdom';

// Web-safe font stacks for fallback
const WEB_SAFE_FONTS: Record<string, string> = {
  // Sans-serif
  'arial': 'Arial, Helvetica, sans-serif',
  'helvetica': 'Helvetica, Arial, sans-serif',
  'verdana': 'Verdana, Geneva, sans-serif',
  'tahoma': 'Tahoma, Verdana, sans-serif',
  'trebuchet ms': '"Trebuchet MS", sans-serif',
  'gill sans': '"Gill Sans", "Gill Sans MT", sans-serif',
  'impact': 'Impact, Charcoal, sans-serif',
  // Serif
  'times new roman': '"Times New Roman", Times, serif',
  'georgia': 'Georgia, "Times New Roman", serif',
  'palatino': '"Palatino Linotype", "Book Antiqua", Palatino, serif',
  'book antiqua': '"Book Antiqua", Palatino, serif',
  // Monospace
  'courier new': '"Courier New", Courier, monospace',
  'lucida console': '"Lucida Console", Monaco, monospace',
  'monaco': 'Monaco, "Courier New", monospace',
  // Cursive/Fantasy
  'comic sans ms': '"Comic Sans MS", cursive, sans-serif',
  'copperplate': 'Copperplate, "Papyrus", fantasy',
  'papyrus': 'Papyrus, fantasy',
};

// Default embedded styles
const DEFAULT_EMBEDDED_STYLES = `
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    line-height: 1.6;
    max-width: 100%;
    padding: 20px;
    box-sizing: border-box;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  td, th {
    border: 1px solid #ddd;
    padding: 8px;
  }
  pre, code {
    background-color: #f4f4f4;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: "Courier New", Courier, monospace;
  }
  pre {
    padding: 12px;
    overflow-x: auto;
  }
`;

// Cache for converted images (useful when same image appears multiple times)
const imageCache = new Map<string, string>();

export interface EmbedHtmlOptions {
  /**
   * Whether to inline styles from <style> tags and class attributes
   * @default false
   */
  inlineStyles?: boolean;
  
  /**
   * Whether to attempt converting images to base64 data URIs
   * @default false (requires network access to fetch images)
   */
  embedImages?: boolean;
  
  /**
   * Maximum size in bytes for images to embed (larger images are skipped)
   * @default 5MB
   */
  maxImageSize?: number;
  
  /**
   * Custom CSS to inject into the embedded document
   */
  customCss?: string;
}

/**
 * Reset the image cache (useful for testing)
 */
export function resetImageCache(): void {
  imageCache.clear();
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    'webp': 'image/webp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if a URL is a data URI (already embedded)
 */
function isDataUri(url: string): boolean {
  return url.trim().toLowerCase().startsWith('data:');
}

/**
 * Check if a URL is an external HTTP(S) URL
 */
function isExternalUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Check if a URL is a relative path (local file reference)
 */
function isRelativePath(url: string): boolean {
  const trimmed = url.trim();
  // Starts with / (absolute path), ./ or ../ (relative path), or no protocol at all
  return trimmed.startsWith('/') || 
         trimmed.startsWith('./') || 
         trimmed.startsWith('../') ||
         (!trimmed.includes('://') && !trimmed.startsWith('data:'));
}

/**
 * Convert an image URL to base64 data URI
 * In browser context, this uses fetch to get the image
 */
async function imageToBase64(imageSrc: string): Promise<string> {
  // Check cache first
  if (imageCache.has(imageSrc)) {
    return imageCache.get(imageSrc)!;
  }

  // If already a data URI, return as-is
  if (isDataUri(imageSrc)) {
    return imageSrc;
  }

  // If it's an external URL, try to fetch it (browser context)
  if (isExternalUrl(imageSrc)) {
    try {
      const response = await fetch(imageSrc);
      if (!response.ok) {
        console.warn(`Failed to fetch image: ${imageSrc}`);
        return imageSrc; // Return original URL on failure
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          imageCache.set(imageSrc, base64);
          resolve(base64);
        };
        reader.onerror = () => {
          console.warn(`Failed to read image as base64: ${imageSrc}`);
          resolve(imageSrc); // Return original on failure
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn(`Error converting image to base64: ${imageSrc}`, error);
      return imageSrc;
    }
  }

  // For relative paths or other URLs we can't process, return original
  return imageSrc;
}

/**
 * Process images in the HTML document
 */
async function processImages(dom: JSDOM, options: EmbedHtmlOptions): Promise<void> {
  if (!options.embedImages) return;

  const images = dom.window.document.querySelectorAll('img');
  const imagePromises: Promise<void>[] = [];

  for (const img of images) {
    const src = img.getAttribute('src');
    if (!src || isDataUri(src)) continue;

    const promise = (async () => {
      const base64 = await imageToBase64(src);
      img.setAttribute('src', base64);
    })();
    imagePromises.push(promise);
  }

  await Promise.all(imagePromises);
}

/**
 * Process background images in inline styles
 */
async function processBackgroundImages(dom: JSDOM, options: EmbedHtmlOptions): Promise<void> {
  if (!options.embedImages) return;

  const elementsWithStyle = dom.window.document.querySelectorAll('[style]');
  const stylePromises: Promise<void>[] = [];

  for (const el of elementsWithStyle) {
    const style = el.getAttribute('style') || '';
    
    // Look for background-image: url(...)
    const urlMatch = style.match(/background-image\s*:\s*url\(['"]?([^'")]+)['"]?\)/i);
    if (urlMatch) {
      const imageUrl = urlMatch[1];
      if (!isDataUri(imageUrl)) {
        const promise = (async () => {
          const base64 = await imageToBase64(imageUrl);
          const newStyle = style.replace(urlMatch[0], `background-image: url("${base64}")`);
          el.setAttribute('style', newStyle);
        })();
        stylePromises.push(promise);
      }
    }
  }

  await Promise.all(stylePromises);
}

/**
 * Process font-family declarations, replacing custom fonts with web-safe fallbacks
 */
function processFonts(dom: JSDOM): void {
  const allElements = dom.window.document.querySelectorAll('*');
  
  for (const el of allElements) {
    const computedFontFamily = el.style.fontFamily;
    if (!computedFontFamily) continue;

    // Check if the font-family contains a non-web-safe font
    const fonts = computedFontFamily.split(',').map(f => f.trim().toLowerCase().replace(/['"]/g, ''));
    let hasCustomFont = false;
    let processedFonts: string[] = [];

    for (const font of fonts) {
      // Remove size qualifiers like "Bold" or "Italic"
      const baseFont = font.replace(/\s+(bold|italic|oblique|light|thin|medium|regular|semibold|extrabold|black)$/i, '').trim();
      
      if (WEB_SAFE_FONTS[baseFont]) {
        processedFonts.push(WEB_SAFE_FONTS[baseFont].split(',')[0]); // Use primary web-safe font
      } else {
        // Check if it's already a web-safe fallback stack
        const isAlreadySafe = fonts.some(safe => 
          Object.values(WEB_SAFE_FONTS).some(webSafe => webSafe.toLowerCase().includes(safe.toLowerCase()))
        );
        if (!isAlreadySafe) {
          hasCustomFont = true;
        }
        processedFonts.push(font);
      }
    }

    // Add a safe fallback at the end if there's a custom font
    if (hasCustomFont) {
      processedFonts.push('sans-serif');
    }
  }
}

/**
 * Remove dangerous elements and attributes for security
 */
function sanitizeContent(dom: JSDOM): void {
  // Remove script tags
  const scripts = dom.window.document.querySelectorAll('script');
  scripts.forEach(s => s.remove());

  // Remove event handler attributes
  const allElements = dom.window.document.querySelectorAll('*');
  const eventHandlers = [
    'onclick', 'ondblclick', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseover',
    'onmouseup', 'onload', 'onerror', 'onabort', 'onblur', 'onchange', 'onfocus',
    'onreset', 'onsubmit', 'onunload', 'onkeydown', 'onkeypress', 'onkeyup',
    'onresize', 'onscroll', 'oncopy', 'oncut', 'onpaste', 'onanimationend',
    'onanimationiteration', 'onanimationstart', 'ontransitionend', 'oninput'
  ];

  for (const el of allElements) {
    for (const handler of eventHandlers) {
      el.removeAttribute(handler);
    }
    // Also remove any attribute starting with 'on'
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    }
  }

  // Remove iframe elements
  const iframes = dom.window.document.querySelectorAll('iframe');
  iframes.forEach(i => i.remove());

  // Remove object and embed elements (potential security risks)
  const objects = dom.window.document.querySelectorAll('object, embed, applet');
  objects.forEach(o => o.remove());
}

/**
 * Extract and inline styles from <style> tags
 */
function inlineStylesFromStyleTags(dom: JSDOM): void {
  const styleTags = dom.window.document.querySelectorAll('style');
  const cssRules: string[] = [];

  for (const styleTag of styleTags) {
    cssRules.push(styleTag.textContent || '');
  }

  // The styles remain in <style> tags for now
  // In a full implementation, we would parse these and apply to elements
  // For now, we preserve the <style> tags which browsers handle natively
}

/**
 * Get all <style> tags from the document (including head)
 */
function getStyleTags(dom: JSDOM): string[] {
  const styleTags: string[] = [];
  
  // Check document head
  const head = dom.window.document.head;
  if (head) {
    const headStyles = head.querySelectorAll('style');
    for (const style of headStyles) {
      const content = style.textContent?.trim();
      if (content) {
        styleTags.push(content);
      }
    }
  }
  
  // Check body (style tags can appear in body too)
  const body = dom.window.document.body;
  if (body) {
    const bodyStyles = body.querySelectorAll('style');
    for (const style of bodyStyles) {
      const content = style.textContent?.trim();
      if (content) {
        styleTags.push(content);
      }
    }
  }
  
  return styleTags;
}

/**
 * Build the complete embedded HTML document
 */
function buildEmbeddedDocument(
  dom: JSDOM,
  options: EmbedHtmlOptions
): string {
  // Get the content - either the body or the full document
  let content: string;
  const body = dom.window.document.body;
  
  if (body) {
    content = body.innerHTML;
  } else {
    // No body found, use the entire document content
    content = dom.window.document.documentElement.innerHTML;
  }
  
  // Get style tags from the original document
  const originalStyles = getStyleTags(dom);
  
  // Build the embedded styles section
  const embeddedStyles = [
    DEFAULT_EMBEDDED_STYLES,
    ...originalStyles,
    options.customCss || ''
  ].filter(Boolean).join('\n');

  const doctype = '<!DOCTYPE html>';
  const html = `<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${embeddedStyles}
  </style>
</head>
<body>
${content}
</body>
</html>`;

  return doctype + '\n' + html;
}

/**
 * Convert HTML string to embedded HTML format.
 * 
 * This function takes an HTML string and converts it to a standalone HTML document
 * that works without external dependencies:
 * - External images are converted to base64 data URIs (if embedImages option is true)
 * - CSS is inlined or preserved in <style> tags
 * - Custom fonts are replaced with web-safe fallbacks
 * - Scripts and dangerous content are removed
 * 
 * @param html - The HTML string to convert
 * @param options - Conversion options
 * @returns The embedded HTML string
 */
export async function embedHtml(html: string, options: EmbedHtmlOptions = {}): Promise<string> {
  // Handle empty or null input
  if (!html || typeof html !== 'string') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${DEFAULT_EMBEDDED_STYLES}
  </style>
</head>
<body>
</body>
</html>`;
  }

  // Parse the HTML
  const dom = new JSDOM(html);

  // Sanitize content (remove scripts, event handlers, etc.)
  sanitizeContent(dom);

  // Process images (async operation)
  await processImages(dom, options);

  // Process background images (async operation)
  await processBackgroundImages(dom, options);

  // Process fonts (replace custom fonts with web-safe fallbacks)
  processFonts(dom);

  // Handle inline styles
  if (options.inlineStyles) {
    inlineStylesFromStyleTags(dom);
  }

  // Build the final embedded document
  return buildEmbeddedDocument(dom, options);
}

/**
 * Synchronous version of embedHtml that doesn't convert images to base64
 * Useful when network access is not available
 */
export function embedHtmlSync(html: string, options: EmbedHtmlOptions = {}): string {
  // Handle empty or null input
  if (!html || typeof html !== 'string') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${DEFAULT_EMBEDDED_STYLES}
  </style>
</head>
<body>
</body>
</html>`;
  }

  // Parse the HTML
  const dom = new JSDOM(html);

  // Sanitize content (remove scripts, event handlers, etc.)
  sanitizeContent(dom);

  // Process fonts (replace custom fonts with web-safe fallbacks)
  processFonts(dom);

  // Handle inline styles
  if (options.inlineStyles) {
    inlineStylesFromStyleTags(dom);
  }

  // Build the final embedded document
  return buildEmbeddedDocument(dom, options);
}

/**
 * Get information about images in the HTML that could be embedded
 */
export function getImageInfo(html: string): { src: string; isDataUri: boolean; isExternal: boolean }[] {
  const images: { src: string; isDataUri: boolean; isExternal: boolean }[] = [];
  
  if (!html || typeof html !== 'string') {
    return images;
  }

  const dom = new JSDOM(html);
  const imgElements = dom.window.document.querySelectorAll('img');

  for (const img of imgElements) {
    const src = img.getAttribute('src') || '';
    images.push({
      src,
      isDataUri: isDataUri(src),
      isExternal: isExternalUrl(src),
    });
  }

  return images;
}
