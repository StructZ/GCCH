# Privacy Policy

**Last updated:** 2026-08-08

GCCH (Google Chat Code Highlighter) is a browser extension that highlights the
syntax of code blocks in Google Chat and adds a button to copy them. This
policy describes what data it does and does not handle.

## Data collection

GCCH does not collect, store remotely, or transmit any user data.

- **No network requests.** GCCH makes none. The highlighting library and every
  color theme it ships with are bundled into the extension at build time -
  nothing is fetched from a server at runtime.
- **No analytics or tracking.** There is no telemetry, no usage tracking, and
  no third-party script of any kind.
- **No message content leaves the page.** Code blocks are read from the
  already-rendered page purely to produce a highlighted copy shown next to
  the original. That processing happens entirely in memory, in your browser,
  and is discarded once rendered - it is never written to disk, synced, or
  sent anywhere.

## What is stored locally

GCCH saves exactly four preferences to `chrome.storage.sync`, so your settings
persist across sessions and sync between your own signed-in Chrome browsers:

- whether highlighting is enabled
- your selected color theme
- whether optional Gmail support is turned on
- whether debug logging is turned on

None of these are personal, sensitive, or identifying information, and none
of them leave Google's own sync-storage infrastructure for your account.

## Permissions

- **storage** - to save the preferences listed above.
- **scripting** - used only if you opt in to "Chat in Gmail" in the popup, to
  register the same content script on `mail.google.com` at runtime. Off by
  default.
- **`https://chat.google.com/*`** (host permission) - where the extension
  runs, since highlighting Chat's code blocks is its entire purpose.
- **`https://mail.google.com/*`** (optional host permission) - requested only
  if you explicitly enable "Chat in Gmail". Not requested at install time.

## Third parties

GCCH does not sell, share, or transfer any data to third parties. There are
no third-party services integrated into the extension.

## Changes to this policy

If GCCH's data practices ever change, this file will be updated and the
"Last updated" date above will reflect it.

## Contact

Questions about this policy can be filed as an issue on the project's
[GitHub repository](https://github.com/StructZ/GCCH/issues).
