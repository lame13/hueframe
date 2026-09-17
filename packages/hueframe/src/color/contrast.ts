import {
  clamp,
  hexToOklab,
  isHexColor,
  mixOklab,
  normalizeHex,
  oklabChroma,
  oklabHue,
  oklabToHex,
  parseHex,
  srgbToLinear,
} from './convert.js';
import type { ContrastCheck, Rgb } from '../types.js';

export type ColorInput = string | Rgb;

/** Accepts a hex string or an {@link Rgb} object. Throws on anything else. */
export function toRgb(value: ColorInput): Rgb {
  if (typeof value === 'string') {
    if (!isHexColor(value)) {
      throw new TypeError(`Invalid hex colour: ${JSON.stringify(value)}`);
    }
    return parseHex(value);
  }
  if (value && typeof value === 'object' && 'r' in value) {
    return value;
  }
  throw new TypeError(`Expected a hex colour or an { r, g, b } object.`);
}

/** Normalises any colour input to `#rrggbb`. */
export function toHex(value: ColorInput): string {
  return typeof value === 'string' ? normalizeHex(value) : hexOf(value);
}

function hexOf(value: Rgb): string {
  const channel = (input: number) =>
    clamp(Math.round(input), 0, 255).toString(16).padStart(2, '0');
  return `#${channel(value.r)}${channel(value.g)}${channel(value.b)}`;
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(value: ColorInput): number {
  const { r, g, b } = toRgb(value);
  return (
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
  );
}

/** WCAG 2.1 contrast ratio between two colours, 1-21. */
export function contrastRatio(a: ColorInput, b: ColorInput): number {
  const lighter = relativeLuminance(a);
  const darker = relativeLuminance(b);
  const [high, low] = lighter >= darker ? [lighter, darker] : [darker, lighter];
  return (high + 0.05) / (low + 0.05);
}

export interface ContrastRating {
  readonly aa: boolean;
  readonly aaa: boolean;
  readonly aaLarge: boolean;
}

/** WCAG 2.1 thresholds for a ratio. */
export function rateContrast(ratio: number): ContrastRating {
  return {
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
    aaLarge: ratio >= 3,
  };
}

export interface ContrastPair {
  readonly id: string;
  readonly label: string;
  readonly foreground: string;
  readonly background: string;
}

/** Runs a list of foreground/background pairs through WCAG 2.1. */
export function checkContrast(pairs: readonly ContrastPair[]): ContrastCheck[] {
  return pairs.map((pair) => {
    const ratio = contrastRatio(pair.foreground, pair.background);
    return {
      id: pair.id,
      label: pair.label,
      foreground: normalizeHex(pair.foreground),
      background: normalizeHex(pair.background),
      ratio: Math.round(ratio * 100) / 100,
      ...rateContrast(ratio),
    };
  });
}

export interface ReadableInkOptions {
  /** Colours to choose from, in order of preference. Defaults to white then near-black. */
  readonly candidates?: readonly string[];
  /** Minimum ratio required. Defaults to 4.5. */
  readonly target?: number;
}

/** Picks the most readable label colour for a fill, preferring earlier candidates. */
export function pickReadableInk(
  background: ColorInput,
  { candidates = ['#ffffff', '#12100e'], target = 4.5 }: ReadableInkOptions = {},
): string {
  const fill = typeof background === 'string' ? normalizeHex(background) : hexOf(background);
  let best = candidates[0] ?? '#ffffff';
  let bestRatio = contrastRatio(best, fill);

  for (const candidate of candidates) {
    const ratio = contrastRatio(candidate, fill);
    if (ratio >= target) {
      return normalizeHex(candidate);
    }
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }

  return normalizeHex(best);
}

export interface EnforceContrastOptions {
  /** Minimum ratio to reach. Defaults to 4.5. */
  readonly target?: number;
  /** Which way to move lightness first. Defaults to `auto`. */
  readonly direction?: 'auto' | 'lighter' | 'darker';
  /** Largest lightness change allowed from the original colour. Defaults to 0.6. */
  readonly maxShift?: number;
}

/**
 * Moves a foreground colour along its own lightness axis until it reaches the
 * contrast target against `background`. Hue and chroma are preserved, so a
 * terracotta stays terracotta. Returns the closest reachable colour when the
 * target cannot be met.
 *
 * The colour is never moved further than `maxShift` of lightness, and never
 * moved at all when `maxShift` is `0`. The returned colour is also never worse
 * than the input: when the target is out of reach the best reachable
 * candidate wins, not the last one tried.
 */
export function enforceContrast(
  foreground: ColorInput,
  background: ColorInput,
  { target = 4.5, direction = 'auto', maxShift = 0.6 }: EnforceContrastOptions = {},
): string {
  const start = typeof foreground === 'string' ? normalizeHex(foreground) : hexOf(foreground);
  const backdrop = typeof background === 'string' ? normalizeHex(background) : hexOf(background);

  if (contrastRatio(start, backdrop) >= target) {
    return start;
  }

  // No shift allowed: hand the colour back exactly as it came in.
  if (maxShift <= 0) {
    return start;
  }

  const lab = hexToOklab(start);
  const chroma = oklabChroma(lab);
  const hue = oklabHue(lab);
  const step = 0.005;

  const attempt = (lightness: number) => {
    const radians = (hue * Math.PI) / 180;
    return oklabToHex({
      l: clamp(lightness, 0, 1),
      a: Math.cos(radians) * chroma,
      b: Math.sin(radians) * chroma,
    });
  };

  const backdropLuminance = relativeLuminance(backdrop);
  const towardsDarker =
    direction === 'darker' || (direction === 'auto' && backdropLuminance > 0.4);

  let best = start;
  let bestRatio = contrastRatio(start, backdrop);

  for (let shift = 0; shift <= maxShift; shift += step) {
    for (const sign of towardsDarker ? ([1, -1] as const) : ([-1, 1] as const)) {
      const candidate = attempt(lab.l + shift * sign);
      const ratio = contrastRatio(candidate, backdrop);
      if (ratio > bestRatio) {
        best = candidate;
        bestRatio = ratio;
      }
      if (ratio >= target) {
        return candidate;
      }
    }
  }

  // Last resort: the target is further away than `maxShift` can travel. Spend
  // whatever room is left in the budget blending towards a neutral extreme,
  // and keep the blend only when it actually reads better than the best on-hue
  // candidate. A hard palette then degrades gracefully instead of overshooting
  // the shift the caller allowed.
  const bestLab = hexToOklab(best);
  const extreme = backdropLuminance > 0.4 ? '#000000' : '#ffffff';
  const extremeLab = hexToOklab(extreme);
  const room = Math.max(0, maxShift - Math.abs(bestLab.l - lab.l));
  const span = Math.abs(extremeLab.l - bestLab.l);

  let fallback = best;
  let fallbackRatio = bestRatio;
  if (room > 0 && span > 0) {
    const cap = Math.min(1, room / span);
    for (let parts = 1; parts <= 10; parts += 1) {
      const candidate = mixOklab(best, extreme, (parts / 10) * cap);
      const ratio = contrastRatio(candidate, backdrop);
      if (ratio > fallbackRatio) {
        fallback = candidate;
        fallbackRatio = ratio;
      }
    }
  }

  return fallback;
}
