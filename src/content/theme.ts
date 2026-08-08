import type { ThemePref } from '../shared/settings.js';
import { AUTO_THEME, type ThemeName } from '../themes/names.js';

export type Appearance = 'light' | 'dark';

/**
 * Theme resolution.
 *
 * Auto mode samples the page's actual background color rather than asking
 * prefers-color-scheme. Google Chat has its own Light/Dark/System setting, so a
 * user on a light OS can be looking at a dark Chat, and the media query would
 * confidently give us the wrong answer. Pixels do not lie.
 */

/** Parses an rgb()/rgba() computed value. Returns null when transparent or unparseable. */
export function parseRgb(value: string): [number, number, number] | null {
  const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/i.exec(value);
  if (match === null) return null;

  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (alpha === 0) return null;

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (raw: number): number => {
    const c = raw / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function appearanceFromColor(color: string): Appearance | null {
  const rgb = parseRgb(color);
  if (rgb === null) return null;
  return relativeLuminance(rgb) < 0.5 ? 'dark' : 'light';
}

/**
 * Walks up from `start` to the first ancestor with a non-transparent background
 * and classifies it. Falls back to the media query only if nothing on the chain
 * has a background at all, which should not happen on a real page.
 */
export function detectAppearance(start: Element | null): Appearance {
  let node: Element | null = start ?? document.body;

  while (node !== null) {
    const appearance = appearanceFromColor(getComputedStyle(node).backgroundColor);
    if (appearance !== null) return appearance;
    node = node.parentElement;
  }

  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches === true
    ? 'dark'
    : 'light';
}

/** Maps the stored preference plus detected appearance onto a concrete theme. */
export function resolveTheme(pref: ThemePref, appearance: Appearance): ThemeName {
  return pref === 'auto' ? AUTO_THEME[appearance] : pref;
}
