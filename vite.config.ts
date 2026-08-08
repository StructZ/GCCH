import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const root = import.meta.dirname;
const outDir = resolve(root, 'dist');

/**
 * Two separate builds, selected by --mode, because they have incompatible output
 * requirements:
 *
 *  - `content`: MV3 content scripts cannot load ES module chunks, so this must be
 *    a single self-contained IIFE file. It also owns the static asset copy.
 *  - `popup`: an extension *page*, which may use ES modules, so it is built as a
 *    normal Vite HTML entry. It must not wipe the content build's output.
 *
 * See package.json `build`.
 */
export default defineConfig(({ mode }) => {
  if (mode === 'popup') {
    return {
      root: resolve(root, 'src/popup'),
      base: './',
      build: {
        outDir,
        emptyOutDir: false,
        rollupOptions: {
          input: resolve(root, 'src/popup/popup.html'),
        },
      },
    };
  }

  return {
    plugins: [
      viteStaticCopy({
        targets: [
          { src: 'manifest.json', dest: '.' },
          { src: 'icons', dest: '.' },
        ],
      }),
    ],
    build: {
      outDir,
      emptyOutDir: true,
      target: 'chrome114',
      lib: {
        entry: resolve(root, 'src/content/index.ts'),
        formats: ['iife'],
        name: 'GCCH',
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          // A content script is one file or it is nothing.
          inlineDynamicImports: true,
          extend: true,
        },
      },
    },
  };
});
