import { isThemeName, type ThemeName } from '../themes/names.js';

export type ThemePref = 'auto' | ThemeName;

export interface Settings {
  enabled: boolean;
  theme: ThemePref;
  gmailEnabled: boolean;
  debug: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  theme: 'auto',
  gmailEnabled: false,
  debug: false,
};

/**
 * Storage is untrusted input: it survives extension downgrades, sync from another
 * machine running an older version, and manual editing. Every field is validated
 * rather than cast, so a stale value can never put the content script into a state
 * its types say is impossible.
 */
export function normalizeSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS };
  const value = raw as Record<string, unknown>;

  const theme = value['theme'];
  const validTheme: ThemePref =
    theme === 'auto' || (typeof theme === 'string' && isThemeName(theme))
      ? theme
      : DEFAULT_SETTINGS.theme;

  return {
    enabled: typeof value['enabled'] === 'boolean' ? value['enabled'] : DEFAULT_SETTINGS.enabled,
    theme: validTheme,
    gmailEnabled:
      typeof value['gmailEnabled'] === 'boolean'
        ? value['gmailEnabled']
        : DEFAULT_SETTINGS.gmailEnabled,
    debug: typeof value['debug'] === 'boolean' ? value['debug'] : DEFAULT_SETTINGS.debug,
  };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return normalizeSettings(stored);
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(patch);
}

/** Subscribes to sync-storage changes and reports the full normalized settings. */
export function onSettingsChanged(handler: (settings: Settings) => void): () => void {
  const listener = (
    _changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== 'sync') return;
    void loadSettings().then(handler);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
