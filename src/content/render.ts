import {
  ACTIVE_CLASS,
  COPY_FEEDBACK_MS,
  EXCLUDE_FROM_CLIPBOARD_ATTR,
  HOST_ATTR,
  PAGE_STYLE_ID,
  PROCESSED_ATTR,
  SEL,
} from '../shared/constants.js';
import * as log from '../shared/logger.js';
import { themeCss } from '../themes/index.js';
import type { ThemeName } from '../themes/names.js';

/**
 * Renders a highlighted copy of a code block beside the original.
 *
 * The original <article> is never modified - it stays in the DOM, hidden only by
 * our own stylesheet. That is what keeps Chat's native "copy message" byte-exact,
 * and it means an unmount restores the page perfectly.
 */

const STYLE_SLOT = 'gcch-theme';
const SOFT_WRAP_CLASS = 'gcch-soft-wrap';

/** Every mounted shadow root, so theme changes can be applied without remounting. */
const mounted = new Set<ShadowRoot>();

const SHADOW_BASE_CSS = `
:host { display: block; position: relative; }
.gcch-wrap { position: relative; }

/*
 * The theme's .hljs rule carries the background, so it goes on the <pre>. Putting
 * it on the <code> instead leaves the background painting as an inline box, which
 * ignores the container's border-radius and renders square corners.
 */
pre.hljs {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Roboto Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.45;
  tab-size: 2;
}
code {
  font: inherit;
  background: none;
  padding: 0;
  display: block;
}

/* Wrapped is the default: a chat pane is narrow, and horizontally scrolling a
 * snippet to read the end of a line is worse than a soft-wrapped line. */
pre.hljs.gcch-soft-wrap {
  overflow-x: hidden;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.gcch-tools {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 120ms ease;
}
.gcch-wrap:hover .gcch-tools,
.gcch-tools:focus-within { opacity: 1; }

.gcch-btn {
  padding: 2px 8px;
  font-family: inherit;
  font-size: 11px;
  line-height: 1.6;
  border: 1px solid currentColor;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  opacity: 0.65;
  cursor: pointer;
}
.gcch-btn:hover,
.gcch-btn:focus-visible { opacity: 1; }
.gcch-btn[aria-pressed='true'] { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .gcch-tools { transition: none; }
}
`;

/**
 * Injects our page-level rules: hide the original article, hide Google's own
 * code-block toolbar, and collapse the padding Chat put around the article so our
 * block does not sit inside a thick empty frame.
 *
 * All of it is scoped to our own class, so removing that class restores the page.
 */
export function ensurePageStyle(): void {
  if (document.getElementById(PAGE_STYLE_ID) !== null) return;

  const style = document.createElement('style');
  style.id = PAGE_STYLE_ID;
  style.textContent = [
    `.${ACTIVE_CLASS} > article { display: none !important; }`,
    `.${ACTIVE_CLASS} > ${SEL.NATIVE_TOOLBAR} { display: none !important; }`,
    `.${ACTIVE_CLASS} { padding: 0 !important; margin: 0 !important; background: none !important; }`,
  ].join('\n');
  (document.head ?? document.documentElement).appendChild(style);
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // clipboard.writeText rejects when the document is not focused, which happens
    // routinely in a chat app with popouts and iframes. Fall back to a selection
    // copy, which has no focus requirement.
  }

  const scratch = document.createElement('textarea');
  scratch.value = text;
  scratch.setAttribute('readonly', '');
  scratch.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
  document.body.appendChild(scratch);
  scratch.select();
  try {
    document.execCommand('copy');
  } finally {
    scratch.remove();
  }
}

/**
 * Our replacement for Google's "Toggle wrap".
 *
 * Theirs restyles the <article> we hide, so it does nothing on our render and sat
 * in the same corner as our copy button. Ours actually works.
 */
function buildWrapButton(pre: HTMLElement): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'gcch-btn';
  button.textContent = 'Wrap';
  button.setAttribute('aria-label', 'Toggle line wrapping');
  button.setAttribute('aria-pressed', 'true');

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const wrapped = pre.classList.toggle(SOFT_WRAP_CLASS);
    button.setAttribute('aria-pressed', String(wrapped));
  });

  return button;
}

function buildCopyButton(source: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'gcch-btn';
  button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy code');

  let timer: ReturnType<typeof setTimeout> | undefined;

  button.addEventListener('click', (event) => {
    // Chat attaches its own handlers up the tree; a click on our button must not
    // open a thread or trigger a message action.
    event.preventDefault();
    event.stopPropagation();

    void copyToClipboard(source)
      .then(() => {
        button.textContent = 'Copied';
        button.dataset['state'] = 'done';
      })
      .catch((err: unknown) => {
        log.warn('copy failed', err);
        button.textContent = 'Copy failed';
        button.dataset['state'] = 'done';
      })
      .finally(() => {
        globalThis.clearTimeout(timer);
        timer = globalThis.setTimeout(() => {
          button.textContent = 'Copy';
          delete button.dataset['state'];
        }, COPY_FEEDBACK_MS);
      });
  });

  return button;
}

export interface MountOptions {
  container: HTMLElement;
  article: HTMLElement;
  /** Clean source: language tag stripped. Highlighted and copied alike. */
  source: string;
  /** Highlighted HTML, or null to render plain monospace. */
  html: string | null;
  language: string | null;
  theme: ThemeName;
}

export function mount(options: MountOptions): void {
  const { container, article, source, html, language, theme } = options;

  // Marked before any insertion, so the mutations we are about to cause cannot
  // race the observer into reprocessing this block.
  article.setAttribute(PROCESSED_ATTR, 'true');

  const host = document.createElement('div');
  host.setAttribute(HOST_ATTR, 'true');
  // Same attribute Chat puts on its own code-block toolbar. Without it, copying
  // the message would yield the code twice.
  host.setAttribute(EXCLUDE_FROM_CLIPBOARD_ATTR, 'true');

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.dataset['slot'] = STYLE_SLOT;
  style.textContent = `${themeCss(theme)}\n${SHADOW_BASE_CSS}`;
  shadow.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 'gcch-wrap';

  // hljs on the <pre> so the theme background paints as a block and respects the
  // border-radius. Wrapped by default; the toolbar can switch it off per block.
  const pre = document.createElement('pre');
  pre.className = `hljs ${SOFT_WRAP_CLASS}`;

  const code = document.createElement('code');
  if (language !== null) code.className = `language-${language}`;

  if (html === null) {
    // No confident language. Plain monospace, still copyable.
    code.textContent = source;
  } else {
    // highlight.js escapes the source it is given, so this markup is derived from
    // user text but contains no user-controlled tags. textContent is not an option
    // here - the token spans are the entire point.
    code.innerHTML = html;
  }

  pre.appendChild(code);

  const tools = document.createElement('div');
  tools.className = 'gcch-tools';
  tools.append(buildWrapButton(pre), buildCopyButton(source));

  wrap.append(pre, tools);
  shadow.appendChild(wrap);

  container.classList.add(ACTIVE_CLASS);
  container.appendChild(host);
  mounted.add(shadow);
}

/** Swaps the theme in every mounted block without rebuilding any of them. */
export function applyTheme(theme: ThemeName): void {
  for (const shadow of mounted) {
    if (shadow.host.isConnected === false) {
      mounted.delete(shadow);
      continue;
    }
    const style = shadow.querySelector<HTMLStyleElement>(`style[data-slot='${STYLE_SLOT}']`);
    if (style !== null) style.textContent = `${themeCss(theme)}\n${SHADOW_BASE_CSS}`;
  }
}

/** Restores the page exactly as it was. Backs the popup's disable toggle. */
export function unmountAll(root: ParentNode): void {
  for (const host of root.querySelectorAll(`[${HOST_ATTR}]`)) host.remove();
  for (const el of root.querySelectorAll(`.${ACTIVE_CLASS}`)) el.classList.remove(ACTIVE_CLASS);
  for (const el of root.querySelectorAll(`[${PROCESSED_ATTR}]`)) {
    el.removeAttribute(PROCESSED_ATTR);
  }
  document.getElementById(PAGE_STYLE_ID)?.remove();
  mounted.clear();
}
