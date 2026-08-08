/**
 * Every Google Chat selector in this codebase lives here. Nothing else may contain
 * a Chat selector string.
 *
 * When Google ships a Chat redesign, this file is the blast radius. Each entry is
 * tagged with a stability tier so you know what you are dealing with:
 *
 *   DURABLE   - accessibility role or semantic tag. Google changes these rarely,
 *               because doing so breaks screen readers.
 *   VOLATILE  - obfuscated build-generated class name. Assume it will change.
 *
 * See docs/DOM-NOTES.md for the captured ground-truth markup these came from.
 */
export const SEL = {
  /** DURABLE. The rendered code block itself. Primary detection selector. */
  CODE_BLOCK: 'article[role="code"]',

  /** VOLATILE. Fallback when the role attribute disappears. */
  CODE_BLOCK_FALLBACK: 'div.kaPZDd > article',

  /**
   * VOLATILE. Wrapper holding the article plus Google's own "Toggle wrap" toolbar.
   * We mount our shadow host into this. If it stops matching we fall back to the
   * article's parentElement, which is the same node by another name.
   */
  BLOCK_CONTAINER: 'div.kaPZDd',

  /**
   * VOLATILE. Google's own code-block toolbar (the "Toggle wrap" button).
   *
   * Hidden while we are active. It restyles the <article> we hide, so it is a
   * no-op on our render, and it sits exactly where our own controls go - leaving
   * it visible put two overlapping buttons in the same corner. We ship our own
   * wrap toggle instead.
   */
  NATIVE_TOOLBAR: 'div.n5Mo1b',

  /** DURABLE. The scrolling message list. Observer root when present. */
  MESSAGE_ROOT: 'div[role="main"]',

  /**
   * DURABLE. The composer. Any candidate inside one of these is rejected
   * unconditionally - we only ever touch messages that have been sent.
   */
  COMPOSER: '[contenteditable="true"]',

  /**
   * DURABLE. A sent message. Used by the health check to tell "this page has no
   * messages yet" apart from "our selectors stopped matching".
   */
  MESSAGE: '[data-message-id]',
} as const;

/** Marks an article as handled so the observer never reprocesses it. */
export const PROCESSED_ATTR = 'data-gcch-processed';

/** Identifies our injected shadow host. */
export const HOST_ATTR = 'data-gcch-host';

/**
 * Google's own convention for keeping injected UI out of copied message text.
 * Their code-block toolbar carries it; ours must too, or our render would end up
 * duplicated in the clipboard when a user copies the message.
 */
export const EXCLUDE_FROM_CLIPBOARD_ATTR = 'exclude-from-clipboard';

/** Added to BLOCK_CONTAINER to hide the original article via our own stylesheet. */
export const ACTIVE_CLASS = 'gcch-active';

/** id of the single page-level stylesheet we inject. */
export const PAGE_STYLE_ID = 'gcch-page-style';

/**
 * highlightAuto results below this relevance score are discarded and the block is
 * rendered as plain monospace instead. Without a floor, logs, stack traces and
 * prose get confidently mislabeled as some random language and look broken.
 */
export const AUTO_RELEVANCE_MIN = 8;

/** Trailing throttle for the mutation-driven rescan, in ms. */
export const SCAN_THROTTLE_MS = 150;

/** How long the copy button shows its confirmation state, in ms. */
export const COPY_FEEDBACK_MS = 1500;
