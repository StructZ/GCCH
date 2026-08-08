import a11yDark from 'highlight.js/styles/a11y-dark.css?inline';
import atomOneDark from 'highlight.js/styles/atom-one-dark.css?inline';
import tokyoNightDark from 'highlight.js/styles/tokyo-night-dark.css?inline';
import nightOwl from 'highlight.js/styles/night-owl.css?inline';
import monokai from 'highlight.js/styles/monokai.css?inline';
import githubDark from 'highlight.js/styles/github-dark.css?inline';
import a11yLight from 'highlight.js/styles/a11y-light.css?inline';
import atomOneLight from 'highlight.js/styles/atom-one-light.css?inline';
import githubLight from 'highlight.js/styles/github.css?inline';

import { THEME_LABELS, type ThemeName } from './names.js';

/**
 * Theme CSS, bundled as strings rather than shipped as files. Two reasons: nothing
 * is fetched at runtime (so no web_accessible_resources and a trivially clean CSP
 * story), and the CSS drops straight into a shadow root where it can neither leak
 * into nor be overridden by Chat's own styles.
 */

const THEME_CSS: Record<ThemeName, string> = {
  'a11y-dark': a11yDark,
  'atom-one-dark': atomOneDark,
  'tokyo-night-dark': tokyoNightDark,
  'night-owl': nightOwl,
  monokai,
  'github-dark': githubDark,
  'a11y-light': a11yLight,
  'atom-one-light': atomOneLight,
  github: githubLight,
};

export function themeCss(name: ThemeName): string {
  return THEME_CSS[name];
}

/** Theme id and label pairs, for building the popup's dropdown. */
export function themeChoices(): { name: ThemeName; label: string }[] {
  return Object.entries(THEME_LABELS).map(([name, label]) => ({
    name: name as ThemeName,
    label,
  }));
}

export { AUTO_THEME, isThemeName, THEME_LABELS, type ThemeName } from './names.js';
