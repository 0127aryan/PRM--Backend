/**
 * Dev watcher — avoids `nest start --watch` breaking when project path contains `&`
 * (e.g. "Final Project L&C"). Compiles with Nest CLI, then runs dist/main.js via absolute path.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const nestCli = path.join(root, 'node_modules', '@nestjs/cli', 'bin', 'nest.js');
const mainJs = path.join(root, 'dist', 'main.js');

let appProcess = null;

function runNode() {
  if (!fs.existsSync(mainJs)) {
    console.warn('[dev-watch] Waiting for dist/main.js — compile in progress...');
    return;
  }

  if (appProcess) {
    appProcess.kill('SIGTERM');
    appProcess = null;
  }

  appProcess = spawn(process.execPath, [mainJs], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  appProcess.on('exit', (code, signal) => {
    if (signal !== 'SIGTERM' && code && code !== 0) {
      console.error(`[dev-watch] App exited with code ${code}`);
    }
  });
}

console.log('[dev-watch] Building...');
const initial = spawn(process.execPath, [nestCli, 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

initial.on('exit', (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  runNode();

  console.log('[dev-watch] Watching for changes...');
  const watcher = spawn(process.execPath, [nestCli, 'build', '--watch'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  let debounce = null;
  fs.watch(path.join(root, 'dist'), { recursive: true }, () => {
    if (debounce) {
      clearTimeout(debounce);
    }
    debounce = setTimeout(() => {
      if (fs.existsSync(mainJs)) {
        console.log('[dev-watch] Restarting app...');
        runNode();
      }
    }, 800);
  });

  const stop = () => {
    if (appProcess) {
      appProcess.kill('SIGTERM');
    }
    watcher.kill('SIGTERM');
    process.exit(0);
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
});
