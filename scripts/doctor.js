import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const minimumMajor = 22;
const nodeMajor = Number(process.versions.node.split('.')[0]);
let failed = false;

function ok(message) {
  console.log(`ok - ${message}`);
}

function warn(message) {
  failed = true;
  console.error(`fix - ${message}`);
}

if (nodeMajor >= minimumMajor) {
  ok(`Node ${process.version} on ${process.platform}/${process.arch}`);
} else {
  warn(`Use Node ${minimumMajor}+; current version is ${process.version}.`);
}

try {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.prepare('SELECT 1').get();
  db.close();
  ok('better-sqlite3 native module loads correctly');
} catch (error) {
  warn('better-sqlite3 could not load. Rebuild dependencies for this Node architecture.');
  console.error('');
  console.error('Recommended local fix:');
  console.error('  rm -rf node_modules');
  console.error('  npm ci');
  console.error('');
  console.error('On Apple Silicon, make sure your terminal and Node use the same architecture:');
  console.error('  node -p "process.arch"');
  console.error('  arch -arm64 npm ci');
  console.error('');
  console.error(error instanceof Error ? error.message : error);
}

if (failed) process.exit(1);
