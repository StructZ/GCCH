import { describe, expect, it } from 'vitest';
import { highlightCode, registeredLanguages } from '../src/content/highlight.js';

describe('registered language set', () => {
  it('registers exactly the 15 planned languages', () => {
    expect(registeredLanguages()).toEqual([
      'bash',
      'cpp',
      'css',
      'diff',
      'go',
      'java',
      'javascript',
      'json',
      'markdown',
      'python',
      'rust',
      'sql',
      'typescript',
      'xml',
      'yaml',
    ]);
  });
});

describe('highlightCode with an explicit language', () => {
  it('honors the requested language', () => {
    const result = highlightCode('def f():\n    return 1', 'python');
    expect(result?.language).toBe('python');
    expect(result?.html).toContain('hljs-keyword');
  });

  it('escapes HTML in the source rather than emitting it', () => {
    const result = highlightCode('<script>alert(1)</script>', 'xml');
    expect(result?.html).not.toContain('<script>');
    expect(result?.html).toContain('&lt;');
  });

  it('does not throw on syntactically broken snippets', () => {
    expect(() => highlightCode('func main() { unterminated', 'go')).not.toThrow();
    expect(highlightCode('func main() { unterminated', 'go')).not.toBeNull();
  });
});

describe('highlightCode auto-detection gate', () => {
  it('accepts a confident detection', () => {
    const source = [
      'SELECT id, name, created_at',
      'FROM users',
      'WHERE created_at > NOW() - INTERVAL 7 DAY',
      'GROUP BY id, name',
      'ORDER BY created_at DESC;',
    ].join('\n');

    const result = highlightCode(source, null);
    expect(result).not.toBeNull();
    expect(result?.html).toContain('hljs-keyword');
  });

  // The failure this gate exists to prevent: plain output getting confidently
  // mislabeled and rendered in the wrong colors.
  it('declines low-confidence prose', () => {
    const source = [
      'Prerequisites',
      'Ask the platform team for access before you start.',
      'Then wait for the confirmation email.',
    ].join('\n');

    expect(highlightCode(source, null)).toBeNull();
  });

  it('declines empty and whitespace-only blocks', () => {
    expect(highlightCode('', null)).toBeNull();
    expect(highlightCode('   \n\n  ', null)).toBeNull();
    expect(highlightCode('', 'python')).toBeNull();
  });
});
