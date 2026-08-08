import { describe, expect, it } from 'vitest';
import {
  appearanceFromColor,
  detectAppearance,
  parseRgb,
  relativeLuminance,
  resolveTheme,
} from '../src/content/theme.js';

describe('parseRgb', () => {
  it('parses rgb and rgba', () => {
    expect(parseRgb('rgb(255, 255, 255)')).toEqual([255, 255, 255]);
    expect(parseRgb('rgba(32, 33, 36, 0.9)')).toEqual([32, 33, 36]);
  });

  it('treats fully transparent as no answer, so the walk continues upward', () => {
    expect(parseRgb('rgba(0, 0, 0, 0)')).toBeNull();
    expect(parseRgb('transparent')).toBeNull();
  });
});

describe('relativeLuminance', () => {
  it('anchors at black and white', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
  });
});

describe('appearanceFromColor', () => {
  it('classifies real Google Chat backgrounds', () => {
    expect(appearanceFromColor('rgb(255, 255, 255)')).toBe('light');
    expect(appearanceFromColor('rgb(32, 33, 36)')).toBe('dark');
    expect(appearanceFromColor('rgb(24, 24, 24)')).toBe('dark');
  });
});

describe('detectAppearance', () => {
  it('walks past transparent ancestors to the first painted one', () => {
    const outer = document.createElement('div');
    outer.style.backgroundColor = 'rgb(32, 33, 36)';
    const inner = document.createElement('div');
    outer.appendChild(inner);
    document.body.appendChild(outer);

    expect(detectAppearance(inner)).toBe('dark');

    outer.remove();
  });
});

describe('resolveTheme', () => {
  it('follows detected appearance in auto mode', () => {
    expect(resolveTheme('auto', 'dark')).toBe('atom-one-dark');
    expect(resolveTheme('auto', 'light')).toBe('atom-one-light');
  });

  it('honors an explicit choice regardless of appearance', () => {
    expect(resolveTheme('monokai', 'light')).toBe('monokai');
    expect(resolveTheme('atom-one-light', 'dark')).toBe('atom-one-light');
  });
});
