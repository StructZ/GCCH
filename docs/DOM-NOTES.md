# Google Chat DOM notes

Ground truth for every selector in `src/shared/constants.ts`. Captured **2026-08-06**
from a live `chat.google.com` message.

If Chat's markup changes, update this file in the same commit as the selector fix.
The next person should not have to re-derive any of this.

## The code block

```html
<div class="kaPZDd">
  <article role="code" class="Byzfyc">
    <div>&nbsp;Prerequisites<span style="display: none;"></span></div>
    <div><br /></div>
    <div>&nbsp; export API_TOKEN='&lt;your-api-token&gt;'<span style="display: none;"></span></div>
  </article>
  <div class="n5Mo1b" exclude-from-clipboard="true">
    <!-- Google's own "Toggle wrap" button -->
  </div>
</div>
```

## What this means in practice

**`article[role="code"]` is the durable selector.** It is an accessibility role, not
a build-generated class. Google changes these rarely because doing so breaks screen
readers. `div.kaPZDd` and `.Byzfyc` are obfuscated and should be assumed disposable.

**One `<div>` per source line.** This is why `extract.ts` exists.
`article.textContent` concatenates every line with no separator and gives you one
long unusable string. `tests/extract.test.ts` asserts that divergence directly so
nobody "simplifies" the extractor back into a bug.

**Blank lines are `<div><br></div>`** — no text content at all.

**Indentation is `&nbsp;` (U+00A0), not spaces.** Both leading indentation and
repeated interior spaces. Extraction converts them back to U+0020; if it did not,
copied code would break shell heredocs and YAML.

**Every line carries an empty `<span style="display:none">`.** Today they are empty,
so skipping them changes nothing. They are clearly a slot for something, and if Chat
ever puts text in them it would silently corrupt every copied snippet. `extract.ts`
excludes `display:none` subtrees for that reason.

**`exclude-from-clipboard="true"` is Chat's own convention** for keeping injected UI
out of copied message text. Their toolbar carries it, so our shadow host carries it
too. Without it, copying a message would yield the code twice.

**Chat does not parse ` ```lang ` fences.** It strips the backticks and keeps
everything else verbatim, so a language tag survives as the literal first line of the
block. `language.ts` strips it, but only when the line is a bare token — `python` is
a tag, `python -m venv .venv` is a shell command.

## Ancestors worth knowing

| Selector                        | Notes                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `div[role="main"]`              | Scrolling message list. Observer root. Chat **replaces this node** on space navigation, which is why `observer.ts` watches for the swap. |
| `[data-message-id]`             | Present on sent messages. Used by the health check to distinguish "no messages" from "selectors broke".                                  |
| `div.DTp27d` (`jsname="bgckF"`) | Message body wrapper. Volatile, currently unused.                                                                                        |
| `c-wiz[data-topic-id]`          | Thread root. Volatile, currently unused.                                                                                                 |

## Accepted limitation

Google's "Toggle wrap" button restyles the `<article>`, which we hide. So it is a
no-op on our render. Mitigation if it ever matters: listen for clicks on
`div.n5Mo1b button[aria-label="Toggle wrap"]` and toggle a wrap class inside our
shadow root — no dependency on Google's internal classes. Deliberately not in v1.

## Capturing a new fixture

When Chat's markup changes:

1. In Chat DevTools, select the block wrapper and run `$0.outerHTML`.
2. Save it as a **new** file in `tests/fixtures/`, alongside the old one. Do not
   replace the old fixture — keeping both is how compatibility across Chat rollouts
   stays proven rather than assumed.
3. Add it to the test matrix and adjust selectors until both fixtures pass.
