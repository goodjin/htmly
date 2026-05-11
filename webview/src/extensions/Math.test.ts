import { describe, it, expect, beforeEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { MathInline, MathBlock, MathExtension } from './Math';

describe('MathInline', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, ...MathExtension],
      content: '',
    });
  });

  it('inserts inline math with empty content', () => {
    editor.commands.insertMathInline('');
    const html = editor.getHTML();
    expect(html).toContain('class="math-inline"');
    expect(html).toContain('data-math=""');
  });

  it('inserts inline math with content', () => {
    editor.commands.insertMathInline('x^2');
    const html = editor.getHTML();
    expect(html).toContain('class="math-inline"');
    expect(html).toContain('data-math="x^2"');
  });

  it('renders KaTeX output', () => {
    editor.commands.insertMathInline('x^2');
    const html = editor.getHTML();
    // KaTeX renders x^2 as <span class="katex">...</span>
    expect(html).toContain('katex');
  });

  it('round-trips through getHTML/setContent', () => {
    editor.commands.insertMathInline('\\int_0^\\infty');
    const html1 = editor.getHTML();
    
    const editor2 = new Editor({ extensions: [StarterKit, ...MathExtension] });
    editor2.commands.setContent(html1);
    
    const html2 = editor2.getHTML();
    expect(html1).toBe(html2);
  });

  it('handles complex LaTeX expressions', () => {
    editor.commands.insertMathInline('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
    const html = editor.getHTML();
    expect(html).toContain('class="math-inline"');
    expect(html).toContain('katex');
  });

  it('inserts empty math when no selection', () => {
    editor.commands.insertContent('Hello');
    editor.commands.setTextSelection(2);
    editor.commands.wrapSelectionAsMathInline();
    
    const html = editor.getHTML();
    expect(html).toContain('class="math-inline"');
    expect(html).toContain('data-math=""');
  });
});

describe('MathBlock', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, ...MathExtension],
      content: '',
    });
  });

  it('inserts block math with empty content', () => {
    editor.commands.insertMathBlock();
    const html = editor.getHTML();
    expect(html).toContain('class="math-block"');
    expect(html).toContain('data-math=""');
  });

  it('inserts block math with content', () => {
    editor.commands.insertMathBlock('\\int_0^\\infty');
    const html = editor.getHTML();
    expect(html).toContain('class="math-block"');
    expect(html).toContain('data-math="\\int_0^\\infty"');
  });

  it('renders KaTeX output with display mode', () => {
    editor.commands.insertMathBlock('\\sum_{n=1}^{\\infty}');
    const html = editor.getHTML();
    // Display mode adds katex-display class
    expect(html).toContain('katex');
  });

  it('parses block math from HTML', () => {
    editor.commands.setContent('<div class="math-block" data-math="E=mc^2"></div>');
    const doc = editor.state.doc;
    let hasMathBlock = false;
    doc.descendants((node) => {
      if (node.type.name === 'mathBlock') {
        hasMathBlock = true;
        expect(node.attrs.math).toBe('E=mc^2');
      }
    });
    expect(hasMathBlock).toBe(true);
  });

  it('round-trips through getHTML/setContent', () => {
    editor.commands.insertMathBlock('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
    const html1 = editor.getHTML();
    
    const editor2 = new Editor({ extensions: [StarterKit, ...MathExtension] });
    editor2.commands.setContent(html1);
    
    const html2 = editor2.getHTML();
    expect(html1).toBe(html2);
  });

  it('handles equations with special characters', () => {
    editor.commands.insertMathBlock('\\vec{F} = m\\vec{a}');
    const html = editor.getHTML();
    expect(html).toContain('class="math-block"');
    expect(html).toContain('katex');
  });

  it('handles multiline equations', () => {
    editor.commands.insertMathBlock('\\begin{cases} x = r\\cos\\\\ y = r\\sin \\end{cases}');
    const html = editor.getHTML();
    expect(html).toContain('class="math-block"');
  });
});

describe('MathExtension integration', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, ...MathExtension],
      content: '',
    });
  });

  it('allows multiple math blocks in document', () => {
    // Verify we can insert a block math
    editor.commands.insertMathBlock('\\sum_{i=1}^n i = \\frac{n(n+1)}{2}');
    const html1 = editor.getHTML();
    expect(html1).toContain('class="math-block"');
    
    // Verify we can insert another block math in a new editor
    const editor2 = new Editor({ extensions: [StarterKit, ...MathExtension] });
    editor2.commands.insertMathBlock('E = mc^2');
    const html2 = editor2.getHTML();
    expect(html2).toContain('class="math-block"');
    expect(html2).toContain('E = mc^2');
  });

  it('preserves math after document operations', () => {
    editor.commands.insertMathBlock('a^2 + b^2 = c^2');
    editor.commands.undo();
    
    const html = editor.getHTML();
    expect(html).not.toContain('class="math-block"');
  });

  it('can delete and recreate math', () => {
    editor.commands.insertMathBlock('e^{i\\pi} + 1 = 0');
    const html1 = editor.getHTML();
    expect(html1).toContain('class="math-block"');
    
    editor.commands.selectAll();
    editor.commands.deleteSelection();
    
    editor.commands.insertMathInline('i');
    const html2 = editor.getHTML();
    expect(html2).toContain('class="math-inline"');
    expect(html2).not.toContain('class="math-block"');
  });

  it('allows mixing inline and block math in separate editors', () => {
    // Test block math
    editor.commands.insertMathBlock('\\int_0^\\infty f(x)dx');
    const html1 = editor.getHTML();
    expect(html1).toContain('class="math-block"');
    
    // Test inline math in separate editor
    const editor2 = new Editor({ extensions: [StarterKit, ...MathExtension] });
    editor2.commands.insertMathInline('x^2 + y^2 = z^2');
    const html2 = editor2.getHTML();
    expect(html2).toContain('class="math-inline"');
  });
});

describe('KaTeX rendering', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit, ...MathExtension],
      content: '',
    });
  });

  it('renders Greek letters correctly', () => {
    editor.commands.insertMathInline('\\alpha \\beta \\gamma');
    const html = editor.getHTML();
    // Should render without errors
    expect(html).toContain('katex');
    expect(html).not.toContain('math-error');
  });

  it('renders fractions correctly', () => {
    editor.commands.insertMathInline('\\frac{1}{2}');
    const html = editor.getHTML();
    expect(html).toContain('katex');
  });

  it('renders integrals correctly', () => {
    editor.commands.insertMathBlock('\\int_a^b f(x)\\,dx');
    const html = editor.getHTML();
    expect(html).toContain('katex');
  });

  it('renders matrices correctly', () => {
    editor.commands.insertMathBlock('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}');
    const html = editor.getHTML();
    expect(html).toContain('katex');
  });

  it('renders limits correctly', () => {
    editor.commands.insertMathInline('\\lim_{x \\to \\infty}');
    const html = editor.getHTML();
    expect(html).toContain('katex');
  });
});
