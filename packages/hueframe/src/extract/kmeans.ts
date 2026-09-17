import { deltaEOk } from '../color/convert.js';
import type { Oklab } from '../types.js';

/** Deterministic PRNG (mulberry32) so palettes are reproducible for a given seed. */
export function createRandom(seed: number): () => number {
  let state = (Math.trunc(seed) >>> 0) || 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Cluster {
  readonly centroid: Oklab;
  /** Share of the supplied points assigned to this cluster, 0-1. */
  readonly weight: number;
}

export interface KMeansOptions {
  /** Refinement passes. Defaults to 12. */
  readonly iterations?: number;
  /** Injectable random source; defaults to a seeded generator. */
  readonly random?: () => number;
}

interface MutableCluster {
  centroid: Oklab;
  a: number;
  b: number;
  c: number;
  count: number;
}

function nearestIndex(point: Oklab, centroids: readonly Oklab[]): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < centroids.length; index += 1) {
    const distance = deltaEOk(point, centroids[index]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

/** k-means++ seeding: spread the initial centroids out over the point cloud. */
function seedCentroids(
  points: readonly Oklab[],
  k: number,
  random: () => number,
): Oklab[] {
  const centroids: Oklab[] = [points[Math.floor(random() * points.length)]];
  const distances = points.map((point) => deltaEOk(point, centroids[0]) ** 2);

  while (centroids.length < k) {
    const total = distances.reduce((sum, value) => sum + value, 0);
    let target = random() * total;
    let chosen = points.length - 1;
    for (let index = 0; index < distances.length; index += 1) {
      target -= distances[index];
      if (target <= 0) {
        chosen = index;
        break;
      }
    }
    const centroid = points[chosen];
    centroids.push(centroid);
    for (let index = 0; index < points.length; index += 1) {
      const distance = deltaEOk(points[index], centroid) ** 2;
      if (distance < distances[index]) {
        distances[index] = distance;
      }
    }
  }

  return centroids;
}

/**
 * Groups colours into `k` clusters in Oklab space.
 *
 * Deterministic for a given seed: the same points always produce the same
 * clusters, which keeps generated palettes reproducible across runs.
 */
export function kmeans(
  points: readonly Oklab[],
  k: number,
  { iterations = 12, random = createRandom(1) }: KMeansOptions = {},
): Cluster[] {
  if (points.length === 0) {
    return [];
  }

  const target = Math.max(1, Math.min(Math.trunc(k), points.length));
  let centroids = seedCentroids(points, target, random);

  for (let pass = 0; pass < iterations; pass += 1) {
    const clusters: MutableCluster[] = centroids.map((centroid) => ({
      centroid,
      a: 0,
      b: 0,
      c: 0,
      count: 0,
    }));

    for (const point of points) {
      const cluster = clusters[nearestIndex(point, centroids)];
      cluster.a += point.l;
      cluster.b += point.a;
      cluster.c += point.b;
      cluster.count += 1;
    }

    const next = clusters
      .filter((cluster) => cluster.count > 0)
      .map((cluster) => ({
        l: cluster.a / cluster.count,
        a: cluster.b / cluster.count,
        b: cluster.c / cluster.count,
      }));

    if (next.length === 0) {
      break;
    }
    centroids = next;
  }

  const tally = centroids.map(() => 0);
  for (const point of points) {
    tally[nearestIndex(point, centroids)] += 1;
  }

  return centroids
    .map((centroid, index) => ({ centroid, weight: tally[index] / points.length }))
    .filter((cluster) => cluster.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}
