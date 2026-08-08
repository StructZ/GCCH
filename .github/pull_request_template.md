## What and why

<!-- What changes, and what problem it solves. -->

## Checks

- [ ] `pnpm check` passes
- [ ] Loaded `dist/` in Chrome and confirmed the change in real Google Chat

## If this touches the DOM

- [ ] The original `<article>` is still never modified
- [ ] Chat's native message copy is still byte-exact (copy a message, paste, compare)
- [ ] The composer is untouched while typing a code block
- [ ] Disabling from the popup still restores the page without a reload

## If this changes a selector

- [ ] New markup captured as a **new** fixture in `tests/fixtures/`, old one kept
- [ ] Both fixtures pass
- [ ] `docs/DOM-NOTES.md` updated
- [ ] CHANGELOG line added (selector changes always get their own line)
