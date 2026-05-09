const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '../..');
  const extensionTestsPath = path.resolve(extensionDevelopmentPath, 'dist/test/e2e/suite/index.js');
  const testWorkspace = path.resolve(extensionDevelopmentPath, 'test/e2e/workspace');

  process.env.HTMLY_E2E = '1';

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [
      testWorkspace,
      '--disable-workspace-trust',
      '--skip-welcome',
      '--skip-release-notes',
    ],
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
