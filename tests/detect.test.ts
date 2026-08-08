import { afterEach, describe, expect, it } from 'vitest';
import { containerFor, findCodeBlocks, hasMessages, isInComposer } from '../src/content/detect.js';
import { PROCESSED_ATTR } from '../src/shared/constants.js';
import { loadFixture } from './fixtures/index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

function mountFixture(): HTMLElement {
  const block = loadFixture('chat-code-block');
  document.body.appendChild(block);
  return block;
}

describe('findCodeBlocks', () => {
  it('finds the block in real captured markup', () => {
    mountFixture();
    const found = findCodeBlocks(document);

    expect(found).toHaveLength(1);
    expect(found[0]?.getAttribute('role')).toBe('code');
  });

  it('skips blocks already processed', () => {
    const block = mountFixture();
    block.querySelector('article')?.setAttribute(PROCESSED_ATTR, 'true');

    expect(findCodeBlocks(document)).toHaveLength(0);
  });

  it('finds blocks via the fallback when the role attribute is gone', () => {
    const block = mountFixture();
    block.querySelector('article')?.removeAttribute('role');

    expect(findCodeBlocks(document)).toHaveLength(1);
  });

  it('returns empty rather than throwing when nothing matches', () => {
    document.body.innerHTML = '<div>no code here</div>';
    expect(findCodeBlocks(document)).toEqual([]);
  });
});

describe('composer guardrail', () => {
  // The single most important guardrail: formatting must only ever apply to
  // messages that have been sent. Touching the composer would corrupt what the
  // user is typing.
  it('rejects a code block inside a contenteditable composer', () => {
    const composer = document.createElement('div');
    composer.setAttribute('contenteditable', 'true');
    composer.appendChild(loadFixture('chat-code-block'));
    document.body.appendChild(composer);

    expect(findCodeBlocks(document)).toEqual([]);
  });

  it('detects composer ancestry at any depth', () => {
    const composer = document.createElement('div');
    composer.setAttribute('contenteditable', 'true');
    composer.innerHTML = '<div><div><article role="code"></article></div></div>';
    document.body.appendChild(composer);

    const article = composer.querySelector('article');
    expect(article).not.toBeNull();
    expect(isInComposer(article as Element)).toBe(true);
  });
});

describe('containerFor', () => {
  it('resolves the Chat block wrapper', () => {
    mountFixture();
    const article = document.querySelector('article');
    expect(containerFor(article as HTMLElement)?.className).toBe('kaPZDd');
  });

  it('falls back to the parent element when the wrapper class changes', () => {
    const parent = document.createElement('section');
    const article = document.createElement('article');
    parent.appendChild(article);
    document.body.appendChild(parent);

    expect(containerFor(article)).toBe(parent);
  });
});

describe('hasMessages', () => {
  it('distinguishes an empty page from a page of messages', () => {
    expect(hasMessages(document)).toBe(false);

    document.body.innerHTML = '<div data-message-id="abc"></div>';
    expect(hasMessages(document)).toBe(true);
  });
});
