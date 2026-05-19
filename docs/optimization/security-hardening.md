# Security Hardening Design

**Node**: security-hardening  
**Workflow**: Htmly Implementation Optimization Plan  
**Status**: Complete

---

## 1. Security Architecture Proposal

### 1.1 Overview

The htmly extension has three critical security vulnerabilities that require immediate hardening:

| Vulnerability | Severity | Location | Current State |
|--------------|----------|----------|---------------|
| Regex-based HTML parsing | **High** | `exportUtils.ts:68-460` | Fragile regex can be bypassed with malformed input |
| WikiLink XSS | **Medium** | `WikiLink.ts:175` | `title` attribute not escaped |
| Credential plaintext storage | **High** | `editorProvider.ts:238-250` | S3/Cloudinary keys in VS Code config |

### 1.2 Security Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Extension Host (Node.js)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ VS Code     │  │ Credential   │  │ Input Validation    │  │
│  │ SecretStorage│  │ Service      │  │ & Sanitization      │  │
│  └─────────────┘  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    Message Passing (postMessage)
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Webview (Browser Context)               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ CSP Header  │  │ DOMPurify    │  │ WikiLink            │  │
│  │ Enforcement │  │ Sanitization │  │ XSS Prevention      │  │
│  └─────────────┘  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Issue Analysis

### 2.1 Issue #1: Regex-Based HTML Parsing

**File**: `src/extension/exportUtils.ts`  
**Lines**: 68-460 (entire `convertToMarkdown`, `convertToPlainText`, `sanitizeContent` functions)

**Current Problem**:
```typescript
// Line 75 - Fragile regex that can be bypassed
markdown = markdown.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

// Line 284-287 - Regex-based dangerous content removal
text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
```

**Vulnerabilities**:
- Nested tags can confuse regex parsers (e.g., `<code><script>alert(1)</script></code>`)
- Malformed HTML can bypass tag matching
- ReDoS (Regular Expression Denial of Service) possible with crafted input
- Content inside `<script>` tags extracted before stripping

### 2.2 Issue #2: WikiLink XSS Risk

**File**: `webview/src/extensions/WikiLink.ts`  
**Line**: 175

**Current Code**:
```typescript
renderHTML({ node, HTMLAttributes }) {
  const page = node.attrs.page || '';
  return [
    'a',
    mergeAttributes({ 
      class: 'wiki-link',
      'data-page': page,
      href: '#',
      title: `Open page: ${page}`,  // ← XSS: page not escaped
    }, HTMLAttributes),
    page,  // ← XSS: page not escaped as text content
  ];
}
```

**Note**: There's an `escapeHtml` function at line 240, but it's NOT used in `renderHTML`:
```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

**Attack Vector**: User creates page with name `"><script>alert('XSS')</script><div class="` which would render as:
```html
<a class="wiki-link" data-page=""><script>alert('XSS')</script>" title="Open page: "><script>alert('XSS')</script>">"><script>alert('XSS')</script></a>
```

### 2.3 Issue #3: Credential Plaintext Storage

**File**: `src/extension/editorProvider.ts`  
**Lines**: 238-250

**Current Implementation**:
```typescript
cloudStorage: {
  provider: config.get<CloudStorageProvider>('cloudStorage.provider', 'none'),
  s3: {
    accessKeyId: config.get<string>('cloudStorage.s3.accessKeyId', ''),
    secretAccessKey: config.get<string>('cloudStorage.s3.secretAccessKey', ''),
    bucket: config.get<string>('cloudStorage.s3.bucket', ''),
    region: config.get<string>('cloudStorage.s3.region', 'us-east-1'),
  },
  cloudinary: {
    apiKey: config.get<string>('cloudStorage.cloudinary.apiKey', ''),
    apiSecret: config.get<string>('cloudStorage.cloudinary.apiSecret', ''),
    cloudName: config.get<string>('cloudStorage.cloudinary.cloudName', ''),
  },
  imgbb: {
    apiKey: config.get<string>('cloudStorage.imgbb.apiKey', ''),
  },
},
```

**Problem**: All credentials stored in plaintext in VS Code's global configuration file (`settings.json`), accessible to anyone with file system access.

---

## 3. HTML Sanitization Strategy

### 3.1 Recommended Libraries

| Library | Environment | Pros | Cons |
|---------|-------------|------|------|
| **DOMPurify** | Browser/Webview | Industry standard, highly tested, handles edge cases | Requires JSDOM in Node.js |
| **sanitize-html** | Node.js | Works in Node.js without DOM, configurable | Slightly less strict than DOMPurify |
| **@vscode/vscode-l10n** | Both | Built-in VS Code support | Not for sanitization |

**Recommendation**:
- **Webview**: Use DOMPurify (already browser-compatible)
- **Extension Host**: Use sanitize-html (works in Node.js without DOM)

### 3.2 Webview: DOMPurify Integration

**Add dependency** to `webview/package.json`:
```json
{
  "dependencies": {
    "dompurify": "^3.0.8"
  },
  "devDependencies": {
    "@types/dompurify": "^3.0.5"
  }
}
```

**Create sanitization module** `webview/src/core/sanitize.ts`:
```typescript
import DOMPurify from 'dompurify';

const CONFIG = {
  ALLOWED_TAGS: [
    'a', 'abbr', 'acronym', 'address', 'b', 'blockquote', 'br', 'caption',
    'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'dfn', 'div', 'dl',
    'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img',
    'ins', 'kbd', 'li', 'ol', 'p', 'pre', 'q', 's', 'samp', 'small',
    'span', 'strike', 'strong', 'sub', 'sup', 'table', 'tbody', 'td',
    'tfoot', 'th', 'thead', 'tr', 'u', 'ul', 'var'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id', 'style',
    'data-page', 'target', 'rel'
  ],
  FORBID_TAGS: ['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'applet'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
};

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: CONFIG.ALLOWED_TAGS,
    ALLOWED_ATTR: CONFIG.ALLOWED_ATTR,
    FORBID_TAGS: CONFIG.FORBID_TAGS,
    FORBID_ATTR: CONFIG.FORBID_ATTR,
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['target', 'rel'],
  });
}

export function sanitizeForExport(dirty: string): string {
  // Stricter sanitization for export - removes all potentially dangerous content
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code'],
    ALLOWED_ATTR: ['href', 'alt', 'title', 'class'],
    FORBID_TAGS: ['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'applet', 'img'],
    ALLOW_DATA_ATTR: false,
  });
}
```

### 3.3 Extension Host: sanitize-html Integration

**Add dependency** to `package.json`:
```json
{
  "dependencies": {
    "sanitize-html": "^2.11.0"
  }
}
```

**Create sanitization module** `src/core/sanitize.ts`:
```typescript
import sanitizeHtml from 'sanitize-html';

export function sanitizeForMarkdownConversion(dirty: string): string {
  // Allow more tags for markdown conversion as content is further processed
  return sanitizeHtml(dirty, {
    allowedTags: [
      'a', 'abbr', 'acronym', 'address', 'b', 'blockquote', 'br', 'caption',
      'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'dfn', 'div', 'dl',
      'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img',
      'ins', 'kbd', 'li', 'ol', 'p', 'pre', 'q', 's', 'samp', 'small',
      'span', 'strike', 'strong', 'sub', 'sup', 'table', 'tbody', 'td',
      'tfoot', 'th', 'thead', 'tr', 'u', 'ul', 'var'
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'name', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'td': ['colspan', 'rowspan', 'align'],
      'th': ['colspan', 'rowspan', 'align', 'scope'],
      'code': ['class'],
      'pre': ['class'],
    },
    transformTags: {
      'a': (tagName, attribs) => {
        // Add rel="noopener noreferrer" to external links
        if (attribs.href && (attribs.href.startsWith('http://') || attribs.href.startsWith('https://'))) {
          attribs.rel = 'noopener noreferrer';
          attribs.target = '_blank';
        }
        return { tagName, attribs };
      }
    },
    exclusiveFilter: (frame) => {
      // Remove dangerous tags
      return ['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'applet'].includes(frame.tag);
    }
  });
}
```

### 3.4 WikiLink XSS Fix

**File**: `webview/src/extensions/WikiLink.ts`  
**Location**: Lines 167-179

**Fix**:
```typescript
renderHTML({ node, HTMLAttributes }) {
  const page = node.attrs.page || '';
  const safePage = escapeHtml(page);
  return [
    'a',
    mergeAttributes({ 
      class: 'wiki-link',
      'data-page': safePage,
      href: '#',
      title: `Open page: ${safePage}`,  // Now properly escaped
    }, HTMLAttributes),
    safePage,  // Now properly escaped as text content
  ];
}
```

---

## 4. Credential Storage Solution

### 4.1 VS Code SecretStorage API

VS Code provides `vscode.SecretStorage` API for secure storage of sensitive data:

```typescript
export interface SecretStorage {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
  onDidChange: Event<SecretStorageChangeEvent>;
}
```

### 4.2 Credential Service Design

**Create** `src/extension/credentialService.ts`:

```typescript
import * as vscode from 'vscode';

const CLOUD_STORAGE_KEY_PREFIX = 'htmly:cloudStorage:';

export class CredentialService {
  private secretStorage: vscode.SecretStorage;

  constructor(secretStorage: vscode.SecretStorage) {
    this.secretStorage = secretStorage;
  }

  // S3 Credentials
  async getS3AccessKeyId(): Promise<string> {
    return await this.secretStorage.get(`${CLOUD_STORAGE_KEY_PREFIX}s3:accessKeyId`) ?? '';
  }

  async setS3AccessKeyId(value: string): Promise<void> {
    await this.secretStorage.store(`${CLOUD_STORAGE_KEY_PREFIX}s3:accessKeyId`, value);
  }

  async getS3SecretAccessKey(): Promise<string> {
    return await this.secretStorage.get(`${CLOUD_STORAGE_KEY_PREFIX}s3:secretAccessKey`) ?? '';
  }

  async setS3SecretAccessKey(value: string): Promise<void> {
    await this.secretStorage.store(`${CLOUD_STORAGE_KEY_PREFIX}s3:secretAccessKey`, value);
  }

  // Cloudinary Credentials
  async getCloudinaryApiKey(): Promise<string> {
    return await this.secretStorage.get(`${CLOUD_STORAGE_KEY_PREFIX}cloudinary:apiKey`) ?? '';
  }

  async setCloudinaryApiKey(value: string): Promise<void> {
    await this.secretStorage.store(`${CLOUD_STORAGE_KEY_PREFIX}cloudinary:apiKey`, value);
  }

  async getCloudinaryApiSecret(): Promise<string> {
    return await this.secretStorage.get(`${CLOUD_STORAGE_KEY_PREFIX}cloudinary:apiSecret`) ?? '';
  }

  async setCloudinaryApiSecret(value: string): Promise<void> {
    await this.secretStorage.store(`${CLOUD_STORAGE_KEY_PREFIX}cloudinary:apiSecret`, value);
  }

  async getCloudinaryCloudName(): Promise<string> {
    return await this.secretStorage.get(`${CLOUD_STORAGE_KEY_PREFIX}cloudinary:cloudName`) ?? '';
  }

  async setCloudinaryCloudName(value: string): Promise<void> {
    await this.secretStorage.store(`${CLOUD_STORAGE_KEY_PREFIX}cloudinary:cloudName`, value);
  }

  // ImgBB Credentials
  async getImgbbApiKey(): Promise<string> {
    return await this.secretStorage.get(`${CLOUD_STORAGE_KEY_PREFIX}imgbb:apiKey`) ?? '';
  }

  async setImgbbApiKey(value: string): Promise<void> {
    await this.secretStorage.store(`${CLOUD_STORAGE_KEY_PREFIX}imgbb:apiKey`, value);
  }

  // Migration helper - move from config to secrets
  async migrateFromConfig(): Promise<void> {
    const config = vscode.workspace.getConfiguration('htmly');
    
    // Migrate S3
    const s3AccessKeyId = config.get<string>('cloudStorage.s3.accessKeyId', '');
    const s3SecretAccessKey = config.get<string>('cloudStorage.s3.secretAccessKey', '');
    if (s3AccessKeyId && !(await this.getS3AccessKeyId())) {
      await this.setS3AccessKeyId(s3AccessKeyId);
    }
    if (s3SecretAccessKey && !(await this.getS3SecretAccessKey())) {
      await this.setS3SecretAccessKey(s3SecretAccessKey);
    }

    // Migrate Cloudinary
    const cloudinaryApiKey = config.get<string>('cloudStorage.cloudinary.apiKey', '');
    const cloudinaryApiSecret = config.get<string>('cloudStorage.cloudinary.apiSecret', '');
    const cloudinaryCloudName = config.get<string>('cloudStorage.cloudinary.cloudName', '');
    if (cloudinaryApiKey && !(await this.getCloudinaryApiKey())) {
      await this.setCloudinaryApiKey(cloudinaryApiKey);
    }
    if (cloudinaryApiSecret && !(await this.getCloudinaryApiSecret())) {
      await this.setCloudinaryApiSecret(cloudinaryApiSecret);
    }
    if (cloudinaryCloudName && !(await this.getCloudinaryCloudName())) {
      await this.setCloudinaryCloudName(cloudinaryCloudName);
    }

    // Migrate ImgBB
    const imgbbApiKey = config.get<string>('cloudStorage.imgbb.apiKey', '');
    if (imgbbApiKey && !(await this.getImgbbApiKey())) {
      await this.setImgbbApiKey(imgbbApiKey);
    }
  }

  // Clear all stored credentials
  async clearAll(): Promise<void> {
    const keys = [
      `${CLOUD_STORAGE_KEY_PREFIX}s3:accessKeyId`,
      `${CLOUD_STORAGE_KEY_PREFIX}s3:secretAccessKey`,
      `${CLOUD_STORAGE_KEY_PREFIX}cloudinary:apiKey`,
      `${CLOUD_STORAGE_KEY_PREFIX}cloudinary:apiSecret`,
      `${CLOUD_STORAGE_KEY_PREFIX}cloudinary:cloudName`,
      `${CLOUD_STORAGE_KEY_PREFIX}imgbb:apiKey`,
    ];
    for (const key of keys) {
      await this.secretStorage.delete(key);
    }
  }
}
```

### 4.3 Configuration Migration

**Update** `src/extension/editorProvider.ts`:

```typescript
// In your provider class
private credentialService: CredentialService;

constructor(context: vscode.ExtensionContext, ...) {
  // ... existing initialization
  this.credentialService = new CredentialService(context.secrets);
  
  // Migrate credentials on first run (after extension update)
  this.migrateCredentialsIfNeeded();
}

private async migrateCredentialsIfNeeded(): Promise<void> {
  const migrateKey = 'htmly:credentialsMigrated';
  const globalState = this.context.globalState;
  
  if (!globalState.get<boolean>(migrateKey)) {
    await this.credentialService.migrateFromConfig();
    await globalState.update(migrateKey, true);
  }
}

// Update getConfig() method to use credentials
private async getConfig(): Promise<HtmlyConfig> {
  const config = vscode.workspace.getConfiguration('htmly');
  
  return {
    // ... other config
    cloudStorage: {
      provider: config.get<CloudStorageProvider>('cloudStorage.provider', 'none'),
      s3: {
        accessKeyId: await this.credentialService.getS3AccessKeyId(),
        secretAccessKey: await this.credentialService.getS3SecretAccessKey(),
        bucket: config.get<string>('cloudStorage.s3.bucket', ''),
        region: config.get<string>('cloudStorage.s3.region', 'us-east-1'),
      },
      cloudinary: {
        apiKey: await this.credentialService.getCloudinaryApiKey(),
        apiSecret: await this.credentialService.getCloudinaryApiSecret(),
        cloudName: await this.credentialService.getCloudinaryCloudName(),
      },
      imgbb: {
        apiKey: await this.credentialService.getImgbbApiKey(),
      },
    },
    // ... other config
  };
}
```

### 4.4 Settings UI Updates

**Update** `package.json` configuration to mark credentials as deprecated:

```json
{
  "properties": {
    "htmly.cloudStorage.s3.secretAccessKey": {
      "type": "string",
      "default": "",
      "description": "[DEPRECATED] AWS S3 Secret Access Key - migrated to secure storage",
      "deprecationMessage": "Credentials are now stored securely. Please re-enter in the Htmly: Open Settings command."
    },
    "htmly.cloudStorage.cloudinary.apiSecret": {
      "type": "string", 
      "default": "",
      "description": "[DEPRECATED] Cloudinary API Secret - migrated to secure storage",
      "deprecationMessage": "Credentials are now stored securely. Please re-enter in the Htmly: Open Settings command."
    }
  }
}
```

---

## 5. CSP Configuration for Webview

### 5.1 Current CSP (Line 2307 in editorProvider.ts)

```typescript
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data: blob:; font-src ${webview.cspSource}; frame-src ${webview.cspSource} data: blob:; child-src ${webview.cspSource} data: blob:;">
```

### 5.2 Enhanced CSP with Strict Security

**Updated CSP**:
```
default-src 'none';
script-src 'nonce-{nonce}';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' https://*;
frame-src 'none';
object-src 'none';
base-uri 'self';
form-action 'none';
```

### 5.3 Implementation

**File**: `src/extension/editorProvider.ts`  
**Method**: `getWebviewHtml()`  
**Lines**: 2296-2316

```typescript
private getWebviewHtml(webview: vscode.Webview): string {
  const distPath = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview');
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, 'index.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, 'index.css'));
  const nonce = getNonce();

  // Strict CSP for webview
  const csp = [
    "default-src 'none'",
    // Scripts must have valid nonce - prevents inline script injection
    `script-src 'nonce-${nonce}'`,
    // Styles - allow self and unsafe-inline for Vue component styles
    "style-src 'self' 'unsafe-inline'",
    // Images - allow self, data URIs (for base64), blob URLs, and https sources
    "img-src 'self' data: blob: https:",
    // Fonts - allow self and data URIs
    "font-src 'self' data:",
    // Connect - only allow https connections for API calls
    "connect-src 'self' https:",
    // Frames - prevent clickjacking
    "frame-src 'none'",
    // Objects - prevent plugin-based attacks
    "object-src 'none'",
    // Base URI - prevent base tag injection
    "base-uri 'self'",
    // Form action - prevent form redirects
    "form-action 'none'",
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <link rel="stylesheet" href="${styleUri}">
  <title>Htmly</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
```

### 5.4 Webview-Side CSP Enforcement

**Add to** `webview/src/main.ts`:

```typescript
import { sanitizeHtml } from './core/sanitize';

// Hook into Vue's template compilation to sanitize dynamic HTML
// This provides defense-in-depth if CSP is bypassed
const originalCreateElement = window.document.createElement.bind(window.document);

window.document.createElement = function(tagName: string, options?: ElementCreationOptions) {
  const element = originalCreateElement(tagName, options);
  
  // If setting innerHTML on a div/span, sanitize
  if (tagName === 'div' || tagName === 'span') {
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    Object.defineProperty(element, 'innerHTML', {
      set(value: string) {
        originalInnerHTML?.set?.call(this, sanitizeHtml(value));
      },
      get() {
        return originalInnerHTML?.get?.call(this);
      }
    });
  }
  
  return element;
};
```

---

## 6. Input Sanitization Layer

### 6.1 Global Sanitization Module

**Create** `src/core/inputSanitization.ts`:

```typescript
/**
 * Central input sanitization module for Htmly
 * Provides defense-in-depth sanitization for all user content
 */

export interface SanitizationConfig {
  stripAllScripts: boolean;
  stripEventHandlers: boolean;
  stripIframes: boolean;
  allowDataAttrs: boolean;
  maxLength?: number;
}

const DEFAULT_CONFIG: SanitizationConfig = {
  stripAllScripts: true,
  stripEventHandlers: true,
  stripIframes: true,
  allowDataAttrs: true,
};

/**
 * Dangerous patterns that must always be stripped
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^>]*/gi,
  /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
];

/**
 * Event handler attribute patterns
 */
const EVENT_HANDLER_PATTERN = /\bon\w+\s*=/gi;

/**
 * Sanitize user input for safe storage and rendering
 */
export function sanitizeInput(input: string, config: Partial<SanitizationConfig> = {}): string {
  const opts = { ...DEFAULT_CONFIG, ...config };
  
  let result = input;
  
  // Apply dangerous pattern removal
  for (const pattern of DANGEROUS_PATTERNS) {
    result = result.replace(pattern, '');
  }
  
  // Remove event handlers if configured
  if (opts.stripEventHandlers) {
    result = result.replace(EVENT_HANDLER_PATTERN, '');
  }
  
  // Enforce max length if configured
  if (opts.maxLength && result.length > opts.maxLength) {
    result = result.substring(0, opts.maxLength);
  }
  
  return result;
}

/**
 * Sanitize for wiki link page names
 * Only allows safe characters, strips any HTML/JS
 */
export function sanitizeWikiLinkPageName(name: string): string {
  // Remove any HTML tags
  let result = name.replace(/<[^>]+>/g, '');
  
  // Remove any javascript: or data: URLs
  result = result.replace(/javascript:/gi, '');
  result = result.replace(/data:/gi, '');
  
  // Remove event handlers
  result = result.replace(EVENT_HANDLER_PATTERN, '');
  
  // Trim and limit length
  result = result.trim().substring(0, 256);
  
  return result;
}

/**
 * Validate URL is safe for linking
 */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const blockedProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const proto of blockedProtocols) {
    if (trimmed.startsWith(proto)) {
      return false;
    }
  }
  
  // Only allow http, https, mailto, and relative URLs
  const allowedPatterns = [
    /^https?:\/\//,
    /^mailto:/,
    /^\//,
    /^# /,
    /^[^/]+$/,  // Simple relative path
  ];
  
  return allowedPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Sanitize URL for safe linking
 */
export function sanitizeUrl(url: string): string {
  if (!isSafeUrl(url)) {
    return '#';
  }
  return url;
}
```

### 6.2 Integration Points

| Location | Sanitization Function | Purpose |
|----------|----------------------|---------|
| `WikiLink.ts:renderHTML` | `escapeHtml()` | Already exists, needs enforcement |
| `exportUtils.ts` | `sanitize-html` | Replace regex-based parsing |
| `editorProvider.ts:getConfig()` | `CredentialService` | Store secrets in SecretStorage |
| Any user content rendering | `sanitizeInput()` | Defense-in-depth |

---

## 7. Migration Strategy

### Phase 1: Immediate Security Fixes (Week 1)

1. **Fix WikiLink XSS** (1 hour)
   - Add `escapeHtml()` to `renderHTML` method
   - Add unit tests for XSS vectors

2. **Add CSP enhancements** (2 hours)
   - Update `getWebviewHtml()` with strict CSP
   - Verify no functionality breaks

### Phase 2: Credential Security (Week 2)

1. **Create CredentialService** (4 hours)
   - Implement `SecretStorage` integration
   - Add migration from config
   - Update settings UI with deprecation warnings

2. **Update cloud upload code** (2 hours)
   - Read credentials from SecretStorage
   - Test S3/Cloudinary/ImgBB uploads

### Phase 3: HTML Sanitization (Week 3)

1. **Add dependencies** (1 hour)
   - Add `dompurify` to webview
   - Add `sanitize-html` to extension

2. **Replace regex in exportUtils** (8 hours)
   - Refactor `convertToMarkdown`
   - Refactor `convertToPlainText`
   - Add comprehensive tests

3. **Add sanitization module** (4 hours)
   - Create `src/core/inputSanitization.ts`
   - Add integration tests

### Phase 4: Verification (Week 4)

1. **Security testing** (8 hours)
   - XSS penetration testing
   - Credential storage audit
   - CSP verification

2. **Documentation** (2 hours)
   - Update security docs
   - Document migration path for users

---

## 8. Test Plan

### 8.1 XSS Test Cases

```typescript
describe('WikiLink XSS Prevention', () => {
  test('should escape script injection in page name', () => {
    const maliciousPage = '"><script>alert(1)</script>';
    const safePage = escapeHtml(maliciousPage);
    expect(safePage).not.toContain('<script>');
    expect(safePage).toBe('&quot;><script>alert(1)</script>');
  });

  test('should escape event handlers in page name', () => {
    const maliciousPage = 'test" onmouseover="alert(1)"';
    const safePage = escapeHtml(maliciousPage);
    expect(safePage).not.toContain('onmouseover');
  });

  test('should escape title attribute', () => {
    const maliciousPage = 'test"><img src=x onerror=alert(1)>';
    const { title } = renderWikiLink(maliciousPage);
    expect(title).not.toContain('<img');
  });
});
```

### 8.2 Credential Storage Tests

```typescript
describe('CredentialService', () => {
  test('should store and retrieve S3 credentials', async () => {
    await service.setS3AccessKeyId('AKIAIOSFODNN7EXAMPLE');
    await service.setS3SecretAccessKey('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    
    expect(await service.getS3AccessKeyId()).toBe('AKIAIOSFODNN7EXAMPLE');
    expect(await service.getS3SecretAccessKey()).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
  });

  test('should migrate from config', async () => {
    // Mock config with old credentials
    mockConfig.get('cloudStorage.s3.secretAccessKey').returnValue('oldSecret');
    
    await service.migrateFromConfig();
    
    expect(await service.getS3SecretAccessKey()).toBe('oldSecret');
  });
});
```

---

## 9. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/extension/credentialService.ts` | **Create** | VS Code SecretStorage service |
| `src/core/inputSanitization.ts` | **Create** | Centralized sanitization utilities |
| `src/extension/exportUtils.ts` | **Modify** | Replace regex with sanitize-html |
| `src/extension/editorProvider.ts` | **Modify** | Use CredentialService, enhance CSP |
| `webview/src/core/sanitize.ts` | **Create** | DOMPurify wrapper for webview |
| `webview/src/extensions/WikiLink.ts` | **Modify** | Apply escapeHtml to renderHTML |
| `webview/package.json` | **Modify** | Add DOMPurify dependency |
| `package.json` | **Modify** | Add sanitize-html dependency |

---

## 10. Summary

This design addresses three critical security vulnerabilities:

| Issue | Solution | Effort |
|-------|----------|--------|
| Regex HTML parsing | Replace with DOMPurify/sanitize-html | Medium (Week 3) |
| WikiLink XSS | Apply existing escapeHtml() | Quick (Week 1) |
| Credential storage | VS Code SecretStorage API | Medium (Week 2) |

The implementation follows defense-in-depth principles:
1. **CSP** - Blocks inline scripts and unauthorized resources
2. **HTML Sanitization** - DOMPurify/sanitize-html for all user content
3. **Credential Storage** - VS Code SecretStorage instead of plaintext config
4. **Input Validation** - Centralized sanitization for all user input

All changes maintain backward compatibility through migration paths.
