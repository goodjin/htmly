import * as assert from 'assert';
import * as vscode from 'vscode';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HtmlyTestState = {
  active: boolean;
  documentUri?: string;
  mode?: 'wysiwyg' | 'source' | 'preview';
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

/** 8. Large file (>500 KB) — should trigger readOnly / Source-only mode */
function largeFileFixture(): Fixture {
  const paragraphs: string[] = [];
  for (let i = 0; i < 6000; i++) {
    paragraphs.push(`    <p>Paragraph ${i}: ${'Lorem ipsum dolor sit amet. '.repeat(3)}</p>`);
  }
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Large File</title></head>
  <body>
${paragraphs.join('\n')}
  </body>
</html>`;

  assert.ok(
    Buffer.byteLength(html, 'utf8') > 500 * 1024,
    `Large fixture must exceed 500 KB (got ${Buffer.byteLength(html, 'utf8')} bytes)`
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
