/**
 * Zips dist/ into a Chrome Web Store upload, named from the manifest version.
 *
 *   npm run package
 *
 * Verifies the build looks complete before zipping, because a store upload that
 * is missing content.js fails review a day later rather than immediately.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const releases = resolve(root, 'releases');

const REQUIRED = [
  'manifest.json',
  'content.js',
  'popup.html',
  'icons/16.png',
  'icons/48.png',
  'icons/128.png',
];

const missing = REQUIRED.filter((file) => !existsSync(resolve(dist, file)));
if (missing.length > 0) {
  console.error(`dist/ is incomplete, missing:\n  ${missing.join('\n  ')}\n\nRun: pnpm build`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(resolve(dist, 'manifest.json'), 'utf8')) as {
  version: string;
};

mkdirSync(releases, { recursive: true });
const archive = resolve(releases, `gcch-${manifest.version}.zip`);
rmSync(archive, { force: true });

execFileSync('zip', ['-r', '-q', archive, '.'], { cwd: dist });
console.log(`packaged ${archive}`);
