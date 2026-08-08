# Changelog

Selector changes get their own line. They are the change class most likely to cause
a field regression, so they should never be buried inside a general entry.

## 1.0.0

Initial release.

- Syntax highlighting for Google Chat code blocks, rendered into a shadow root beside
  the original so message data is never modified.
- Copy button per block, copying the clean source with any language tag line removed.
- 15 bundled languages: bash, cpp, css, diff, go, java, javascript, json, markdown,
  python, rust, sql, typescript, xml, yaml.
- Auto-detection gated on a relevance score, so low-confidence blocks render as plain
  monospace instead of being mislabeled.
- Six themes plus Auto mode, which follows Chat's own appearance via background
  luminance rather than `prefers-color-scheme`.
- Optional Gmail support, off by default, registered at runtime on user consent.
- Selectors: `article[role="code"]` (primary), `div.kaPZDd > article` (fallback),
  `div.kaPZDd` (container), `div[role="main"]` (observer root). Captured 2026-08-06.
