/**
 * Language-tag parsing.
 *
 * Google Chat does not parse ```lang fences - it strips the backticks and keeps
 * everything else verbatim. So when somebody types ```python, the word "python"
 * survives as the literal first line of the rendered block.
 *
 * Pure: strings in, strings out.
 */

/** The 15 languages registered with highlight.js, plus their common aliases. */
export const ALIASES: Readonly<Record<string, string>> = {
  javascript: 'javascript',
  js: 'javascript',
  node: 'javascript',
  mjs: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  py: 'python',
  py3: 'python',
  python3: 'python',
  java: 'java',
  go: 'go',
  golang: 'go',
  rust: 'rust',
  rs: 'rust',
  cpp: 'cpp',
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  c: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  sql: 'sql',
  postgres: 'sql',
  postgresql: 'sql',
  mysql: 'sql',
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  terminal: 'bash',
  xml: 'xml',
  html: 'xml',
  htm: 'xml',
  svg: 'xml',
  css: 'css',
  markdown: 'markdown',
  md: 'markdown',
  diff: 'diff',
  patch: 'diff',
};

export interface ParsedBlock {
  /** Resolved highlight.js language id, or null when no tag was present. */
  language: string | null;
  /** The source with any tag line removed. Always what we highlight and copy. */
  code: string;
}

/** Resolves an alias to a registered language id, case-insensitively. */
export function resolveLanguage(tag: string): string | null {
  return ALIASES[tag.trim().toLowerCase()] ?? null;
}

/**
 * Strips a leading language tag line, but only when the line is a bare token and
 * nothing else.
 *
 * The strictness is the whole point. `python` alone is a tag. `python -m venv .`
 * is a shell command whose first word happens to be a language name, and eating
 * that line would silently delete a line of somebody's code from the render and
 * from the copy button output.
 */
export function parseLanguageTag(code: string): ParsedBlock {
  const newlineAt = code.indexOf('\n');
  const firstLine = newlineAt === -1 ? code : code.slice(0, newlineAt);
  const rest = newlineAt === -1 ? '' : code.slice(newlineAt + 1);

  const candidate = firstLine.trim();

  // A tag is one token. Any whitespace inside means it is real code.
  if (candidate === '' || /\s/.test(candidate)) return { language: null, code };

  const language = resolveLanguage(candidate);
  if (language === null) return { language: null, code };

  return { language, code: rest };
}
