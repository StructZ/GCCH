/**
 * Turns a Google Chat code block element back into its source text.
 *
 * This is not `article.textContent`. Chat renders each source line as its own
 * child <div>, so textContent concatenates every line with no separator and hands
 * you one long unusable string. It also uses non-breaking spaces for indentation
 * and salts each line with an empty display:none span.
 *
 * Pure: takes an element, returns a string, never mutates anything.
 */

/** A line is blank when it holds nothing but a <br>. */
function isBlankLine(el: Element): boolean {
  return el.textContent?.trim() === '';
}

/**
 * Collects visible text, skipping display:none descendants.
 *
 * Chat appends an empty `<span style="display:none">` to most lines. Today those
 * are empty so it makes no difference, but they are clearly a slot for something,
 * and if Chat ever puts text in them it would silently corrupt every copied
 * snippet. Cheaper to exclude them now than to debug that later.
 */
function visibleText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  if (el.style.display === 'none' || el.hasAttribute('hidden')) return '';

  let out = '';
  for (const child of Array.from(el.childNodes)) out += visibleText(child);
  return out;
}

/** Non-breaking space, used by Chat for every leading and repeated space. */
const NBSP = ' ';

export function extractCode(article: Element): string {
  const children = Array.from(article.children);

  // Defensive: if Chat ever stops using per-line children, fall back to the raw
  // text rather than returning nothing. Degraded output beats no output.
  if (children.length === 0) {
    return (article.textContent ?? '').replaceAll(NBSP, ' ');
  }

  const lines = children.map((child) =>
    isBlankLine(child) ? '' : visibleText(child).replaceAll(NBSP, ' '),
  );

  // Trailing blank lines are an artifact of how the block is rendered, not part of
  // what the sender typed. Leading indentation is preserved byte-for-byte.
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  return lines.join('\n');
}
