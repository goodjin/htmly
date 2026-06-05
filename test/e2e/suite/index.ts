import * as assert from 'assert';
import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HtmlyTestState = {
  active: boolean;
  documentUri?: string;
  mode?: 'wysiwyg' | 'source' | 'preview' | 'split';
};

type Fixture = {
  name: string;
  html: string;
  /** Substrings that MUST survive a round-trip through Visual → Source → Preview → Visual */
  expectedSnippets: string[];
  /** Additional per-fixture verification callback */
  extraVerify?: (doc: vscode.TextDocument) => void;
};

// ---------------------------------------------------------------------------
// Fixture generators — one per HTML category
// ---------------------------------------------------------------------------

/** 1. Full document with doctype, head, body, CSS, and rich content */
function fullDocumentFixture(): Fixture {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Full Document</title>
    <style>
      body { font-family: sans-serif; color: #333; }
      h1 { font-size: 2em; }
      .highlight { background: #ffe; }
    </style>
  </head>
  <body>
    <h1>Full Document Title</h1>
    <p class="highlight">A paragraph with a <strong>bold</strong> and <em>italic</em> word.</p>
    <ul>
      <li>Item one</li>
      <li>Item two</li>
    </ul>
    <blockquote><p>A wise quote.</p></blockquote>
    <pre><code>const x = 42;</code></pre>
  </body>
</html>`;

  return {
    name: 'full-document.html',
    html,
    expectedSnippets: [
      '<title>Full Document</title>',
      'font-family: sans-serif',
      'Full Document Title',
      'highlight',
      '<strong>bold</strong>',
      '<em>italic</em>',
      '<li>Item one</li>',
      '<blockquote>',
      '<pre><code>',
    ],
    extraVerify(doc) {
      assert.ok(doc.getText().includes('<!doctype html>'), 'should preserve doctype');
      assert.ok(doc.getText().includes('<style>'), 'should preserve head styles');
    },
  };
}

/** 2. HTML fragment — no doctype, no html/head/body wrappers */
function fragmentFixture(): Fixture {
  const html = `<div class="card">
  <h2>Fragment Card</h2>
  <p>This file has no doctype or body wrapper.</p>
  <p><strong>Styled</strong> text inside a fragment.</p>
  <a href="https://example.com">A link</a>
</div>`;

  return {
    name: 'fragment.html',
    html,
    expectedSnippets: [
      'Fragment Card',
      'no doctype or body wrapper',
      '<strong>Styled</strong>',
      'href="https://example.com"',
    ],
    extraVerify(doc) {
      assert.ok(!doc.getText().includes('<body>'), 'fragment should not gain a body tag');
    },
  };
}

/** 3. Minimal — the simplest possible valid HTML */
function minimalFixture(): Fixture {
  const html = `<p>Hello, world!</p>`;

  return {
    name: 'minimal.html',
    html,
    expectedSnippets: ['Hello, world!'],
  };
}

/** 4. Table layout */
function tableFixture(): Fixture {
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Table Layout</title></head>
  <body>
    <table>
      <thead>
        <tr><th>Name</th><th>Role</th><th>Score</th></tr>
      </thead>
      <tbody>
        <tr><td>Alice</td><td>Engineer</td><td>95</td></tr>
        <tr><td>Bob</td><td>Designer</td><td>88</td></tr>
        <tr><td>Carol</td><td>PM</td><td>91</td></tr>
      </tbody>
    </table>
    <hr>
    <p>After the rule.</p>
  </body>
</html>`;

  return {
    name: 'table-layout.html',
    html,
    expectedSnippets: [
      '<table>',
      '<thead>',
      '<th>Name</th>',
      '<td>Alice</td>',
      '<td>Bob</td>',
      '<td>Carol</td>',
      '<hr>',
      'After the rule',
    ],
  };
}

/** 5. Link-heavy document */
function linksFixture(): Fixture {
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Links</title></head>
  <body>
    <p>Visit <a href="https://example.com">Example</a> or <a href="https://github.com">GitHub</a>.</p>
    <p>Email: <a href="mailto:user@example.com">user@example.com</a></p>
    <p>Relative: <a href="../page.html">Back</a></p>
  </body>
</html>`;

  return {
    name: 'links.html',
    html,
    expectedSnippets: [
      'href="https://example.com"',
      'href="https://github.com"',
      'href="mailto:user@example.com"',
      'href="../page.html"',
      'Visit',
    ],
    extraVerify(doc) {
      assert.ok(doc.getText().includes('mailto:'), 'should preserve mailto links');
      assert.ok(doc.getText().includes('../page.html'), 'should preserve relative links');
    },
  };
}

/** 6. Image-heavy document */
function imagesFixture(): Fixture {
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Images</title></head>
  <body>
    <h2>Image Gallery</h2>
    <figure>
      <img src="https://picsum.photos/seed/a/400/300" alt="Landscape photo">
      <figcaption>A beautiful landscape</figcaption>
    </figure>
    <figure>
      <img src="https://picsum.photos/seed/b/400/300" alt="Portrait photo">
      <figcaption>A portrait</figcaption>
    </figure>
  </body>
</html>`;

  return {
    name: 'images.html',
    html,
    expectedSnippets: [
      'Image Gallery',
      'src="https://picsum.photos/seed/a/400/300"',
      'alt="Landscape photo"',
      'A beautiful landscape',
      'src="https://picsum.photos/seed/b/400/300"',
      '<figcaption>',
    ],
  };
}

/** 7. Special characters, entities, and unicode */
function specialCharsFixture(): Fixture {
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Special &amp; Characters</title></head>
  <body>
    <h1>Entities &amp; Unicode</h1>
    <p>Price: 10 &lt; 20 &amp; 20 &gt; 10</p>
    <p>Arrows: &larr; &rarr; &harr;</p>
    <p>Currency: &euro; &pound; &yen;</p>
    <p>Math: 2 &times; 3 &divide; 1 = 6</p>
    <p>Quotes: &ldquo;hello&rdquo; &lsquo;world&rsquo;</p>
    <p>Emoji: \u{1F600} \u{1F44D} \u{2764}\u{FE0F}</p>
  </body>
</html>`;

  return {
    name: 'special-chars.html',
    html,
    expectedSnippets: [
      'Entities',
      '&amp;',
      '&lt;',
      '&gt;',
    ],
  };
}

/** 8. Large file (>5 MB) — should trigger readOnly / Source-only mode */
function largeFileFixture(): Fixture {
  const filler = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. </p>\n';
  const targetSize = 6 * 1024 * 1024; // 6MB > 5MB threshold
  const repeatCount = Math.ceil(targetSize / filler.length);
  const body = filler.repeat(repeatCount);
  // Add markers for verifyLargeFileReadOnly assertions
  const markerStart = '<p>Paragraph 0: Lorem ipsum dolor sit amet.</p>\n';
  const markerEnd = '<p>Paragraph 5999: Lorem ipsum dolor sit amet.</p>\n';
  const fullBody = markerStart + body + markerEnd;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Large File</title></head>
<body>
${fullBody}
</body></html>`;

  const actualSize = Buffer.byteLength(html, 'utf8');
  assert.ok(
    actualSize > 5 * 1024 * 1024,
    `Large fixture must exceed 5 MB (got ${actualSize} bytes)`
  );

  return {
    name: 'large-file.html',
    html,
    expectedSnippets: ['Paragraph 0:', 'Paragraph 5999:'],
  };
}

/** 9. Inline styles and color */
function inlineStylesFixture(): Fixture {
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Inline Styles</title></head>
  <body>
    <p style="color: red;">Red text</p>
    <p style="color: blue; font-size: 20px;">Blue large text</p>
    <p style="background: yellow; padding: 4px;">Highlighted</p>
    <div style="border: 1px solid #ccc; padding: 10px;">Boxed content</div>
  </body>
</html>`;

  return {
    name: 'inline-styles.html',
    html,
    expectedSnippets: [
      'color: red',
      'color: blue',
      'background: yellow',
      'border: 1px solid #ccc',
      'Red text',
      'Blue large text',
      'Highlighted',
      'Boxed content',
    ],
    extraVerify(doc) {
      assert.ok(doc.getText().includes('font-size: 20px'), 'should preserve font-size');
      assert.ok(doc.getText().includes('padding: 10px'), 'should preserve padding');
    },
  };
}

/** 10. Deeply nested structures */
function nestedFixture(): Fixture {
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Nested</title></head>
  <body>
    <article>
      <section>
        <div>
          <blockquote>
            <p>Deeply nested <strong>bold <em>and italic</em></strong> content.</p>
          </blockquote>
        </div>
      </section>
      <section>
        <ol>
          <li>First
            <ul>
              <li>Nested bullet</li>
            </ul>
          </li>
          <li>Second</li>
        </ol>
      </section>
    </article>
  </body>
</html>`;

  return {
    name: 'nested.html',
    html,
    expectedSnippets: [
      '<article>',
      '<section>',
      'Deeply nested',
      '<strong>bold',
      '<em>and italic</em>',
      '<ol>',
      'Nested bullet',
    ],
  };
}

/** 11. Callout block - emoji icon and colored background */
function calloutFixture(): Fixture {
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Callout Block Test</title></head>
  <body>
    <h1>Callout Block Test</h1>
    
    <h2>Default Callout</h2>
    <div class="callout" data-icon="💡" data-bg="#fef3c7">
      <p>This is a default callout with the lightbulb icon and yellow background.</p>
    </div>
    
    <h2>Warning Callout</h2>
    <div class="callout" data-icon="⚠️" data-bg="#fee2e2">
      <p>This is a warning callout with red background.</p>
    </div>
    
    <h2>Fire Callout</h2>
    <div class="callout" data-icon="🔥" data-bg="#ffedd5">
      <p>This is a fire callout with orange background.</p>
    </div>
    
    <h2>Callout with Nested Content</h2>
    <div class="callout" data-icon="📝" data-bg="#e0e7ff">
      <h3>A Heading Inside Callout</h3>
      <p>Paragraph text inside the callout.</p>
      <ul>
        <li>List item one</li>
        <li>List item two</li>
      </ul>
    </div>
    
    <p>End of callout test document.</p>
  </body>
</html>`;

  return {
    name: 'callout.html',
    html,
    expectedSnippets: [
      'class="callout"',
      'data-icon="💡"',
      'data-icon="⚠️"',
      'data-icon="🔥"',
      'data-bg="#fef3c7"',
      'data-bg="#fee2e2"',
      'data-bg="#e0e7ff"',
      'List item one',
      'A Heading Inside Callout',
    ],
    extraVerify(doc) {
      assert.ok(doc.getText().includes('class="callout"'), 'should preserve callout class');
      assert.ok(doc.getText().includes('data-icon='), 'should preserve icon attributes');
      assert.ok(doc.getText().includes('data-bg='), 'should preserve background attributes');
    },
  };
}

/** 12. Embed block - iframe embeds (using about:blank to avoid CSP issues in E2E) */
function embedFixture(): Fixture {
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Embed Block Test</title></head>
  <body>
    <h1>Embed Block Test</h1>
    
    <h2>YouTube Video Embed</h2>
    <div class="embed-block">
      <iframe 
        src="about:blank" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    </div>
    
    <h2>Vimeo Video Embed</h2>
    <div class="embed-block">
      <iframe 
        src="about:blank" 
        frameborder="0" 
        allow="autoplay; fullscreen; picture-in-picture" 
        allowfullscreen>
      </iframe>
    </div>
    
    <h2>CodePen Embed</h2>
    <div class="embed-block">
      <iframe 
        src="about:blank" 
        frameborder="0" 
        allowfullscreen>
      </iframe>
    </div>
    
    <h2>Multiple Embeds</h2>
    <div class="embed-block">
      <iframe 
        src="about:blank" 
        frameborder="0" 
        allowfullscreen>
      </iframe>
    </div>
    <p>This text is between two embeds.</p>
    <div class="embed-block">
      <iframe 
        src="about:blank" 
        frameborder="0" 
        allowfullscreen>
      </iframe>
    </div>
    
    <p>End of embed test document.</p>
  </body>
</html>`;

  return {
    name: 'embed.html',
    html,
    expectedSnippets: [
      'class="embed-block"',
      'about:blank',
      'frameborder="0"',
      'allowfullscreen',
    ],
    extraVerify(doc) {
      assert.ok(doc.getText().includes('class="embed-block"'), 'should preserve embed-block class');
      assert.ok(doc.getText().includes('<iframe'), 'should preserve iframe tags');
    },
  };
}

/** 13. Multi-column layout - nested columns with resize handles */
function columnsFixture(): Fixture {
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Multi-Column Layout Test</title></head>
  <body>
    <h1>Multi-Column Layout Test</h1>
    
    <h2>Two Equal Columns</h2>
    <div class="columns">
      <div class="column" style="width: 50%">
        <p>This is the left column content. It contains some text to demonstrate the two-column layout.</p>
      </div>
      <div class="column" style="width: 50%">
        <p>This is the right column content. It also contains text to show the side-by-side layout.</p>
      </div>
    </div>
    
    <h2>Two Unequal Columns</h2>
    <div class="columns">
      <div class="column" style="width: 30%">
        <p>This is the narrow left column (30%).</p>
      </div>
      <div class="column" style="width: 70%">
        <p>This is the wide right column (70%). It has more content space.</p>
      </div>
    </div>
    
    <h2>Three Columns</h2>
    <div class="columns">
      <div class="column" style="width: 33%">
        <h3>Column One</h3>
        <p>Content in the first of three columns.</p>
      </div>
      <div class="column" style="width: 34%">
        <h3>Column Two</h3>
        <p>Content in the second column.</p>
      </div>
      <div class="column" style="width: 33%">
        <h3>Column Three</h3>
        <p>Content in the third column.</p>
      </div>
    </div>
    
    <h2>Columns with Different Content Types</h2>
    <div class="columns">
      <div class="column" style="width: 50%">
        <h3>Left: Heading and List</h3>
        <h4>Features</h4>
        <ul>
          <li>Feature A</li>
          <li>Feature B</li>
          <li>Feature C</li>
        </ul>
      </div>
      <div class="column" style="width: 50%">
        <h3>Right: Callout Block</h3>
        <div class="callout" data-icon="💡" data-bg="#fef3c7">
          <p>This callout is inside a column!</p>
        </div>
      </div>
    </div>
    
    <h2>Nested Columns</h2>
    <div class="columns">
      <div class="column" style="width: 50%">
        <p>Outer left column with nested columns inside:</p>
        <div class="columns">
          <div class="column" style="width: 50%">
            <p>Nested left.</p>
          </div>
          <div class="column" style="width: 50%">
            <p>Nested right.</p>
          </div>
        </div>
      </div>
      <div class="column" style="width: 50%">
        <p>Outer right column content.</p>
      </div>
    </div>
    
    <p>End of columns test document.</p>
  </body>
</html>`;

  return {
    name: 'columns.html',
    html,
    expectedSnippets: [
      'class="columns"',
      'class="column"',
      'width: 50%',
      'width: 30%',
      'width: 70%',
      'width: 33%',
      'width: 34%',
      'Column One',
      'Column Two',
      'Column Three',
      'Feature A',
      'Feature B',
      'Feature C',
      'This callout is inside a column',
      'Nested left',
      'Nested right',
    ],
    extraVerify(doc) {
      assert.ok(doc.getText().includes('class="columns"'), 'should preserve columns class');
      assert.ok(doc.getText().includes('class="column"'), 'should preserve column class');
      assert.ok(doc.getText().includes('width:'), 'should preserve width percentages');
      assert.ok(doc.getText().includes('50%'), 'should preserve 50% width columns');
    },
  };
}

/** 14. Table of Contents - auto-generated from H1-H3 headings */
function tocFixture(): Fixture {
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Table of Contents Test</title></head>
  <body>
    <nav class="toc">
      <a href="#h-introduction">Introduction</a>
      <a href="#h-getting-started">Getting Started</a>
      <a href="#h-installation">Installation</a>
      <a href="#h-configuration">Configuration</a>
      <a href="#h-advanced-topics">Advanced Topics</a>
      <a href="#h-plugins">Plugins</a>
      <a href="#h-customization">Customization</a>
      <a href="#h-conclusion">Conclusion</a>
    </nav>
    
    <h1 id="h-introduction">Introduction</h1>
    <p>Welcome to the Table of Contents test document. This document tests the TOC functionality with various heading levels.</p>
    
    <h2 id="h-getting-started">Getting Started</h2>
    <p>Let's begin with the basics of using the editor.</p>
    
    <h3 id="h-installation">Installation</h3>
    <p>First, you need to install the required dependencies.</p>
    
    <h3 id="h-configuration">Configuration</h3>
    <p>Then, configure the editor according to your needs.</p>
    
    <h2 id="h-advanced-topics">Advanced Topics</h2>
    <p>This section covers advanced usage of the editor.</p>
    
    <h3 id="h-plugins">Plugins</h3>
    <p>Learn how to extend the editor with plugins.</p>
    
    <h3 id="h-customization">Customization</h3>
    <p>Customize the appearance and behavior of the editor.</p>
    
    <h1 id="h-conclusion">Conclusion</h1>
    <p>Thank you for reading this test document.</p>
  </body>
</html>`;

  return {
    name: 'toc.html',
    html,
    expectedSnippets: [
      'class="toc"',
      'href="#h-introduction"',
      'href="#h-getting-started"',
      'href="#h-installation"',
      'href="#h-configuration"',
      'href="#h-advanced-topics"',
      'href="#h-plugins"',
      'href="#h-customization"',
      'href="#h-conclusion"',
      '<nav class="toc">',
      'Introduction',
      'Getting Started',
      'Advanced Topics',
      'Conclusion',
    ],
    extraVerify(doc) {
      assert.ok(doc.getText().includes('class="toc"'), 'should preserve toc class');
      assert.ok(doc.getText().includes('<nav'), 'should preserve nav element');
      assert.ok(doc.getText().includes('href="#h-'), 'should preserve anchor links');
      assert.ok(doc.getText().includes('id="h-'), 'should preserve heading IDs');
    },
  };
}

// ---------------------------------------------------------------------------
// All fixtures collected
// ---------------------------------------------------------------------------

function allFixtures(): Fixture[] {
  return [
    fullDocumentFixture(),
    fragmentFixture(),
    minimalFixture(),
    tableFixture(),
    linksFixture(),
    imagesFixture(),
    specialCharsFixture(),
    inlineStylesFixture(),
    nestedFixture(),
    // New block type fixtures
    calloutFixture(),
    embedFixture(),
    columnsFixture(),
    tocFixture(),
    // largeFileFixture() is run separately (different assertions)
  ];
}

// ---------------------------------------------------------------------------
// Test entry point — called by @vscode/test-electron
// ---------------------------------------------------------------------------

export async function run(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder, 'Expected VS Code to open the E2E fixture workspace.');

  // --- Test group 1: Mode cycling preserves content for every fixture ---
  for (const fixture of allFixtures()) {
    await verifyModeCycle(workspaceFolder, fixture);
  }

  // --- Test group 2: Large file triggers Source-only mode ---
  await verifyLargeFileReadOnly(workspaceFolder);

  // --- Test group 3: External edit propagation ---
  await verifyExternalEdit(workspaceFolder);

  // --- Test group 4: Edit in Source mode, verify in Visual ---
  await verifySourceEdit(workspaceFolder);

  // --- Test group 5: btn() fix verification (NOW STRICT: real clicks) ---
  await verifyBtnFix(workspaceFolder);

  // --- Test group 6: PDF export with table fix verification ---
  await verifyPdfExport(workspaceFolder);

  // --- Test group 7: Bold button click — REAL click → state change ---
  await verifyBtnClick(workspaceFolder);

  // --- Test group 8: Source button click — REAL click → CodeMirror (reproduces
  //     the user's reported "源代码按钮没反应" bug) ---
  await verifySourceButtonClick(workspaceFolder);
}

// ---------------------------------------------------------------------------
// Test implementations
// ---------------------------------------------------------------------------

/**
 * Open a fixture in the custom editor, cycle through all three modes,
 * and verify the document text is unchanged after the full cycle.
 */
async function verifyModeCycle(
  workspaceFolder: vscode.WorkspaceFolder,
  fixture: Fixture
): Promise<void> {
  const uri = vscode.Uri.joinPath(workspaceFolder.uri, fixture.name);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(fixture.html, 'utf8'));

  const document = await vscode.workspace.openTextDocument(uri);
  assert.strictEqual(document.languageId, 'html');

  // Verify expected snippets are present in the original
  for (const snippet of fixture.expectedSnippets) {
    assert.ok(
      document.getText().includes(snippet),
      `[${fixture.name}] original should include: ${snippet}`
    );
  }

  // Open with Htmly Editor
  await vscode.commands.executeCommand('vscode.openWith', uri, 'htmly.editor');

  // Wait for Visual mode
  await waitForState(
    (s) => s.active && s.documentUri === uri.toString() && s.mode === 'wysiwyg',
    `[${fixture.name}] should open in Visual mode.`
  );

  // Cycle: Visual → Source
  await vscode.commands.executeCommand('htmly.toggleMode');
  await waitForState(
    (s) => s.documentUri === uri.toString() && s.mode === 'source',
    `[${fixture.name}] should switch to Source mode.`
  );
  await sleep(200);

  // Verify snippets survive in Source mode
  for (const snippet of fixture.expectedSnippets) {
    assert.ok(
      document.getText().includes(snippet),
      `[${fixture.name}] Source mode should include: ${snippet}`
    );
  }

  // Cycle: Source → Preview
  await vscode.commands.executeCommand('htmly.toggleMode');
  await waitForState(
    (s) => s.documentUri === uri.toString() && s.mode === 'preview',
    `[${fixture.name}] should switch to Preview mode.`
  );
  await sleep(200);

  // Cycle: Preview → Visual
  await vscode.commands.executeCommand('htmly.toggleMode');
  await waitForState(
    (s) => s.documentUri === uri.toString() && s.mode === 'wysiwyg',
    `[${fixture.name}] should cycle back to Visual mode.`
  );
  await sleep(200);

  // Final content must equal original
  assert.strictEqual(
    document.getText(),
    fixture.html,
    `[${fixture.name}] content must be unchanged after full mode cycle.`
  );

  // Run any extra assertions
  fixture.extraVerify?.(document);
}

/**
 * A file larger than 500 KB should force Source-only mode.
 * The Visual and Preview tabs should be disabled.
 */
async function verifyLargeFileReadOnly(
  workspaceFolder: vscode.WorkspaceFolder
): Promise<void> {
  const fixture = largeFileFixture();
  const uri = vscode.Uri.joinPath(workspaceFolder.uri, fixture.name);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(fixture.html, 'utf8'));

  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.commands.executeCommand('vscode.openWith', uri, 'htmly.editor');

  // The extension should force Source mode for large files
  const state = await waitForState(
    (s) => s.active && s.documentUri === uri.toString() && s.mode === 'source',
    `[${fixture.name}] large file should open in Source-only mode.`,
    20_000
  );
  assert.strictEqual(state.mode, 'source', 'Large file must be in Source mode');

  // Content should still be intact
  assert.ok(
    document.getText().includes('Paragraph 0:'),
    'Large file content should be present'
  );
  assert.ok(
    document.getText().includes('Paragraph 5999:'),
    'Large file content should include last paragraph'
  );
}

/**
 * Edit a document externally via VS Code WorkspaceEdit (simulates git checkout
 * or another tool modifying the file), then verify the webview reflects the change.
 */
async function verifyExternalEdit(
  workspaceFolder: vscode.WorkspaceFolder
): Promise<void> {
  const filename = 'external-edit.html';
  const initial = '<!doctype html><html><body><p>Before external edit</p></body></html>';
  const edited = '<!doctype html><html><body><p>After external edit</p></body></html>';

  const uri = vscode.Uri.joinPath(workspaceFolder.uri, filename);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(initial, 'utf8'));

  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.commands.executeCommand('vscode.openWith', uri, 'htmly.editor');

  await waitForState(
    (s) => s.active && s.documentUri === uri.toString() && s.mode === 'wysiwyg',
    `[${filename}] should open in Visual mode.`
  );

  // Simulate external edit
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    uri,
    new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
    edited
  );
  await vscode.workspace.applyEdit(edit);
  await sleep(500);

  // Switch to Source to inspect
  await vscode.commands.executeCommand('htmly.toggleMode');
  await waitForState(
    (s) => s.documentUri === uri.toString() && s.mode === 'source',
    `[${filename}] should switch to Source mode.`
  );
  await sleep(300);

  assert.ok(
    document.getText().includes('After external edit'),
    `[${filename}] should reflect the external edit.`
  );

  // Cycle back to Visual — content must persist
  await vscode.commands.executeCommand('htmly.toggleMode'); // preview
  await sleep(200);
  await vscode.commands.executeCommand('htmly.toggleMode'); // visual
  await waitForState(
    (s) => s.documentUri === uri.toString() && s.mode === 'wysiwyg',
    `[${filename}] should cycle back to Visual mode.`
  );

  assert.ok(
    document.getText().includes('After external edit'),
    `[${filename}] content should persist after mode cycle.`
  );
}

/**
 * Open a simple document, switch to Source mode, edit the document via
 * VS Code API (simulating the webview sending a contentUpdate), then
 * switch to Visual and verify the new content is reflected.
 */
async function verifySourceEdit(
  workspaceFolder: vscode.WorkspaceFolder
): Promise<void> {
  const filename = 'source-edit.html';
  const original = '<!doctype html><html><body><p>Original content</p></body></html>';
  const modified = '<!doctype html><html><body><p>Modified in source mode</p></body></html>';

  const uri = vscode.Uri.joinPath(workspaceFolder.uri, filename);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original, 'utf8'));

  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.commands.executeCommand('vscode.openWith', uri, 'htmly.editor');

  await waitForState(
    (s) => s.active && s.documentUri === uri.toString() && s.mode === 'wysiwyg',
    `[${filename}] should open in Visual mode.`
  );

  // Switch to Source
  await vscode.commands.executeCommand('htmly.toggleMode');
  await waitForState(
    (s) => s.documentUri === uri.toString() && s.mode === 'source',
    `[${filename}] should switch to Source mode.`
  );

  // Edit via workspace API (simulates webview contentUpdate)
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    uri,
    new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
    modified
  );
  await vscode.workspace.applyEdit(edit);
  await sleep(500);

  // Switch to Visual
  await vscode.commands.executeCommand('htmly.toggleMode'); // preview
  await sleep(200);
  await vscode.commands.executeCommand('htmly.toggleMode'); // visual
  await waitForState(
    (s) => s.documentUri === uri.toString() && s.mode === 'wysiwyg',
    `[${filename}] should switch to Visual mode.`
  );
  await sleep(300);

  assert.ok(
    document.getText().includes('Modified in source mode'),
    `[${filename}] Visual mode should reflect the source edit.`
  );
}

/**
 * Test group 5: Verify btn() fix in Toolbar.vue — STRICT
 *
 * The fix added:
 * 1. e.stopPropagation() to prevent mousedown events from bubbling to editor
 * 2. An explicit props.editor check with early return and warning
 *
 * Now we make this STRICT: actually click the Source / WYSIWYG buttons via
 * the toolbar (via __htmlyTest.clickToolbarButton) and verify the DOM and
 * mode state actually change. This replaces the previous version that only
 * checked mode === 'wysiwyg' (a self-fulfilling assertion).
 */
async function verifyBtnFix(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
  const testFilename = 'btn-test-basic.html';
  const testHtml = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Btn Fix Test</title></head>
  <body>
    <p>Test content for btn fix verification.</p>
  </body>
</html>`;

  const testUri = vscode.Uri.joinPath(workspaceFolder.uri, testFilename);
  await vscode.workspace.fs.writeFile(testUri, Buffer.from(testHtml, 'utf8'));

  await vscode.workspace.openTextDocument(testUri);
  await vscode.commands.executeCommand('vscode.openWith', testUri, 'htmly.editor');

  // Wait for editor in wysiwyg mode AND Tiptap actually mounted.
  await waitForState(
    (s) => s.active && s.documentUri === testUri.toString() && s.mode === 'wysiwyg',
    '[btn-fix] Should open in Visual mode'
  );
  await waitForEditor(15_000, '[btn-fix] Tiptap should mount');

  // --- Step 1: Click the Source button (toolbar) and wait for CodeMirror ---
  const clickSource = await runScript<{ ok: boolean; reason?: string }>(
    `window.__htmlyTest.clickToolbarButton('button[title="Source Mode"]')`
  );
  assert.ok(clickSource.ok, `[btn-fix] clickToolbarButton(Source) should succeed: ${JSON.stringify(clickSource)}`);

  await waitForDom(
    `!!document.querySelector('.cm-editor')`,
    15_000,
    `[btn-fix] CodeMirror (.cm-editor) should appear after Source click`
  );
  // Tiptap should be gone now (v-if="mode === 'wysiwyg'").
  const tiptapGone = await runScript<{ gone: boolean }>(
    `({ gone: !document.querySelector('.tiptap.ProseMirror') })`
  );
  assert.strictEqual(
    tiptapGone.gone,
    true,
    '[btn-fix] Tiptap should be unmounted after switching to Source'
  );
  // Extension ack should also report source.
  await waitForState(
    (s) => s.documentUri === testUri.toString() && s.mode === 'source',
    '[btn-fix] Extension ack should report source mode'
  );

  // --- Step 2: Click the WYSIWYG button and wait for Tiptap again ---
  const clickWysiwyg = await runScript<{ ok: boolean; reason?: string }>(
    `window.__htmlyTest.clickToolbarButton('button[title="WYSIWYG Mode"]')`
  );
  assert.ok(clickWysiwyg.ok, `[btn-fix] clickToolbarButton(WYSIWYG) should succeed: ${JSON.stringify(clickWysiwyg)}`);

  await waitForDom(
    `!!document.querySelector('.tiptap.ProseMirror')`,
    15_000,
    `[btn-fix] Tiptap should re-mount after WYSIWYG click`
  );
  await waitForState(
    (s) => s.documentUri === testUri.toString() && s.mode === 'wysiwyg',
    '[btn-fix] Extension ack should report wysiwyg mode'
  );

  console.log('[btn-fix] STRICT: real Source/WYSIWYG clicks verified end-to-end');
}

/**
 * Test group 6: Verify PDF export with table content
 * 
 * The parseTable bug caused each row to be wrapped in { table: { widths, body: [row] }, layout }
 * which made pdfmake treat them as nested tables. The fix ensures body is a flat cell[][].
 * 
 * Bug: "rowCells.some is not a function" error during PDF export of tables.
 */
async function verifyPdfExport(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
  // --- Test: HTML with table should generate valid PDF (no rowCells.some error) ---
  const testFilename = 'pdf-table-test.html';
  const testHtml = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>PDF Export Table Test</title></head>
  <body>
    <h1>PDF Export Test</h1>
    <table>
      <thead>
        <tr><th>Header 1</th><th>Header 2</th></tr>
      </thead>
      <tbody>
        <tr><td>Cell A1</td><td>Cell B1</td></tr>
        <tr><td>Cell A2</td><td>Cell B2</td></tr>
      </tbody>
    </table>
    <p>End of document</p>
  </body>
</html>`;

  const testUri = vscode.Uri.joinPath(workspaceFolder.uri, testFilename);
  await vscode.workspace.fs.writeFile(testUri, Buffer.from(testHtml, 'utf8'));

  const testDoc = await vscode.workspace.openTextDocument(testUri);
  await vscode.commands.executeCommand('vscode.openWith', testUri, 'htmly.editor');

  // Wait for editor to be fully ready
  await waitForState(
    (s) => s.active && s.documentUri === testUri.toString() && s.mode === 'wysiwyg',
    '[pdf-export] Should open in Visual mode'
  );

  // Wait for Tiptap to fully initialize
  await sleep(1000);

  // Trigger PDF export via __htmlyTest.triggerExport
  // The triggerExport function returns a Promise that resolves with the export result
  const exportResult = await vscode.commands.executeCommand<{ success: boolean; filePath?: string; error?: string }>(
    'htmly.test.triggerExport',
    'pdf'
  );

  // Assert export succeeded (no rowCells.some error)
  assert.strictEqual(
    exportResult?.success,
    true,
    `[pdf-export] PDF export should succeed. Got: ${JSON.stringify(exportResult)}`
  );

  // Assert no "rowCells.some" error in the error message
  assert.ok(
    !String(exportResult?.error || '').includes('rowCells.some'),
    `[pdf-export] Should not hit the parseTable bug. Error: ${exportResult?.error}`
  );

  console.log('[pdf-export] PDF export with table succeeded - parseTable fix verified');
}

/**
 * Test group 7: Verify clicking the bold button actually toggles Tiptap bold state.
 * STRICT: real click via __htmlyTest.clickToolbarButton + real DOM/state assertion.
 *
 * The btn() fix in Toolbar.vue added e.stopPropagation() to prevent mousedown
 * events from reaching the editor. We need to verify that when a user clicks
 * the bold toolbar button, Tiptap actually receives the command and toggles
 * bold correctly — including a "click again" round-trip to verify the toggle
 * is reversible.
 */
async function verifyBtnClick(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
  const testFilename = 'btn-click-test.html';
  const testHtml = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Btn Click Test</title></head>
  <body>
    <p>Hello world this is some text that should be selectable.</p>
  </body>
</html>`;

  const testUri = vscode.Uri.joinPath(workspaceFolder.uri, testFilename);
  await vscode.workspace.fs.writeFile(testUri, Buffer.from(testHtml, 'utf8'));

  const testDoc = await vscode.workspace.openTextDocument(testUri);
  await vscode.commands.executeCommand('vscode.openWith', testUri, 'htmly.editor');

  // Wait for editor in wysiwyg mode.
  await waitForState(
    (s) => s.active && s.documentUri === testUri.toString() && s.mode === 'wysiwyg',
    '[btn-click] Should open in Visual mode'
  );

  // The Tiptap editor is mounted by Vue asynchronously after the mode ref
  // flips. We must wait for `.tiptap.ProseMirror` to actually exist before
  // we can click anything. Without this the previous test was racing the
  // mount and sometimes "passing" with click-but-no-state-change.
  await waitForEditor(15_000, '[btn-click] Tiptap should mount');

  // Select all text via Tiptap command (NOT via DOM)
  await runScript(`
    const editor = window.__htmlyTest.getEditorState().editor;
    if (editor) {
      editor.chain().focus().selectAll().run();
    }
  `);
  await sleep(200);

  // Record state BEFORE clicking bold
  const before = await runScript<{
    isBold: boolean;
    html: string;
    warnings: string[];
  }>(`
    const s = window.__htmlyTest.getEditorState();
    ({
      isBold: s.isActive.bold,
      html: s.editor && s.editor.getHTML ? s.editor.getHTML() : '',
      warnings: window.__htmlyTest.getConsoleWarnings()
    })
  `);

  // Clear warnings right before the click
  await runScript(`window.__htmlyTest.clearWarnings()`);

  // REAL click: dispatch a mousedown on the Bold toolbar button.
  const click1 = await runScript<{ ok: boolean; reason?: string }>(`
    window.__htmlyTest.clickToolbarButton('button[title="Bold (Ctrl+B)"]')
  `);
  assert.ok(click1.ok, `[btn-click] click #1 should succeed: ${JSON.stringify(click1)}`);

  await sleep(500);

  // Record state AFTER first click
  const afterClick1 = await runScript<{
    isBold: boolean;
    html: string;
    warnings: string[];
  }>(`
    const s = window.__htmlyTest.getEditorState();
    ({
      isBold: s.isActive.bold,
      html: s.editor && s.editor.getHTML ? s.editor.getHTML() : '',
      warnings: window.__htmlyTest.getConsoleWarnings()
    })
  `);

  assert.strictEqual(
    afterClick1.isBold,
    true,
    `[btn-click] Bold should be active after click #1. ` +
    `before=${JSON.stringify({ isBold: before.isBold, htmlLen: before.html.length })} ` +
    `after=${JSON.stringify({ isBold: afterClick1.isBold, htmlLen: afterClick1.html.length, hasStrong: afterClick1.html.includes('<strong>') })} ` +
    `warnings=${JSON.stringify(afterClick1.warnings)}`
  );
  assert.ok(
    afterClick1.html.includes('<strong>'),
    `[btn-click] HTML should contain <strong> after click #1. Got: ${afterClick1.html.slice(0, 300)}`
  );

  // Click again to UNBOLD — verify toggle works both ways
  const click2 = await runScript<{ ok: boolean; reason?: string }>(`
    window.__htmlyTest.clickToolbarButton('button[title="Bold (Ctrl+B)"]')
  `);
  assert.ok(click2.ok, `[btn-click] click #2 should succeed: ${JSON.stringify(click2)}`);

  await sleep(500);

  const afterClick2 = await runScript<{ isBold: boolean; html: string }>(`
    const s = window.__htmlyTest.getEditorState();
    ({
      isBold: s.isActive.bold,
      html: s.editor && s.editor.getHTML ? s.editor.getHTML() : ''
    })
  `);
  assert.strictEqual(
    afterClick2.isBold,
    false,
    `[btn-click] Bold should be toggled off after click #2. got: isBold=${afterClick2.isBold} htmlSnippet=${afterClick2.html.slice(0, 200)}`
  );

  // Final document content must include the original text (round-trip safety).
  assert.ok(
    testDoc.getText().includes('Hello world this is some text'),
    '[btn-click] document content should still include the original paragraph'
  );

  console.log('[btn-click] STRICT: real Bold click + toggle verified');
}

/**
 * Test group 8: Verify the Source toolbar button actually switches to Source mode.
 * This directly reproduces the user's reported "源代码按钮没反应" bug. We click
 * the button via the same __htmlyTest bridge the Bold test uses, and we verify
 * BOTH the webview DOM (CodeMirror .cm-editor appears, Tiptap disappears) and
 * the extension-side ack (mode === 'source').
 */
async function verifySourceButtonClick(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
  const testFilename = 'source-click-test.html';
  const testHtml = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Source Click Test</title></head>
  <body>
    <p>Source click reproduction fixture.</p>
  </body>
</html>`;

  const testUri = vscode.Uri.joinPath(workspaceFolder.uri, testFilename);
  await vscode.workspace.fs.writeFile(testUri, Buffer.from(testHtml, 'utf8'));

  await vscode.workspace.openTextDocument(testUri);
  await vscode.commands.executeCommand('vscode.openWith', testUri, 'htmly.editor');

  await waitForState(
    (s) => s.active && s.documentUri === testUri.toString() && s.mode === 'wysiwyg',
    '[source-click] Should open in Visual mode'
  );
  await waitForEditor(15_000, '[source-click] Tiptap should mount');

  // Clear warnings before the click
  await runScript(`window.__htmlyTest.clearWarnings()`);

  // REAL click on the Source button
  const click = await runScript<{ ok: boolean; reason?: string }>(`
    window.__htmlyTest.clickToolbarButton('button[title="Source Mode"]')
  `);
  assert.ok(
    click.ok,
    `[source-click] clickToolbarButton(Source) should succeed: ${JSON.stringify(click)}`
  );

  // Wait for CodeMirror DOM to appear (the smoking-gun signal of a real mode switch).
  await waitForDom(
    `!!document.querySelector('.cm-editor')`,
    15_000,
    `[source-click] CodeMirror (.cm-editor) should appear after Source click`
  );

  // Tiptap should be unmounted.
  const tiptapGone = await runScript<{ gone: boolean }>(
    `({ gone: !document.querySelector('.tiptap.ProseMirror') })`
  );
  assert.strictEqual(
    tiptapGone.gone,
    true,
    '[source-click] Tiptap should be unmounted after switching to Source'
  );

  // Extension should also ack the mode change.
  await waitForState(
    (s) => s.documentUri === testUri.toString() && s.mode === 'source',
    '[source-click] Extension ack should report source mode'
  );

  // Click back to WYSIWYG and verify the round-trip.
  const clickBack = await runScript<{ ok: boolean; reason?: string }>(`
    window.__htmlyTest.clickToolbarButton('button[title="WYSIWYG Mode"]')
  `);
  assert.ok(
    clickBack.ok,
    `[source-click] clickToolbarButton(WYSIWYG) should succeed: ${JSON.stringify(clickBack)}`
  );

  await waitForEditor(15_000, '[source-click] Tiptap should re-mount after WYSIWYG click');
  await waitForState(
    (s) => s.documentUri === testUri.toString() && s.mode === 'wysiwyg',
    '[source-click] Extension ack should report wysiwyg mode'
  );

  // Capture any warnings that were emitted during the click sequence.
  const finalWarnings = await runScript<{ warnings: string[] }>(
    `({ warnings: window.__htmlyTest.getConsoleWarnings() })`
  );
  const notReadyWarnings = finalWarnings.warnings.filter((w) =>
    String(w).includes('editor is not ready')
  );
  if (notReadyWarnings.length > 0) {
    console.log(
      `[source-click] NOTE: ${notReadyWarnings.length} "editor is not ready" warnings during click:`,
      notReadyWarnings
    );
  }

  console.log('[source-click] STRICT: real Source/WYSIWYG click round-trip verified');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForState(
  predicate: (state: HtmlyTestState) => boolean,
  message: string,
  timeoutMs = 15_000
): Promise<HtmlyTestState> {
  const started = Date.now();
  let lastState: HtmlyTestState | undefined;

  while (Date.now() - started < timeoutMs) {
    lastState = await vscode.commands.executeCommand<HtmlyTestState>('htmly.test.getState');
    if (predicate(lastState)) {
      return lastState;
    }
    await sleep(100);
  }

  assert.fail(`${message} Last state: ${JSON.stringify(lastState)}`);
}

/**
 * Wait until the Tiptap editor is actually mounted in the webview DOM.
 *
 * The editor only becomes queryable AFTER Vue's onMounted and useEditor's
 * internal mount() complete — these run on the next microtask tick after
 * the mode ref flips. A naive `await sleep(1500)` used to hide the race in
 * some fixtures and surface it in others, producing flakey tests.
 *
 * This helper polls via runScript (the same channel the click tests use)
 * so it is a true retry, not a fixed delay. Each individual runScript
 * failure is swallowed because the webview is often still booting when we
 * first probe it (the extension's runScript has a 10s ceiling; if the
 * first probe fires before the webview's onMessage handler is set up we
 * would otherwise spend that whole 10s on a single useless call).
 */
async function waitForEditor(timeoutMs = 15_000, message = 'Tiptap editor should mount'): Promise<void> {
  const started = Date.now();
  let lastResult: unknown = null;
  let lastError: unknown = null;
  while (Date.now() - started < timeoutMs) {
    try {
      // Short per-call ceiling so we can iterate even when the webview
      // is still booting (the 10s default would freeze the poll loop).
      lastResult = await runScript<boolean>(
        `!!document.querySelector('.tiptap.ProseMirror')`,
        1500
      );
      if (lastResult) return;
    } catch (err) {
      lastError = err;
      // webview is still loading — keep polling
    }
    await sleep(200);
  }
  assert.fail(
    `${message} (last DOM query returned ${JSON.stringify(lastResult)}, ` +
    `last error: ${lastError instanceof Error ? lastError.message : String(lastError)})`
  );
}

async function waitForDom(
  expression: string,
  timeoutMs = 15_000,
  message = 'DOM predicate should become truthy'
): Promise<unknown> {
  const started = Date.now();
  let last: unknown = null;
  let lastError: unknown = null;
  while (Date.now() - started < timeoutMs) {
    try {
      last = await runScript(expression, 1500);
      if (last) return last;
    } catch (err) {
      lastError = err;
      // webview is still loading — keep polling
    }
    await sleep(150);
  }
  assert.fail(
    `${message} (last result: ${JSON.stringify(last)}, ` +
    `last error: ${lastError instanceof Error ? lastError.message : String(lastError)})`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * E2E test bridge: execute a script in the webview context via __htmlyTest
 * and return the result. Uses the htmly.test.runScript extension command.
 *
 * Pass `timeoutMs` to override the extension's 10s default. The poller
 * helpers pass a small value (e.g. 1500ms) so they can iterate quickly
 * while the webview is still booting; the click/assert calls pass
 * undefined to get the full 10s ceiling.
 */
async function runScript<T>(script: string, timeoutMs?: number): Promise<T> {
  const result = await vscode.commands.executeCommand<unknown>(
    'htmly.test.runScript',
    script,
    timeoutMs
  );
  // The result may be a JSON-serialized string if it passed through VS Code IPC
  if (typeof result === 'string') {
    try {
      return JSON.parse(result) as T;
    } catch {
      // If it's not JSON, return as-is (could be error message etc.)
      return result as unknown as T;
    }
  }
  return result as T;
}
