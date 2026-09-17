import type { SampledColor } from 'hueframe';

import type { RasterImage } from './pixels';

export interface PaletteRequest {
  readonly raster: RasterImage;
  readonly count: number;
}

export type PaletteResponse =
  | { readonly palette: SampledColor[] }
  | { readonly error: string };

/** Keep colour clustering off the UI thread and stop work for replaced images. */
export function extractImagePalette(
  raster: RasterImage,
  count: number,
  signal: AbortSignal,
): Promise<SampledColor[]> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const worker = new Worker(new URL('./palette.worker.ts', import.meta.url));
    const cleanup = () => {
      signal.removeEventListener('abort', abort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };
    const abort = () => {
      cleanup();
      reject(signal.reason);
    };

    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }: MessageEvent<PaletteResponse>) => {
      cleanup();
      if ('error' in data) {
        reject(new Error(data.error));
      } else {
        resolve(data.palette);
      }
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('Could not sample that image. Please try again.'));
    };
    try {
      worker.postMessage({ raster, count } satisfies PaletteRequest);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
