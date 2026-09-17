import { describe, expect, it } from 'vitest';

import { extractPalette, type PixelSource } from './extract.js';

interface Band {
  readonly rgb: readonly [number, number, number];
  readonly pixels: number;
  readonly alpha?: number;
}

/** Builds a synthetic image out of flat colour bands. */
function imageFromBands(bands: readonly Band[]): PixelSource {
  const pixels = bands.reduce((total, band) => total + band.pixels, 0);
  const data = new Uint8ClampedArray(pixels * 4);

  let offset = 0;
  for (const band of bands) {
    for (let index = 0; index < band.pixels; index += 1) {
      data[offset] = band.rgb[0];
      data[offset + 1] = band.rgb[1];
      data[offset + 2] = band.rgb[2];
      data[offset + 3] = band.alpha ?? 255;
      offset += 4;
    }
  }

  return { data, width: pixels, height: 1 };
}

function gradients(width = 48, height = 48): PixelSource {
  const data = new Uint8ClampedArray(width * height * 4);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data[offset] = (x / (width - 1)) * 255;
      data[offset + 1] = (y / (height - 1)) * 255;
      data[offset + 2] = 128;
      data[offset + 3] = 255;
      offset += 4;
    }
  }
  return { data, width, height };
}

describe('extractPalette', () => {
  it('finds the flat colours in an image with their share of the pixels', () => {
    const palette = extractPalette(
      imageFromBands([
        { rgb: [185, 93, 65], pixels: 50 },
        { rgb: [33, 63, 59], pixels: 25 },
        { rgb: [248, 244, 236], pixels: 25 },
      ]),
      { count: 5 },
    );

    const hexes = palette.map((sample) => sample.hex);
    expect(hexes).toContain('#b95d41');
    expect(hexes).toContain('#213f3b');
    expect(hexes).toContain('#f8f4ec');
    expect(palette[0].hex).toBe('#b95d41');
    expect(palette[0].population).toBeCloseTo(0.5, 2);
  });

  it('drops transparent pixels', () => {
    const palette = extractPalette(
      imageFromBands([
        { rgb: [185, 93, 65], pixels: 40 },
        { rgb: [10, 220, 20], pixels: 40, alpha: 0 },
      ]),
      { count: 5 },
    );

    expect(palette.map((sample) => sample.hex)).toEqual(['#b95d41']);
  });

  it('returns nothing for a fully transparent image', () => {
    expect(
      extractPalette(imageFromBands([{ rgb: [0, 0, 0], pixels: 10, alpha: 10 }])),
    ).toEqual([]);
  });

  it('condenses a gradient into a small palette', () => {
    const palette = extractPalette(gradients(), { count: 5 });
    expect(palette.length).toBeGreaterThanOrEqual(3);
    expect(palette.length).toBeLessThanOrEqual(5);

    const total = palette.reduce((sum, sample) => sum + sample.population, 0);
    expect(total).toBeCloseTo(1, 1);
  });

  it('is deterministic for a given seed and can change with it', () => {
    const image = gradients();
    const first = extractPalette(image, { count: 5, seed: 7 });
    const second = extractPalette(image, { count: 5, seed: 7 });
    expect(second).toEqual(first);

    const other = extractPalette(image, { count: 5, seed: 99 });
    expect(other).toHaveLength(5);
  });

  it('orders hex lists by how often each colour appears', () => {
    const palette = extractPalette(['#ffffff', '#b95d41', '#b95d41', '#213f3b'], { count: 3 });
    expect(palette.map((sample) => sample.hex)).toEqual(['#b95d41', '#ffffff', '#213f3b']);
    expect(palette[0].population).toBeCloseTo(0.5, 4);
  });

  it('renormalises hex-list populations when the palette is cut short', () => {
    // Three distinct colours reduced to two: the survivors have to account for
    // the whole input, not just the two thirds that were kept.
    const palette = extractPalette(['#ffffff', '#b95d41', '#213f3b'], { count: 2 });
    expect(palette.map((sample) => sample.hex)).toEqual(['#ffffff', '#b95d41']);
    const total = palette.reduce((sum, sample) => sum + sample.population, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(palette[0].population).toBeCloseTo(0.5, 10);
  });

  it('keeps hex-list populations summing to 1 for a weighted cut', () => {
    const palette = extractPalette(['#b95d41', '#b95d41', '#ffffff', '#213f3b'], { count: 2 });
    const total = palette.reduce((sum, sample) => sum + sample.population, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(palette[0].hex).toBe('#b95d41');
    expect(palette[0].population).toBeCloseTo(2 / 3, 10);
  });

  it('rejects malformed hex input', () => {
    expect(() => extractPalette(['#zzzzzz'])).toThrow(TypeError);
  });
});
