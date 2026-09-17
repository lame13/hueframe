import { describe, expect, it } from 'vitest';

import {
  colorDistance,
  deltaEOk,
  hexToOklab,
  hslToHex,
  hueDistance,
  isHexColor,
  mixOklab,
  normalizeHex,
  oklabChroma,
  oklabToHex,
  parseHex,
  retune,
  rgbToHex,
  rgbToHsl,
  rgbToOklab,
} from './convert.js';

describe('parseHex', () => {
  it('accepts 3 and 6 digit hex, with or without a hash', () => {
    expect(parseHex('#b95d41')).toEqual({ r: 185, g: 93, b: 65 });
    expect(parseHex('b95d41')).toEqual({ r: 185, g: 93, b: 65 });
    expect(parseHex('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('rejects anything else', () => {
    expect(() => parseHex('rebeccapurple')).toThrow(TypeError);
    expect(() => parseHex('#12345')).toThrow(TypeError);
    expect(isHexColor('nope')).toBe(false);
    expect(isHexColor('#abcdef')).toBe(true);
  });
});

describe('round trips', () => {
  const samples = ['#000000', '#ffffff', '#b95d41', '#213f3b', '#7c967d', '#f8f4ec'];

  it('keeps hex stable through rgb', () => {
    for (const hex of samples) {
      expect(rgbToHex(parseHex(hex))).toBe(hex);
    }
  });

  it('keeps hex stable through hsl', () => {
    for (const hex of samples) {
      const { h, s, l } = rgbToHsl(parseHex(hex));
      expect(hslToHex({ h, s, l })).toBe(hex);
    }
  });

  it('keeps colours within a perceptual nudge through Oklab', () => {
    for (const hex of samples) {
      const roundTripped = oklabToHex(rgbToOklab(parseHex(hex)));
      expect(deltaEOk(hexToOklab(hex), hexToOklab(roundTripped))).toBeLessThan(0.005);
    }
  });
});

describe('normalizeHex', () => {
  it('expands shorthand and lowercases', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('B95D41')).toBe('#b95d41');
  });
});

describe('distances', () => {
  it('reports identical colours as zero apart', () => {
    expect(colorDistance('#b95d41', '#B95D41')).toBe(0);
  });

  it('measures hue distance the short way round the wheel', () => {
    expect(hueDistance(350, 10)).toBeCloseTo(20, 6);
    expect(hueDistance(40, 130)).toBeCloseTo(90, 6);
    expect(hueDistance(0, 180)).toBeCloseTo(180, 6);
  });
});

describe('retune', () => {
  it('sets lightness while keeping the hue family', () => {
    const adjusted = hexToOklab(retune('#b95d41', { lightness: 0.4 }));
    expect(adjusted.l).toBeCloseTo(0.4, 2);
    expect(colorDistance('#b95d41', retune('#b95d41', { lightness: 0.4 }))).toBeGreaterThan(0.1);
  });

  it('can mute a colour without changing its lightness', () => {
    const muted = retune('#b95d41', { chroma: 0.01 });
    expect(oklabChroma(hexToOklab(muted))).toBeLessThan(0.03);
    expect(hexToOklab(muted).l).toBeCloseTo(hexToOklab('#b95d41').l, 2);
  });
});

describe('mixOklab', () => {
  it('returns the endpoints at 0 and 1', () => {
    expect(mixOklab('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixOklab('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('mixes towards the target in the middle', () => {
    const middle = hexToOklab(mixOklab('#000000', '#ffffff', 0.5));
    expect(middle.l).toBeGreaterThan(0.3);
    expect(middle.l).toBeLessThan(0.7);
  });
});
