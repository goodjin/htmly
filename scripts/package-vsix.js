const { existsSync, rmSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const root = join(__dirname, '..');
const webview = join(root, 'webview');
const packageJson = require(join(root, 'package.json'));
const vsixName = `${packageJson.name}-${packageJson.version}.vsix`;
const vsixPath = join(root, vsixName);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      NODE_ENV: options.nodeEnv ?? process.env.NODE_ENV,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function installIfMissing(cwd) {
  if (existsSync(join(cwd, 'node_modules'))) {
    return;
  }

  const hasLockfile = existsSync(join(cwd, 'package-lock.json'));
  run('npm', [hasLockfile ? 'ci' : 'install'], { cwd });
}

console.log(`Packaging ${packageJson.displayName} ${packageJson.version}`);

installIfMissing(root);
installIfMissing(webview);

if (existsSync(vsixPath)) {
  rmSync(vsixPath);
}

run('npm', ['run', 'lint']);
run('npx', ['tsc', '--noEmit']);
run('npx', ['vue-tsc', '--noEmit'], { cwd: webview });
run('npm', ['run', 'build']);
run('npm', ['run', 'package:raw']);

console.log(`Packaged extension: ${vsixPath}`);
