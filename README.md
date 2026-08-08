# GCCH — Google Chat Code Highlighter

Syntax highlighting and a copy button for code blocks in Google Chat.

Chat renders fenced code blocks as flat monospace text with no coloring and no way
to copy them cleanly. GCCH fixes both, without touching the composer and without
altering message data.

## Quick start

Requires Node 20.11+ and [pnpm](https://pnpm.io) 9+ (`corepack enable` is enough —
the version is pinned via `packageManager` in `package.json`).

```bash
pnpm install
pnpm build
```

Then load the unpacked extension: `chrome://extensions` → enable Developer mode →
**Load unpacked** → select `dist/`.

```bash
pnpm test      # unit tests
pnpm check     # typecheck + lint + format + tests
pnpm dev       # rebuild the content script on change
pnpm package   # zip dist/ into releases/ for the Web Store
```

After `pnpm dev` rebuilds, hit reload on the extension card and refresh Chat.

pnpm is used deliberately rather than npm: its non-flat `node_modules` makes phantom
dependencies a hard error, so a package we never declared cannot quietly get bundled
into the shipped extension.

## How it works

A content script watches the message list, finds `article[role="code"]` blocks, and
renders a highlighted copy into a shadow root **beside** the original — the original
`<article>` is never modified, only hidden by our own stylesheet.

That one decision buys three things: Chat's native "copy message" stays byte-exact,
Google's Wiz renderer never sees mutated nodes it might choke on, and disabling the
extension restores the page perfectly without a reload.

Highlighting uses highlight.js with 15 explicitly registered languages. Blocks with
an explicit language tag use it; blocks without one go through auto-detection that is
gated on a relevance score, so logs and stack traces render as clean monospace rather
than being confidently mislabeled.

## Layout

```
src/
  content/
    index.ts      lifecycle: settings, enable/disable, teardown
    observer.ts   MutationObserver, rAF-batched and throttled
    detect.ts     finds unprocessed blocks, rejects the composer
    extract.ts    article -> source text                    [pure]
    language.ts   language-tag parsing and aliases          [pure]
    highlight.ts  hljs subset + auto-detect confidence gate
    render.ts     shadow host, copy button, theme swapping
    theme.ts      luminance-based light/dark detection      [pure]
  shared/
    constants.ts  EVERY Chat selector lives here
    settings.ts   storage schema, validated on read
    logger.ts     the only sanctioned console user
  themes/         hljs theme CSS bundled as strings
  popup/          settings UI
tests/
  fixtures/       verbatim DOM captures from real Chat
docs/DOM-NOTES.md ground truth for the selectors
```

The `[pure]` modules take plain values and return plain values — no `chrome.*`, no
globals, no DOM mutation. They hold nearly all the logic that can actually be wrong,
and they are fully covered by tests.

## When Google changes Chat's markup

This extension sits on top of a DOM that can change without notice, so that case is
designed for rather than hoped against:

- **Every selector is in `src/shared/constants.ts`**, each tagged `DURABLE` (a11y
  role, semantic tag) or `VOLATILE` (obfuscated class). Nothing else in the codebase
  contains a Chat selector.
- **Failure is silent, not destructive.** Detection returns empty rather than
  throwing, mounting bails when the container is missing, and a highlighter error
  falls back to plain monospace with a working copy button. The worst realistic
  outcome is that GCCH does nothing — never that Chat breaks.
- **A health check names the problem.** If a page has messages but no block matches
  after several scans, GCCH logs a one-time warning pointing at `constants.ts`.
- **Turn on Debug logging in the popup** to see blocks found per scan, scan duration,
  language decisions with relevance scores, and any selector-tier fallback taken.

Fixing a break: capture the new markup per the recipe in
[`docs/DOM-NOTES.md`](docs/DOM-NOTES.md), add it as a _new_ fixture beside the old
one, update the selector, and get both fixtures passing.

## Privacy and permissions

- `storage` — preferences only.
- `scripting` — registers the Gmail content script at runtime, if you opt in.
- `chat.google.com` — where the extension does its work.
- `mail.google.com` — **optional**, off by default, requested only when you enable
  "Chat in Gmail" in the popup. It is not in `host_permissions` because that install
  warning reads as "this extension can read your email".

Everything runs locally. No network requests, no analytics, no message content leaves
the page. highlight.js and all theme CSS are bundled — nothing is fetched at runtime,
and there is no `eval` anywhere, so the MV3 CSP story is trivial.

## Adding a language

Two places, both required:

1. Import and register it in `src/content/highlight.ts` (`LANGUAGES`).
2. Add its aliases to `ALIASES` in `src/content/language.ts`.

Auto-detection can only ever return a registered language, so step 1 also widens what
untagged blocks can be detected as. Update the list assertion in
`tests/highlight.test.ts`.
