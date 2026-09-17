import {
  deltaEOk,
  isHexColor,
  normalizeHex,
  oklabToHex,
  parseHex,
  rgbToOklab,
} from '../color/convert.js';
import type { Oklab, SampledColor } from '../types.js';
import { createRandom, kmeans } from './kmeans.js';

/**
 * Anything shaped like `ImageData` from the DOM, or an equivalent buffer from
 * Node (`Buffer` also works, since it is an `ArrayLike<number>`).
 */
export interface PixelSource {
  /** RGBA bytes, 4 per pixel, row major. */
  readonly data: ArrayLike<number>;
  readonly width: number;
  readonly height: number;
}

export type PaletteInput = PixelSource | readonly string[];

export interface ExtractOptions {
  /** How many colours to return. Defaults to 6. */
  readonly count?: number;
  /** Seed for the cluster search. Defaults to 1. */
  readonly seed?: number;
  /** Upper bound on pixels inspected; larger images are sampled. Defaults to 24000. */
  readonly maxSamples?: number;
  /** Pixels below this alpha are ignored. Defaults to 125. */
  readonly ignoreAlphaBelow?: number;
  /** Clusters closer than this (Oklab distance) are merged. Defaults to 0.045. */
  readonly mergeThreshold?: number;
  /** Drop colours covering less than this share of the image. Defaults to 0.008. */
  readonly minPopulation?: number;
}

interface ResolvedExtractOptions {
  count: number;
  seed: number;
  maxSamples: number;
  ignoreAlphaBelow: number;
  mergeThreshold: number;
  minPopulation: number;
}

function resolveOptions(options: ExtractOptions): ResolvedExtractOptions {
  return {
    count: Math.max(1, Math.trunc(options.count ?? 6)),
    seed: options.seed ?? 1,
    maxSamples: Math.max(64, Math.trunc(options.maxSamples ?? 24000)),
    ignoreAlphaBelow: options.ignoreAlphaBelow ?? 125,
    mergeThreshold: options.mergeThreshold ?? 0.045,
    minPopulation: options.minPopulation ?? 0.008,
  };
}

function readPoints(source: PixelSource, options: ResolvedExtractOptions): Oklab[] {
  const pixelCount = Math.min(
    Math.floor(source.data.length / 4),
    Math.max(0, Math.trunc(source.width) * Math.trunc(source.height)),
  );
  const stride = Math.max(1, Math.ceil(pixelCount / options.maxSamples));
  const points: Oklab[] = [];

  for (let index = 0; index < pixelCount; index += stride) {
    const offset = index * 4;
    const alpha = source.data[offset + 3];
    if (alpha !== undefined && alpha < options.ignoreAlphaBelow) {
      continue;
    }
    points.push(
      rgbToOklab({
        r: source.data[offset],
        g: source.data[offset + 1],
        b: source.data[offset + 2],
      }),
    );
  }

  return points;
}

/** Merges clusters that are perceptually close, then normalises the weights. */
function condense(
  clusters: readonly { centroid: Oklab; weight: number }[],
  options: ResolvedExtractOptions,
): { centroid: Oklab; weight: number }[] {
  const merged: { centroid: Oklab; weight: number }[] = [];

  for (const cluster of clusters) {
    const existing = merged.find(
      (candidate) => deltaEOk(candidate.centroid, cluster.centroid) < options.mergeThreshold,
    );
    if (!existing) {
      merged.push({ centroid: cluster.centroid, weight: cluster.weight });
      continue;
    }
    const total = existing.weight + cluster.weight;
    existing.centroid = {
      l: (existing.centroid.l * existing.weight + cluster.centroid.l * cluster.weight) / total,
      a: (existing.centroid.a * existing.weight + cluster.centroid.a * cluster.weight) / total,
      b: (existing.centroid.b * existing.weight + cluster.centroid.b * cluster.weight) / total,
    };
    existing.weight = total;
  }

  const kept = merged
    .filter((cluster) => cluster.weight >= options.minPopulation)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, options.count);

  if (kept.length === 0) {
    return merged.sort((a, b) => b.weight - a.weight).slice(0, options.count);
  }

  const total = kept.reduce((sum, cluster) => sum + cluster.weight, 0);
  return kept.map((cluster) => ({ ...cluster, weight: cluster.weight / total }));
}

function fromHexList(
  colors: readonly string[],
  options: ResolvedExtractOptions,
): SampledColor[] {
  const counts = new Map<string, number>();
  for (const color of colors) {
    if (!isHexColor(color)) {
      throw new TypeError(`Invalid hex colour: ${JSON.stringify(color)}`);
    }
    const hex = normalizeHex(color);
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .map(([hex, count]) => ({ hex, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, options.count);

  // Renormalise after the cut, so the colours that survive still account for
  // the whole input and their populations sum to 1.
  const kept = ranked.reduce((sum, entry) => sum + entry.count, 0);
  return ranked.map((entry) => ({
    hex: entry.hex,
    rgb: parseHex(entry.hex),
    population: entry.count / kept,
  }));
}

/**
 * Pulls a palette out of an image (or a list of hex colours).
 *
 * The image is sampled, converted to Oklab, clustered, and condensed: colours
 * that occupy less than `minPopulation` of the picture are dropped so that
 * stray pixels do not become theme colours.
 *
 * ```ts
 * const palette = extractPalette(imageData, { count: 5 });
 * ```
 */
export function extractPalette(
  input: PaletteInput,
  options: ExtractOptions = {},
): SampledColor[] {
  const resolved = resolveOptions(options);

  if (Array.isArray(input)) {
    return fromHexList(input as readonly string[], resolved);
  }

  const source = input as PixelSource;
  const points = readPoints(source, resolved);
  if (points.length === 0) {
    return [];
  }

  const clusters = kmeans(points, Math.min(points.length, resolved.count * 3), {
    random: createRandom(resolved.seed),
  });

  return condense(clusters, resolved).map((cluster) => {
    const hex = oklabToHex(cluster.centroid);
    return {
      hex,
      rgb: parseHex(hex),
      population: Math.round(cluster.weight * 10000) / 10000,
    };
  });
}
