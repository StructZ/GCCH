import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, ensurePageStyle, mount, unmountAll } from '../src/content/render.js';
import {
  ACTIVE_CLASS,
  EXCLUDE_FROM_CLIPBOARD_ATTR,
  HOST_ATTR,
  PAGE_STYLE_ID,
  PROCESSED_ATTR,
} from '../src/shared/constants.js';
import { loadFixture } from './fixtures/index.js';

afterEach(() => {
  unmountAll(document);
  document.body.innerHTML = '';
});

function mountFixture(html: string | null = '<span class="hljs-keyword">export</span>') {
  const container = loadFixture('chat-code-block');
  document.body.appendChild(container);
  const article = container.querySelector('article') as HTMLElement;

  ensurePageStyle();
  mount({
    container,
    article,
    source: 'export GH_PAT=x',
    html,
    language: html === null ? null : 'bash',
    theme: 'github-dark',
  });

  return { container, article };
}

describe('mount', () => {
  it('leaves the original article untouched apart from the processed marker', () => {
    const container = loadFixture('chat-code-block');
    document.body.appendChild(container);
    const article = container.querySelector('article') as HTMLElement;
    const originalHtml = article.innerHTML;

    mount({
      container,
      article,
      source: 'x',
      html: '<span>x</span>',
      language: 'bash',
      theme: 'atom-one-dark',
    });

    // This is what keeps Chat's native message copy byte-exact.
    expect(article.innerHTML).toBe(originalHtml);
    expect(article.getAttribute(PROCESSED_ATTR)).toBe('true');
    expect(article.isConnected).toBe(true);
  });

  it('renders into a shadow root, not the page', () => {
    const { container } = mountFixture();
    const host = container.querySelector(`[${HOST_ATTR}]`);

    expect(host?.shadowRoot).not.toBeNull();
    expect(host?.shadowRoot?.querySelector('code')?.innerHTML).toContain('hljs-keyword');
    // The highlighted markup must not leak into the light DOM.
    expect(container.innerHTML).not.toContain('hljs-keyword');
  });

  it('carries the attribute that keeps our UI out of copied messages', () => {
    const { container } = mountFixture();
    const host = container.querySelector(`[${HOST_ATTR}]`);

    expect(host?.getAttribute(EXCLUDE_FROM_CLIPBOARD_ATTR)).toBe('true');
  });

  it('hides the original via a class, never inline styles', () => {
    const { container, article } = mountFixture();

    expect(container.classList.contains(ACTIVE_CLASS)).toBe(true);
    expect(article.style.display).toBe('');
    expect(document.getElementById(PAGE_STYLE_ID)).not.toBeNull();
  });

  it('renders plain monospace when highlighting declined', () => {
    const { container } = mountFixture(null);
    const code = container.querySelector(`[${HOST_ATTR}]`)?.shadowRoot?.querySelector('code');

    expect(code?.textContent).toBe('export GH_PAT=x');
    expect(code?.className).toBe('');
  });

  it('always provides a copy button, highlighted or not', () => {
    const { container } = mountFixture(null);
    const shadow = container.querySelector(`[${HOST_ATTR}]`)?.shadowRoot;
    const copy = shadow?.querySelector('button[aria-label="Copy code"]');

    expect(copy?.textContent).toBe('Copy');
  });

  // The theme background must sit on the <pre>. On the <code> it paints as an
  // inline box, which ignores border-radius and renders square corners.
  it('puts the theme class on the pre so corners stay rounded', () => {
    const { container } = mountFixture();
    const shadow = container.querySelector(`[${HOST_ATTR}]`)?.shadowRoot;

    expect(shadow?.querySelector('pre')?.classList.contains('hljs')).toBe(true);
    expect(shadow?.querySelector('code')?.classList.contains('hljs')).toBe(false);
  });
});

describe('wrap toggle', () => {
  it('wraps by default, because a chat pane is narrow', () => {
    const { container } = mountFixture();
    const shadow = container.querySelector(`[${HOST_ATTR}]`)?.shadowRoot;

    expect(shadow?.querySelector('pre')?.classList.contains('gcch-soft-wrap')).toBe(true);
    expect(shadow?.querySelector('button[aria-label="Toggle line wrapping"]')).not.toBeNull();
  });

  it('toggles wrapping and reflects state for assistive tech', () => {
    const { container } = mountFixture();
    const shadow = container.querySelector(`[${HOST_ATTR}]`)?.shadowRoot;
    const pre = shadow?.querySelector('pre');
    const button = shadow?.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle line wrapping"]',
    );

    button?.click();
    expect(pre?.classList.contains('gcch-soft-wrap')).toBe(false);
    expect(button?.getAttribute('aria-pressed')).toBe('false');

    button?.click();
    expect(pre?.classList.contains('gcch-soft-wrap')).toBe(true);
    expect(button?.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('applyTheme', () => {
  it('swaps theme CSS in place without rebuilding the block', () => {
    const { container } = mountFixture();
    const shadow = container.querySelector(`[${HOST_ATTR}]`)?.shadowRoot;
    const codeBefore = shadow?.querySelector('code');

    applyTheme('monokai');

    expect(shadow?.querySelector('style')?.textContent).toContain('.gcch-wrap');
    // Same node: the render was restyled, not recreated.
    expect(shadow?.querySelector('code')).toBe(codeBefore);
  });
});

describe('unmountAll', () => {
  // Backs the popup's disable toggle, which must restore the page without a reload.
  it('restores the page completely', () => {
    const { container, article } = mountFixture();

    unmountAll(document);

    expect(container.querySelector(`[${HOST_ATTR}]`)).toBeNull();
    expect(container.classList.contains(ACTIVE_CLASS)).toBe(false);
    expect(article.hasAttribute(PROCESSED_ATTR)).toBe(false);
    expect(document.getElementById(PAGE_STYLE_ID)).toBeNull();
    expect(article.isConnected).toBe(true);
  });
});
