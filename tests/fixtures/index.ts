import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = import.meta.dirname;

/** Parses a captured fixture into a detached DOM and returns its root element. */
export function loadFixture(name: string): HTMLElement {
  const html = readFileSync(resolve(dir, `${name}.html`), 'utf8');
  const container = document.createElement('div');
  container.innerHTML = html;
  const root = container.querySelector<HTMLElement>('div.kaPZDd');
  if (root === null) throw new Error(`fixture ${name} has no div.kaPZDd root`);
  return root;
}

/** Builds a code-block article from plain source lines, for focused unit tests. */
export function makeArticle(lines: readonly string[]): HTMLElement {
  const article = document.createElement('article');
  article.setAttribute('role', 'code');
  for (const line of lines) {
    const div = document.createElement('div');
    if (line === '') {
      div.appendChild(document.createElement('br'));
    } else {
      // Chat renders leading and repeated spaces as non-breaking spaces.
      div.append(line.replace(/ {2,}|^ /g, (run) => ' '.repeat(run.length)));
      const ghost = document.createElement('span');
      ghost.style.display = 'none';
      div.appendChild(ghost);
    }
    article.appendChild(div);
  }
  return article;
}
