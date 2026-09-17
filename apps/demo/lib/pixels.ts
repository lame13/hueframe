export interface RasterImage {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

async function decode(image: HTMLImageElement): Promise<void> {
  if (typeof image.decode === 'function') {
    try {
      await image.decode();
      return;
    } catch {
      // Some browsers reject decode() for images that are already usable.
    }
  }
  if (image.complete && image.naturalWidth > 0) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => reject(new Error('Could not read that image.')), {
      once: true,
    });
  });
}

/**
 * Loads an image into an offscreen canvas and reads its pixels.
 *
 * Photos are downscaled before extraction: a 360px long edge is plenty for
 * picking up dominant colours and keeps the whole pass in a few milliseconds.
 */
export async function loadRasterImage(url: string, maxEdge = 360): Promise<RasterImage> {
  const image = new Image();
  if (/^https?:/i.test(url)) {
    image.crossOrigin = 'anonymous';
  }
  image.src = url;
  await decode(image);

  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (naturalWidth === 0 || naturalHeight === 0) {
    throw new Error('That image has no usable pixels.');
  }

  const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('This browser blocked canvas access.');
  }
  context.drawImage(image, 0, 0, width, height);

  const { data } = context.getImageData(0, 0, width, height);
  return { data, width, height };
}

/** True when a dropped clipboard/drag payload contains an image file. */
export function firstImageFile(files: readonly File[]): File | undefined {
  return files.find((file) => file.type.startsWith('image/'));
}
