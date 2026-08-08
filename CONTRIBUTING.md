# Contributing

## Setup

```bash
corepack enable
pnpm install
pnpm build
```

Load `dist/` at `chrome://extensions` (Developer mode → Load unpacked).

`pnpm check` runs everything CI runs. Run it before pushing.

## The one rule that matters

**Never modify Google's DOM nodes.** The original `<article>` stays exactly as Chat
rendered it; we add a sibling shadow host and hide the original with a class. This is
what keeps Chat's native message copy byte-exact and lets the extension uninstall
itself from a live page without a reload.

If a change makes you want to rewrite the article's contents, that is a design
problem, not an implementation detail. Raise it in an issue first.

## Where to put things

| Change                          | File                                              |
| ------------------------------- | ------------------------------------------------- |
| A Chat selector                 | `src/shared/constants.ts` — nowhere else          |
| Parsing/logic that can be wrong | a pure module, with tests                         |
| Anything that touches the DOM   | keep it thin; the logic belongs in a pure module  |
| A `console.log`                 | `src/shared/logger.ts` (lint blocks it elsewhere) |

The pure modules (`extract`, `language`, `theme` math) take plain values and return
plain values. They hold nearly all the real logic and are cheap to test. Keep it that
way — it is what makes this codebase reviewable.

Files past ~200 lines are a signal to split, not a target.

## Fixing a Chat markup change

This is the most likely reason you are here.

1. Confirm it: turn on **Debug logging** in the popup and reload Chat. A one-time
   `selector miss` or `selector-fallback` warning names what broke.
2. In Chat DevTools, select the code block wrapper and run `$0.outerHTML`.
3. Save it as a **new** file in `tests/fixtures/` — do not replace the existing one.
   Keeping both is how compatibility across Chat rollouts stays proven rather than
   assumed.
4. Add it to the test matrix, update `SEL` in `constants.ts`, get **both** fixtures
   passing.
5. Update `docs/DOM-NOTES.md` and add a CHANGELOG line. Selector changes always get
   their own line — they are the change class most likely to break in the field.

## Adding a language

Both steps are required, or auto-detection and explicit tags will disagree:

1. Register it in `src/content/highlight.ts` (`LANGUAGES`).
2. Add its aliases to `ALIASES` in `src/content/language.ts`.
3. Update the assertion in `tests/highlight.test.ts`.

## Testing

`pnpm test`. Unit tests cover extraction, language parsing, highlight gating, theme
math, detection, render/unmount and settings validation.

Not unit-testable, so verify by hand in real Chat before releasing anything that
touches them:

- observer behaviour across scrolling and space navigation
- clipboard (both the `navigator.clipboard` path and the `execCommand` fallback)
- survival of Wiz re-renders
- Chat's own light/dark theme switching

The full manual pass is in the design doc's verification section. At minimum, always
re-check: **native message copy is byte-exact**, and **the composer is untouched
while typing a code block**.
