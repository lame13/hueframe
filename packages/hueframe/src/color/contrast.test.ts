import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  enforceContrast,
  pickReadableInk,
} from './contrast.js';
import { colorDistance } from './convert.js';

describe('enforceContrast', () => {
  it('leaves a colour alone when it already clears the target', () => {
    expect(enforceContrast('#213f3b', '#f8f4ec', { target: 4.5 })).toBe('#213f3b');
  });

  it('reaches a reachable target', () => {
    const result = enforceContrast('#b8b1a6', '#f8f4ec', { target: 4.5 });
    expect(contrastRatio(result, '#f8f4ec')).toBeGreaterThanOrEqual(4.5);
  });

  it('returns the input untouched when maxShift is 0', () => {
    // The pair sits at ~1.01:1 and the target is unreachable without a shift,
    // so a disallowed shift must mean "no change", not "the last resort".
    const start = '#8a8a86';
    const background = '#9a938c';
    expect(enforceContrast(start, background, { target: 7, maxShift: 0 })).toBe(start);
  });

  it('never returns a colour that reads worse than the input', () => {
    const fixtures: readonly (readonly [string, string])[] = [
      ['#8a8a86', '#9a938c'],
      ['#f0e9dd', '#f7f4ef'],
      ['#cccccc', '#c8c8c8'],
      ['#203028', '#16211c'],
      ['#b95d41', '#f8f4ec'],
    ];

    for (const [foreground, background] of fixtures) {
      const input = contrastRatio(foreground, background);
      for (const target of [4.5, 7, 21]) {
        for (const direction of ['auto', 'lighter', 'darker'] as const) {
          const result = enforceContrast(foreground, background, { target, direction });
          expect(contrastRatio(result, background)).toBeGreaterThanOrEqual(input);
        }
      }
    }
  });

  it('stays within maxShift when the target is unreachable', () => {
    // The last resort used to jump a fixed 35% towards a neutral, which broke
    // the "never move more than maxShift" contract on hard palettes.
    const start = '#8a8a86';
    const background = '#9a938c';
    const result = enforceContrast(start, background, { target: 21, maxShift: 0.05 });
    expect(colorDistance(start, result)).toBeLessThan(0.1);
  });
});

describe('pickReadableInk', () => {
  it('returns the preferred candidate when it fits', () => {
    expect(pickReadableInk('#213f3b', { candidates: ['#ffffff', '#101b18'], target: 4.5 })).toBe(
      '#ffffff',
    );
  });

  it('falls back to the best of the candidates when none fit', () => {
    const ink = pickReadableInk('#808080', { candidates: ['#ffffff', '#101b18'], target: 21 });
    expect(['#ffffff', '#101b18']).toContain(ink);
  });
});
