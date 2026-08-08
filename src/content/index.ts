import { SEL } from '../shared/constants.js';
import * as log from '../shared/logger.js';
import { loadSettings, onSettingsChanged, type Settings } from '../shared/settings.js';
import { containerFor, findCodeBlocks, hasMessages } from './detect.js';
import { extractCode } from './extract.js';
import { highlightCode } from './highlight.js';
import { parseLanguageTag } from './language.js';
import { startObserver, type ObserverHandle } from './observer.js';
import { applyTheme, ensurePageStyle, mount, unmountAll } from './render.js';
import { detectAppearance, resolveTheme, type Appearance } from './theme.js';
import type { ThemeName } from '../themes/names.js';

/**
 * Content script entry point.
 *
 * Owns the lifecycle: read settings, run the observer while enabled, tear
 * everything down cleanly when disabled. Disabling must fully restore the page
 * without a reload, which is why unmountAll exists and why nothing here mutates
 * Chat's own nodes beyond adding a class.
 */

let settings: Settings | null = null;
let observer: ObserverHandle | null = null;
let appearance: Appearance = 'light';
let appearanceWatcher: MutationObserver | null = null;
let scanCount = 0;

function currentTheme(): ThemeName {
  return resolveTheme(settings?.theme ?? 'auto', appearance);
}

function processBlock(article: HTMLElement, theme: ThemeName): void {
  const container = containerFor(article);
  if (container === null) return;

  const raw = extractCode(article);
  const { language, code } = parseLanguageTag(raw);
  const result = highlightCode(code, language);

  mount({
    container,
    article,
    source: code,
    html: result?.html ?? null,
    language: result?.language ?? null,
    theme,
  });
}

function scan(): void {
  if (settings?.enabled !== true) return;

  const blocks = findCodeBlocks(document);
  scanCount += 1;

  if (blocks.length > 0) {
    ensurePageStyle();
    const theme = currentTheme();
    for (const article of blocks) {
      try {
        processBlock(article, theme);
      } catch (err) {
        // One bad block must never stop the others from rendering.
        log.error('failed to process a code block', err);
      }
    }
    return;
  }

  // Health check. If a page full of messages never yields a single block, the
  // markup has probably moved out from under us. Say so loudly once, so a bug
  // report becomes a diagnosis instead of a mystery.
  if (scanCount === 5 && hasMessages(document)) {
    log.warnOnce(
      'selector-miss',
      'messages are present but no code blocks matched any known selector. ' +
        'Chat markup has likely changed - update SEL in src/shared/constants.ts ' +
        'and capture a new fixture under tests/fixtures/.',
    );
  }
}

function refreshAppearance(): void {
  const next = detectAppearance(document.querySelector(SEL.MESSAGE) ?? document.body);
  if (next === appearance) return;
  appearance = next;
  log.debug('appearance changed to', appearance);
  if (settings?.theme === 'auto') applyTheme(currentTheme());
}

function watchAppearance(): void {
  if (appearanceWatcher !== null) return;

  // Chat signals its own theme by restyling the document root, so that is what we
  // watch. The media query is a secondary trigger only - it is wrong whenever the
  // in-app theme disagrees with the OS.
  appearanceWatcher = new MutationObserver(refreshAppearance);
  appearanceWatcher.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style'],
  });
  appearanceWatcher.observe(document.body, {
    attributes: true,
    attributeFilter: ['class', 'style'],
  });

  globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    refreshAppearance();
  });
}

function enable(): void {
  if (observer !== null) return;
  refreshAppearance();
  watchAppearance();
  observer = startObserver(scan);
  log.debug('enabled');
}

function disable(): void {
  observer?.disconnect();
  observer = null;
  unmountAll(document);
  scanCount = 0;
  log.debug('disabled, page restored');
}

function apply(next: Settings): void {
  const previous = settings;
  settings = next;
  log.setDebug(next.debug);

  if (next.enabled === false) {
    disable();
    return;
  }

  if (previous?.enabled !== true) {
    enable();
    return;
  }

  if (previous.theme !== next.theme) {
    refreshAppearance();
    applyTheme(currentTheme());
  }
}

async function main(): Promise<void> {
  try {
    apply(await loadSettings());
    onSettingsChanged(apply);
  } catch (err) {
    log.error('failed to start', err);
  }
}

void main();
