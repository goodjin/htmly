/**
 * Math Preview Extension for CodeMirror
 * Provides visual preview of LaTeX math expressions in source mode
 */
import { StateField, StateEffect } from '@codemirror/state';
import { EditorView, WidgetType, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import katex from 'katex';

// Effect to toggle math preview on/off
export const setMathPreviewEnabled = StateEffect.define<boolean>();

// Regex patterns for detecting math
const INLINE_MATH_REGEX = /\$([^\$\n]+?)\$/g;
const BLOCK_MATH_REGEX = /\$\$([^\$]+?)\$\$/gs;

// Math preview widget for rendering math inline
class MathPreviewWidget extends WidgetType {
  constructor(
    private math: string,
    private displayMode: boolean,
    private originalText: string
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = this.displayMode ? 'cm-math-preview-block' : 'cm-math-preview-inline';
    
    try {
      wrap.innerHTML = katex.renderToString(this.math, {
        displayMode: this.displayMode,
        throwOnError: false,
        errorColor: '#cc0000',
        trust: true,
        strict: false,
      });
    } catch (e) {
      wrap.innerHTML = `<span class="math-error">${this.escapeHtml(this.math)}</span>`;
    }
    
    // Store original text for copying
    wrap.setAttribute('data-original', this.originalText);
    wrap.setAttribute('contenteditable', 'false');
    
    return wrap;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Prevent selection of math widgets
  eq(other: MathPreviewWidget): boolean {
    return this.math === other.math && this.displayMode === other.displayMode;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

// State field for math preview decorations
const mathPreviewField = StateField.define<Decoration_set>({
  create() {
    return Decoration.none;
  },

  update(decorations, tr) {
    // Map decorations to new positions
    decorations = decorations.map(tr.changes);
    
    // Only re-parse when document changes
    if (!tr.docChanged) {
      return decorations;
    }

    // Parse document for math expressions
    const docText = tr.state.doc.toString();
    const builder = new RangeSetBuilder<Decoration>();
    
    // Find block math first ($$...$$)
    let match;
    BLOCK_MATH_REGEX.lastIndex = 0;
    while ((match = BLOCK_MATH_REGEX.exec(docText)) !== null) {
      const from = match.index;
      const to = from + match[0].length;
      const math = match[1].trim();
      
      builder.add(
        from,
        from,
        Decoration.widget({
          widget: new MathPreviewWidget(math, true, match[0]),
          side: 1,
        })
      );
    }
    
    // Find inline math ($...$) - but skip if part of block math was already captured
    INLINE_MATH_REGEX.lastIndex = 0;
    while ((match = INLINE_MATH_REGEX.exec(docText)) !== null) {
      const from = match.index;
      const to = from + match[0].length;
      const math = match[1];
      
      // Check if this position is already covered by a block math widget
      let alreadyCovered = false;
      decorations.between(from, from + 1, () => {
        alreadyCovered = true;
        return false;
      });
      
      if (!alreadyCovered) {
        builder.add(
          from,
          from,
          Decoration.widget({
            widget: new MathPreviewWidget(math, false, match[0]),
            side: 1,
          })
        );
      }
    }
    
    return builder.finish();
  },

  provide: (field) => EditorView.decorations.from(field),
});

// Helper to escape HTML
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Create the math preview extension
export function mathPreviewExtension(): Extension {
  return [
    mathPreviewField,
    // Add styles for math preview widgets
    EditorView.baseTheme({
      '.cm-math-preview-inline': {
        display: 'inline-block',
        verticalAlign: 'middle',
        margin: '0 2px',
        padding: '2px 4px',
        borderRadius: '3px',
        backgroundColor: 'rgba(100, 100, 100, 0.1)',
        lineHeight: 'normal',
      },
      '.cm-math-preview-inline .katex': {
        fontSize: '1.1em',
      },
      '.cm-math-preview-block': {
        display: 'block',
        textAlign: 'center',
        margin: '8px 0',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'rgba(100, 100, 100, 0.05)',
      },
      '.cm-math-preview-block .katex-display': {
        margin: '0',
      },
      '.cm-math-preview-inline .math-error': {
        color: '#cc0000',
        fontFamily: 'monospace',
        fontSize: '0.9em',
      },
      '.cm-math-preview-block .math-error': {
        color: '#cc0000',
        fontFamily: 'monospace',
        fontSize: '0.9em',
      },
    }),
  ];
}

// Type definition for the decoration set (workaround for type issues)
interface Decoration_set {
  map(changes: any): Decoration_set;
  between(from: number, to: number, f: (from: number, to: number, decoration: Decoration) => boolean | void): void;
}
