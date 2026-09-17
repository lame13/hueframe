import type { Hsl, Oklab, Rgb } from '../types.js';

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function roundChannel(value: number): number {
  return clamp(Math.round(value), 0, 255);
}

/** True when `value` is a 3 or 6 digit hex colour, with or without the `#`. */
export function isHexColor(value: string): boolean {
  return typeof value === 'string' && HEX_PATTERN.test(value.trim());
}

/** Normalises any accepted hex spelling to `#rrggbb` (lowercase). */
export function normalizeHex(value: string): string {
  return rgbToHex(parseHex(value));
}

/** Parses `#abc`, `#aabbcc` or the same without `#`. Throws on bad input. */
export function parseHex(value: string): Rgb {
  const match = typeof value === 'string' ? HEX_PATTERN.exec(value.trim()) : null;
  if (!match) {
    throw new TypeError(`Invalid hex colour: ${JSON.stringify(value)}`);
  }
  const digits =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : match[1];
  return {
    r: Number.parseInt(digits.slice(0, 2), 16),
    g: Number.parseInt(digits.slice(2, 4), 16),
    b: Number.parseInt(digits.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const hex = (channel: number) =>
    roundChannel(channel).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const red = clamp(r, 0, 255) / 255;
  const green = clamp(g, 0, 255) / 255;
  const blue = clamp(b, 0, 255) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === red) {
    h = 60 * (((green - blue) / delta) % 6);
  } else if (max === green) {
    h = 60 * ((blue - red) / delta + 2);
  } else {
    h = 60 * ((red - green) / delta + 4);
  }

  return { h: h < 0 ? h + 360 : h, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const lightness = clamp(l, 0, 1);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness - chroma / 2;

  const sector = Math.floor(hue / 60) % 6;
  const [red, green, blue] = (
    [
      [chroma, secondary, 0],
      [secondary, chroma, 0],
      [0, chroma, secondary],
      [0, secondary, chroma],
      [secondary, 0, chroma],
      [chroma, 0, secondary],
    ] as const
  )[sector];

  return {
    r: (red + match) * 255,
    g: (green + match) * 255,
    b: (blue + match) * 255,
  };
}

export function hexToHsl(value: string): Hsl {
  return rgbToHsl(parseHex(value));
}

export function hslToHex(value: Hsl): string {
  return rgbToHex(hslToRgb(value));
}

/** sRGB transfer function, returns linear-light 0-1. */
export function srgbToLinear(channel: number): number {
  const c = clamp(channel, 0, 255) / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(channel: number): number {
  const c = clamp(channel, 0, 1);
  const value = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return value * 255;
}

export function rgbToOklab({ r, g, b }: Rgb): Oklab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/**
 * Converts Oklab back to sRGB. Coordinates outside the sRGB gamut are clamped
 * per channel, which keeps hue and lightness while saturating colour.
 */
export function oklabToRgb({ l, a, b }: Oklab): Rgb {
  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = lRoot * lRoot * lRoot;
  const m3 = mRoot * mRoot * mRoot;
  const s3 = sRoot * sRoot * sRoot;

  return {
    r: roundChannel(linearToSrgb(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3)),
    g: roundChannel(linearToSrgb(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3)),
    b: roundChannel(linearToSrgb(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3)),
  };
}

export function hexToOklab(value: string): Oklab {
  return rgbToOklab(parseHex(value));
}

export function oklabToHex(value: Oklab): string {
  return rgbToHex(oklabToRgb(value));
}

/** Perceptual distance between two Oklab colours (Euclidean). */
export function deltaEOk(a: Oklab, b: Oklab): number {
  return Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);
}

/** Perceptual distance between two hex colours. */
export function colorDistance(a: string, b: string): number {
  return deltaEOk(hexToOklab(a), hexToOklab(b));
}

/** Oklab chroma (colourfulness at constant lightness). */
export function oklabChroma({ a, b }: Oklab): number {
  return Math.hypot(a, b);
}

/** Oklab hue angle in degrees. */
export function oklabHue({ a, b }: Oklab): number {
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  return hue < 0 ? hue + 360 : hue;
}

/** Smallest angle between two hues, in degrees (0-180). */
export function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function setOklabLightness(value: string, lightness: number): string {
  const lab = hexToOklab(value);
  return oklabToHex({ ...lab, l: clamp(lightness, 0, 1) });
}

export function scaleOklabChroma(value: string, factor: number): string {
  const lab = hexToOklab(value);
  return oklabToHex({ ...lab, a: lab.a * factor, b: lab.b * factor });
}

export function rotateOklabHue(value: string, degrees: number): string {
  const lab = hexToOklab(value);
  const chroma = oklabChroma(lab);
  const hue = ((oklabHue(lab) + degrees) * Math.PI) / 180;
  return oklabToHex({ l: lab.l, a: Math.cos(hue) * chroma, b: Math.sin(hue) * chroma });
}

/** Mixes two colours in Oklab. `amount` 0 returns `from`, 1 returns `to`. */
export function mixOklab(from: string, to: string, amount: number): string {
  const t = clamp(amount, 0, 1);
  const a = hexToOklab(from);
  const b = hexToOklab(to);
  return oklabToHex({
    l: a.l + (b.l - a.l) * t,
    a: a.a + (b.a - a.a) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

/**
 * Rebuilds a colour at a new lightness and/or chroma while keeping its hue.
 * Useful for turning a photo sample into a usable role colour.
 */
export function retune(
  value: string,
  { lightness, chroma }: { lightness?: number; chroma?: number },
): string {
  const lab = hexToOklab(value);
  const targetChroma = Math.max(chroma ?? oklabChroma(lab), 0);
  const radians = (oklabHue(lab) * Math.PI) / 180;
  return oklabToHex({
    l: clamp(lightness ?? lab.l, 0, 1),
    a: Math.cos(radians) * targetChroma,
    b: Math.sin(radians) * targetChroma,
  });
}
