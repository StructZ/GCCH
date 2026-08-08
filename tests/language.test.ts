import { describe, expect, it } from 'vitest';
import { parseLanguageTag, resolveLanguage } from '../src/content/language.js';

describe('resolveLanguage', () => {
  it('resolves aliases to registered language ids', () => {
    expect(resolveLanguage('js')).toBe('javascript');
    expect(resolveLanguage('yml')).toBe('yaml');
    expect(resolveLanguage('zsh')).toBe('bash');
    expect(resolveLanguage('golang')).toBe('go');
  });

  it('is case and whitespace insensitive', () => {
    expect(resolveLanguage('  Python  ')).toBe('python');
    expect(resolveLanguage('JSON')).toBe('json');
  });

  it('returns null for unregistered languages', () => {
    expect(resolveLanguage('brainfuck')).toBeNull();
    expect(resolveLanguage('')).toBeNull();
  });
});

describe('parseLanguageTag', () => {
  it('strips a bare tag line and reports the language', () => {
    expect(parseLanguageTag('python\nprint(1)')).toEqual({
      language: 'python',
      code: 'print(1)',
    });
  });

  // The whole reason the tag check is strict. Eating this line would delete a
  // line of the user's actual code from both the render and the copy output.
  it('does NOT strip a code line that merely starts with a language name', () => {
    const source = 'python -m venv .venv\nsource .venv/bin/activate';
    expect(parseLanguageTag(source)).toEqual({ language: null, code: source });
  });

  it('leaves unrecognized first lines alone', () => {
    const source = 'Prerequisites\nrun the thing';
    expect(parseLanguageTag(source)).toEqual({ language: null, code: source });
  });

  it('handles a tag line with surrounding whitespace', () => {
    expect(parseLanguageTag('  ts  \nconst a = 1;')).toEqual({
      language: 'typescript',
      code: 'const a = 1;',
    });
  });

  it('handles a tag with no body', () => {
    expect(parseLanguageTag('sql')).toEqual({ language: 'sql', code: '' });
  });

  it('treats an empty first line as no tag', () => {
    const source = '\nSELECT 1;';
    expect(parseLanguageTag(source)).toEqual({ language: null, code: source });
  });

  it('preserves the body byte-for-byte, including indentation', () => {
    const body = '  indented:\n    nested: true\n';
    const result = parseLanguageTag(`yaml\n${body}`);
    expect(result.code).toBe(body);
  });
});
