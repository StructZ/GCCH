import { loadSettings, saveSettings, type ThemePref } from '../shared/settings.js';
import { themeChoices } from '../themes/index.js';
import { isThemeName } from '../themes/names.js';

/**
 * Popup UI. Writes to chrome.storage.sync; the content script picks changes up
 * live via onChanged, so nothing here needs to message tabs or force a reload.
 */

const GMAIL_ORIGIN = 'https://mail.google.com/*';
const GMAIL_SCRIPT_ID = 'gcch-gmail';

function required<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`popup is missing #${id}`);
  return el as unknown as T;
}

const enabledInput = required<HTMLInputElement>('enabled');
const themeSelect = required<HTMLSelectElement>('theme');
const gmailInput = required<HTMLInputElement>('gmail');
const debugInput = required<HTMLInputElement>('debug');
const status = required<HTMLParagraphElement>('status');

function setStatus(message: string, tone: 'info' | 'error' = 'info'): void {
  status.textContent = message;
  status.dataset['tone'] = tone;
}

function populateThemes(): void {
  const auto = document.createElement('option');
  auto.value = 'auto';
  auto.textContent = 'Auto (match Chat)';
  themeSelect.appendChild(auto);

  for (const { name, label } of themeChoices()) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = label;
    themeSelect.appendChild(option);
  }
}

/**
 * Registers the Gmail content script at runtime.
 *
 * Gmail is not in host_permissions, so it is not requested at install time - that
 * warning reads as "this extension can read your email" and is not worth paying
 * for a feature most users will not turn on.
 */
async function registerGmailScript(): Promise<void> {
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [GMAIL_SCRIPT_ID] });
  if (existing.length > 0) return;

  await chrome.scripting.registerContentScripts([
    {
      id: GMAIL_SCRIPT_ID,
      matches: [GMAIL_ORIGIN],
      js: ['content.js'],
      runAt: 'document_idle',
      allFrames: true,
      persistAcrossSessions: true,
    },
  ]);
}

async function unregisterGmailScript(): Promise<void> {
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [GMAIL_SCRIPT_ID] });
  if (existing.length === 0) return;
  await chrome.scripting.unregisterContentScripts({ ids: [GMAIL_SCRIPT_ID] });
}

async function onGmailToggle(): Promise<void> {
  const wanted = gmailInput.checked;

  if (wanted === false) {
    await unregisterGmailScript();
    await chrome.permissions.remove({ origins: [GMAIL_ORIGIN] });
    await saveSettings({ gmailEnabled: false });
    setStatus('Gmail support off.');
    return;
  }

  // permissions.request must be called directly from the user gesture, so this
  // runs before any await that could break the gesture chain.
  const granted = await chrome.permissions.request({ origins: [GMAIL_ORIGIN] });

  if (granted === false) {
    gmailInput.checked = false;
    setStatus('Permission denied, Gmail support stays off.', 'error');
    return;
  }

  await registerGmailScript();
  await saveSettings({ gmailEnabled: true });
  setStatus('Gmail support on. Reload Gmail to apply.');
}

async function init(): Promise<void> {
  populateThemes();

  const settings = await loadSettings();
  enabledInput.checked = settings.enabled;
  themeSelect.value = settings.theme;
  debugInput.checked = settings.debug;

  // Storage can disagree with reality if the user revoked the permission from
  // chrome://extensions. The permission is the source of truth.
  const hasGmail = await chrome.permissions.contains({ origins: [GMAIL_ORIGIN] });
  gmailInput.checked = hasGmail;
  if (hasGmail !== settings.gmailEnabled) await saveSettings({ gmailEnabled: hasGmail });

  enabledInput.addEventListener('change', () => {
    void saveSettings({ enabled: enabledInput.checked });
    setStatus(enabledInput.checked ? 'Highlighting on.' : 'Highlighting off.');
  });

  themeSelect.addEventListener('change', () => {
    const value = themeSelect.value;
    const theme: ThemePref = value === 'auto' || isThemeName(value) ? value : 'auto';
    void saveSettings({ theme });
    setStatus('Theme updated.');
  });

  debugInput.addEventListener('change', () => {
    void saveSettings({ debug: debugInput.checked });
    setStatus(debugInput.checked ? 'Debug logging on.' : 'Debug logging off.');
  });

  gmailInput.addEventListener('change', () => {
    void onGmailToggle().catch((err: unknown) => {
      gmailInput.checked = false;
      setStatus(`Could not update Gmail support: ${String(err)}`, 'error');
    });
  });
}

void init().catch((err: unknown) => {
  setStatus(`Failed to load settings: ${String(err)}`, 'error');
});
