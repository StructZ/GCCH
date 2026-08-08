/**
 * Theme identity, with no CSS attached.
 *
 * Split from index.ts so the pure modules (settings, theme detection) and the unit
 * tests can talk about themes without dragging stylesheets through the bundler.
 */

export const THEME_LABELS = {
  'atom-one-dark': 'Atom One Dark',
  'a11y-dark': 'Accessible Dark',
  'tokyo-night-dark': 'Tokyo Night',
  'night-owl': 'Night Owl',
  monokai: 'Monokai',
  'github-dark': 'GitHub Dark',
  'a11y-light': 'Accessible Light',
  'atom-one-light': 'Atom One Light',
  github: 'GitHub Light',
} as const satisfies Record<string, string>;

export type ThemeName = keyof typeof THEME_LABELS;

/**
 * Themes chosen by 'auto' mode.
 *
 * Atom One is the default: muted rather than saturated, so token types stay
 * distinguishable without the block turning into a rainbow at chat font sizes.
 * GitHub's themes wash out here, which is why they are no longer the default.
 */
export const AUTO_THEME: Record<'light' | 'dark', ThemeName> = {
  light: 'atom-one-light',
  dark: 'atom-one-dark',
};

export function isThemeName(value: string): value is ThemeName {
  return Object.prototype.hasOwnProperty.call(THEME_LABELS, value);
}
