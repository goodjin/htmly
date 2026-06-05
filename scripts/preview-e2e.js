#!/usr/bin/env node
'use strict';

const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { join, resolve } = require('path');
const { spawn, spawnSync } = require('child_process');

const root = resolve(__dirname, '..');
const workspace = join(root, 'test', 'e2e', 'workspace');

// ---------------------------------------------------------------------------
// Fixtures — same HTML categories as the E2E test suite
// ---------------------------------------------------------------------------

const fixtures = [
  {
    name: 'full-document.html',
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Full Document</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #333; line-height: 1.6; max-width: 720px; margin: 0 auto; padding: 32px; }
    h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 8px; }
    .highlight { background: #ffe; padding: 2px 4px; }
    blockquote { border-left: 3px solid #0e639c; padding-left: 12px; color: #666; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Full Document Title</h1>
  <p class="highlight">A paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
  <ul>
    <li>Item one</li>
    <li>Item two</li>
    <li>Item three</li>
  </ul>
  <blockquote><p>A wise quote from a wise person.</p></blockquote>
  <pre><code>const greeting = "Hello, Htmly!";
console.log(greeting);</code></pre>
</body>
</html>`,
  },
  {
    name: 'fragment.html',
    html: `<div class="card">
  <h2>Fragment Card</h2>
  <p>This file has no doctype or body wrapper.</p>
  <p><strong>Styled</strong> text inside a fragment.</p>
  <a href="https://example.com">A link</a>
</div>`,
  },
  {
    name: 'minimal.html',
    html: `<p>Hello, world!</p>`,
  },
  {
    name: 'table-layout.html',
    html: `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Table Layout</title></head>
<body>
  <h1>Table Fixture</h1>
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
</html>`,
  },
  {
    name: 'links.html',
    html: `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Links</title></head>
<body>
  <h2>Link Gallery</h2>
  <ul>
    <li><a href="https://example.com">Example</a></li>
    <li><a href="https://github.com">GitHub</a></li>
    <li><a href="mailto:user@example.com">user@example.com</a></li>
    <li><a href="../page.html">Relative link</a></li>
  </ul>
</body>
</html>`,
  },
  {
    name: 'images.html',
    html: `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Images</title></head>
<body>
  <h2>Image Gallery</h2>
  <figure>
    <img src="https://picsum.photos/seed/htmly1/400/300" alt="Landscape">
    <figcaption>A beautiful landscape</figcaption>
  </figure>
  <figure>
    <img src="https://picsum.photos/seed/htmly2/400/300" alt="Portrait">
    <figcaption>A portrait</figcaption>
  </figure>
</body>
</html>`,
  },
  {
    name: 'special-chars.html',
    html: `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Special &amp; Characters</title></head>
<body>
  <h1>Entities &amp; Unicode</h1>
  <p>Price: 10 &lt; 20 &amp; 20 &gt; 10</p>
  <p>Arrows: &larr; &rarr; &harr;</p>
  <p>Currency: &euro; &pound; &yen;</p>
  <p>Math: 2 &times; 3 &divide; 1 = 6</p>
  <p>Quotes: &ldquo;hello&rdquo; &lsquo;world&rsquo;</p>
</body>
</html>`,
  },
  {
    name: 'inline-styles.html',
    html: `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Inline Styles</title></head>
<body>
  <p style="color: red;">Red text</p>
  <p style="color: blue; font-size: 20px;">Blue large text</p>
  <p style="background: yellow; padding: 4px;">Highlighted</p>
  <div style="border: 1px solid #ccc; padding: 10px;">Boxed content</div>
</body>
</html>`,
  },
  {
    name: 'nested.html',
    html: `<!doctype html>
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
          <ul><li>Nested bullet</li></ul>
        </li>
        <li>Second</li>
      </ol>
    </section>
  </article>
</body>
</html>`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function generateFixtures() {
  if (!existsSync(workspace)) {
    mkdirSync(workspace, { recursive: true });
  }
  for (const { name, html } of fixtures) {
    writeFileSync(join(workspace, name), html, 'utf8');
    console.log(`  \u2713 ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Step 1: Build
  console.log('\u2550'.repeat(50));
  console.log('  Building extension and webview');
  console.log('\u2550'.repeat(50) + '\n');
  run('npm', ['run', 'build']);

  // Step 2: Generate fixtures
  console.log('\n' + '\u2550'.repeat(50));
  console.log('  Generating test HTML fixtures');
  console.log('\u2550'.repeat(50) + '\n');
  generateFixtures();

  // Step 3: Launch VS Code
  console.log('\n' + '\u2550'.repeat(50));
  console.log('  Launching VS Code');
  console.log('\u2550'.repeat(50) + '\n');

  const {
    downloadAndUnzipVSCode,
    resolveCliArgsFromVSCodeExecutablePath,
  } = require('@vscode/test-electron');

  const vscodeExecutablePath = await downloadAndUnzipVSCode();
  const [cli, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(
    vscodeExecutablePath
  );

  // Create workspace settings to make Htmly the default HTML editor
  const settingsDir = join(workspace, '.vscode');
  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true });
  }
  
  // Use proper VS Code settings format
  writeFileSync(
    join(settingsDir, 'settings.json'),
    JSON.stringify({
      'workbench.editorAssociations': {
        '*.html': 'htmly.editor',
        '*.htm': 'htmly.editor'
      },
      'files.associations': {
        '*.html': 'html',
        '*.htm': 'html'
      }
    }, null, 2)
  );

  const fixturePaths = fixtures.map((f) => join(workspace, f.name));

  const args = [
    ...cliArgs,
    '--extensionDevelopmentPath',
    root,
    '--disable-workspace-trust',
    workspace,
    '--new-window',
    ...fixturePaths,
  ];

  const child = spawn(cli, args, {
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  child.unref();

  console.log(`\u2713 VS Code launched with ${fixtures.length} test HTML files.\n`);
  console.log(`  Workspace : ${workspace}`);
  console.log(`  Extension : ${root}`);
  console.log(`  Files     :`);
  for (const { name } of fixtures) {
    console.log(`              ${name}`);
  }
  console.log('');
  console.log('');
  console.log('  Files will open with Htmly Editor automatically');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
