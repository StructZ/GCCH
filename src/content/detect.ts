import { PROCESSED_ATTR, SEL } from '../shared/constants.js';
import * as log from '../shared/logger.js';

/**
 * Finds code blocks that still need processing.
 *
 * Degrades rather than throws: a selector that no longer matches yields an empty
 * result and a one-time warning naming which tier failed. The worst outcome of a
 * Google redesign should be that GCCH quietly does nothing.
 */

function queryAll(root: ParentNode, selector: string): HTMLElement[] {
  try {
    return Array.from(root.querySelectorAll<HTMLElement>(selector));
  } catch (err) {
    log.warnOnce(`bad-selector:${selector}`, 'invalid selector', selector, err);
    return [];
  }
}

/**
 * Hard guardrail: never touch the composer.
 *
 * This is an unconditional ancestor check rather than a selector refinement,
 * so it holds even if every other selector in the file drifts.
 */
export function isInComposer(el: Element): boolean {
  return el.closest(SEL.COMPOSER) !== null;
}

/** The element we mount into: Chat's block wrapper, or the article's parent. */
export function containerFor(article: HTMLElement): HTMLElement | null {
  return article.closest<HTMLElement>(SEL.BLOCK_CONTAINER) ?? article.parentElement;
}

export function findCodeBlocks(root: ParentNode): HTMLElement[] {
  const unprocessed = `:not([${PROCESSED_ATTR}])`;

  let found = queryAll(root, `${SEL.CODE_BLOCK}${unprocessed}`);
  let tier = 'role';

  if (found.length === 0) {
    // The role attribute is the durable selector, so needing this branch is a
    // signal worth recording rather than a routine fallback.
    const fallback = queryAll(root, `${SEL.CODE_BLOCK_FALLBACK}${unprocessed}`);
    if (fallback.length > 0) {
      log.warnOnce(
        'selector-fallback',
        `primary selector "${SEL.CODE_BLOCK}" matched nothing but the fallback did. ` +
          `Chat's markup has probably changed - see src/shared/constants.ts.`,
      );
      found = fallback;
      tier = 'fallback';
    }
  }

  const usable = found.filter((el) => !isInComposer(el) && containerFor(el) !== null);

  if (usable.length > 0) log.debug(`found ${usable.length} block(s) via ${tier}`);
  return usable;
}

/** True when the document contains rendered messages, used by the health check. */
export function hasMessages(root: ParentNode): boolean {
  return root.querySelector(SEL.MESSAGE) !== null;
}
