# Project status

Snapshot as of **2026-08-07**, v1.0.0. Written so this project can be picked up cold
months later without re-deriving anything.

Read alongside [`DOM-NOTES.md`](DOM-NOTES.md) (the Chat markup ground truth) and
[`../CONTRIBUTING.md`](../CONTRIBUTING.md) (workflow).

## Where things stand

**Working and confirmed in real Google Chat.** Code blocks are detected, highlighted,
wrapped, and copyable. Verified by the author on `chat.google.com` in dark mode.

**Automated gate is green:** 59 tests, typecheck, lint, format. `pnpm check` runs all
of it. CI runs the same plus a build and a bundle-shape assertion.

## Verified by hand

- Highlighting appears on real sent messages (markdown and bash blocks)
- Copy button works
- Rounded corners, tight padding, line wrapping
- Dark mode detection

## NOT yet verified — do these before trusting it further

These are the real remaining risks. None are covered by tests because they need a
live browser and a Google account.

1. **Native message copy is byte-exact.** Copy a message with a code block using
   Chat's own menu, paste into an editor, compare against the original. This is the
   most important one - it protects the user's actual data. It should hold, because
   the original `<article>` is never modified, but it has not been confirmed since
   the toolbar-hiding change.
2. **Wrap toggle off.** Click "Wrap" on a wide block; it should revert to horizontal
   scrolling. Collapsing `overflow-x` and `white-space` inside a shadow root is the
   least-trusted CSS path here.
3. **Composer untouched.** Type a ``` block in the composer without sending. Nothing
   should be highlighted or altered until sent.
4. **Scroll performance.** DevTools Performance recording while scrolling a long
   space. No long tasks attributable to the observer.
5. **Light mode / theme switching.** Switch Chat's own theme while leaving the OS
   theme fixed. Highlighting must follow Chat, which is the whole point of luminance
   detection over `prefers-color-scheme`.
6. **Space navigation.** Switch between spaces; blocks must still highlight after
   Chat replaces `div[role="main"]`.
7. **Disable toggle.** Turn highlighting off in the popup; the page must return to
   normal without a reload.
8. **Gmail path.** Entirely unexercised. `chrome.scripting.registerContentScripts`
   after granting the optional permission has never run.
9. **Untagged auto-detect quality.** Send a raw stack trace with no language tag; it
   should stay plain monospace rather than being mislabeled.
10. **Explicit language tag.** Send a block whose first line is `python`. The tag line
    should vanish from the render and the block should be Python-colored. **This path
    is only tested synthetically** - the original DOM capture had no language tag, so
    the assumption that Chat preserves the tag as a literal first line is unconfirmed
    against real markup.

## Tuning knobs

Both live in `src/shared/constants.ts`:

| Constant             | Now | Change it if                                                                                                                                                     |
| -------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTO_RELEVANCE_MIN` | 8   | Untagged blocks stay plain when they should be colored (lower it), or logs get mislabeled as a language (raise it). This is a starting guess, not a tuned value. |
| `SCAN_THROTTLE_MS`   | 150 | Scrolling stutters (raise), or new messages take too long to highlight (lower).                                                                                  |

## Decisions worth not relitigating

- **Shadow DOM sibling, original never mutated.** This is load-bearing. It keeps
  Chat's native copy byte-exact, avoids provoking Google's Wiz renderer, and makes
  disable/unmount perfectly reversible. Do not "simplify" it into an innerHTML
  rewrite of the article.
- **Google's native toolbar is hidden.** Its "Toggle wrap" restyles the article we
  hide, so it was dead, and it occupied the same corner as our controls. We ship our
  own wrap toggle. (The original plan kept it visible; that was reversed once the
  button collision showed up in practice.)
- **Wrap is on by default.** Chat panes are narrow; horizontal scrolling to read the
  end of a line is worse than soft wrapping.
- **Atom One is the default theme.** GitHub's themes washed out at chat font sizes.
- **15 languages, registered explicitly.** Auto-detection can only ever return a
  registered language, so the list bounds both features.
- **Everything is local.** No network calls at all - verified by grepping the built
  bundle for `fetch`/XHR/WebSocket/dynamic import (zero hits). highlight.js and every
  theme are bundled as strings. Keep it that way; it is the extension's main privacy
  claim and what makes the CSP story trivial.

## Known limitations

- Inline code (single backticks) is not highlighted, only fenced blocks. Deliberate.
- Wrap state is per-block and resets on re-render; it is not persisted.
- Only the languages in `highlight.ts` are recognized.

## Repo notes

- **Git identity is repo-local**, set via `git config --local` so the machine's
  global identity is untouched. **A fresh clone will not carry this** -
  `.git/config` is not cloned. Re-run:
  ```bash
  git config --local user.name "Your Name"
  git config --local user.email "your@email.com"
  ```
- **pnpm, not npm.** Pinned via `packageManager`. `corepack enable` then `pnpm install`.
- `icons/*.png` are gitignored and regenerated by the `prebuild` hook, so a fresh
  clone still builds.
- `tests/fixtures/chat-code-block.html` is a synthetic recreation of Chat's DOM
  shape, not a capture of a real message - safe to keep public.

## If it suddenly stops working

Almost certainly Google changed Chat's markup. Turn on **Debug logging** in the popup,
reload Chat, and check the console for `[GCCH]` lines - a `selector miss` or
`selector-fallback` warning names the failure. Then follow the fixture-capture recipe
in [`DOM-NOTES.md`](DOM-NOTES.md). Every selector is in `src/shared/constants.ts` and
nowhere else, so the fix is usually one line.
