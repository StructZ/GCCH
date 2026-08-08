import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/shared/settings.js';

/**
 * Storage is untrusted input: it survives extension downgrades, syncs from a
 * machine running an older version, and can be edited by hand. Anything invalid
 * must fall back to a default rather than reaching the content script.
 */
describe('normalizeSettings', () => {
  it('returns defaults for missing or malformed input', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('nonsense')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('accepts valid values', () => {
    expect(
      normalizeSettings({ enabled: false, theme: 'monokai', gmailEnabled: true, debug: true }),
    ).toEqual({ enabled: false, theme: 'monokai', gmailEnabled: true, debug: true });
  });

  it('accepts auto as a theme', () => {
    expect(normalizeSettings({ theme: 'auto' }).theme).toBe('auto');
  });

  it('falls back when a stored theme no longer exists', () => {
    expect(normalizeSettings({ theme: 'solarized-from-a-future-version' }).theme).toBe('auto');
  });

  it('ignores wrongly typed fields individually', () => {
    const result = normalizeSettings({ enabled: 'yes', theme: 'github', debug: 1 });

    expect(result.enabled).toBe(DEFAULT_SETTINGS.enabled);
    expect(result.debug).toBe(DEFAULT_SETTINGS.debug);
    expect(result.theme).toBe('github');
  });
});
