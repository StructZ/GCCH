import { describe, expect, it } from 'vitest';
import { extractCode } from '../src/content/extract.js';
import { loadFixture, makeArticle } from './fixtures/index.js';

function fixtureArticle(): Element {
  const article = loadFixture('chat-code-block').querySelector('article');
  if (article === null) throw new Error('fixture lost its article');
  return article;
}

describe('extractCode', () => {
  it('reconstructs one line per child div', () => {
    const code = extractCode(fixtureArticle());
    const lines = code.split('\n');

    expect(lines[0]).toBe(' Prerequisites');
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('  # Need GH_PAT set (GitHub PAT for helm repo access)');
  });

  it('diverges from textContent, which is why this module exists', () => {
    const article = fixtureArticle();
    const extracted = extractCode(article);

    expect(extracted).toContain('\n');
    expect(article.textContent).not.toContain('\n');
    expect(extracted).not.toBe(article.textContent);
  });

  it('converts non-breaking spaces to real spaces', () => {
    const code = extractCode(fixtureArticle());

    expect(code).not.toContain(' ');
    expect(code).toContain('  export GH_PAT=');
  });

  it('preserves indentation depth exactly', () => {
    const code = extractCode(fixtureArticle());
    const continuation = code
      .split('\n')
      .find((line) => line.includes('--values outputs/fmca-api-config.yaml'));

    expect(continuation).toBe('    --values outputs/fmca-api-config.yaml \\');
  });

  it('preserves interior blank lines', () => {
    const code = extractCode(fixtureArticle());
    expect(code).toContain('\n\n');
  });

  it('decodes HTML entities back to their characters', () => {
    const code = extractCode(fixtureArticle());
    expect(code).toContain("export GH_PAT='<your-github-pat>'");
    expect(code).toContain('helm repo update && \\');
  });

  it('excludes display:none descendants', () => {
    const article = makeArticle(['visible']);
    const ghost = article.querySelector<HTMLElement>('span');
    if (ghost === null) throw new Error('expected a ghost span');
    ghost.textContent = 'SHOULD NOT APPEAR';

    expect(extractCode(article)).toBe('visible');
  });

  it('drops trailing blank lines but keeps leading ones', () => {
    const article = makeArticle(['', 'code', '', '']);
    expect(extractCode(article)).toBe('\ncode');
  });

  it('does not mutate the article', () => {
    const article = fixtureArticle();
    const before = article.outerHTML;
    extractCode(article);
    expect(article.outerHTML).toBe(before);
  });

  it('falls back to raw text when the per-line structure is gone', () => {
    const article = document.createElement('article');
    article.textContent = 'flat text';
    expect(extractCode(article)).toBe('flat text');
  });
});
