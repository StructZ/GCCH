import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

import { AUTO_RELEVANCE_MIN } from '../shared/constants.js';
import * as log from '../shared/logger.js';

/**
 * Languages are registered explicitly rather than imported as a bundle. This is
 * what keeps the packaged extension small, and it is also why auto-detection can
 * only ever return one of these - highlightAuto picks from what is registered.
 *
 * Adding a language means adding it here AND adding its aliases to language.ts.
 */
const LANGUAGES = {
  bash,
  cpp,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  markdown,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml,
} as const;

let registered = false;

function ensureRegistered(): void {
  if (registered) return;
  for (const [name, definition] of Object.entries(LANGUAGES)) {
    hljs.registerLanguage(name, definition);
  }
  registered = true;
}

export interface HighlightResult {
  /** HTML from highlight.js. Source text is escaped by the library. */
  html: string;
  language: string;
}

/**
 * Highlights a block, or declines to.
 *
 * Returning null is a first-class outcome, not a failure: it means "render this as
 * plain monospace". A wrong guess looks broken in a way that no highlighting does
 * not, so when confidence is low we do nothing rather than something colorful.
 */
export function highlightCode(code: string, language: string | null): HighlightResult | null {
  if (code.trim() === '') return null;

  ensureRegistered();

  try {
    if (language !== null) {
      // An explicit tag is a user instruction. Honor it, and let hljs recover
      // from syntax it does not like rather than throwing on a half-written
      // snippet - which is most of what gets pasted into chat.
      const result = hljs.highlight(code, { language, ignoreIllegals: true });
      log.debug('highlight: explicit', language);
      return { html: result.value, language };
    }

    const auto = hljs.highlightAuto(code);
    const detected = auto.language;

    if (detected === undefined || auto.relevance < AUTO_RELEVANCE_MIN) {
      log.debug('highlight: auto rejected', detected ?? 'none', 'relevance', auto.relevance);
      return null;
    }

    log.debug('highlight: auto', detected, 'relevance', auto.relevance);
    return { html: auto.value, language: detected };
  } catch (err) {
    // Never let a highlighter bug break the block. Plain monospace with a working
    // copy button is a perfectly good outcome.
    log.warn('highlight failed, falling back to plain text', err);
    return null;
  }
}

/** Exposed for tests, so the registered set can be asserted directly. */
export function registeredLanguages(): string[] {
  ensureRegistered();
  return hljs.listLanguages().sort();
}
