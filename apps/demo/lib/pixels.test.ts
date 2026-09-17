import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadRasterImage } from './pixels';

class TestImage extends EventTarget {
  static instances: TestImage[] = [];
  static cached: 'good' | 'bad' | null = null;
  complete = TestImage.cached !== null;
  naturalWidth = TestImage.cached === 'good' ? 900 : 0;
  naturalHeight = TestImage.cached === 'good' ? 600 : 0;
  width = 0;
  height = 0;
  src = '';
  crossOrigin = '';
  decode = vi.fn(() => new Promise<void>(() => {}));
  removeAttribute = vi.fn(() => { this.src = ''; });

  constructor() {
    super();
    TestImage.instances.push(this);
  }
}

const drawImage = vi.fn();
const data = new Uint8ClampedArray([30, 70, 50, 255]);

beforeEach(() => {
  TestImage.instances = [];
  TestImage.cached = null;
  drawImage.mockClear();
  vi.stubGlobal('Image', TestImage);
  vi.stubGlobal('document', {
    createElement: () => ({
      getContext: () => ({ drawImage, getImageData: () => ({ data }) }),
    }),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('loadRasterImage', () => {
  it('reads a cached image and bounds the canvas dimensions', async () => {
    TestImage.cached = 'good';
    await expect(loadRasterImage('/photo.webp')).resolves.toEqual({ data, width: 360, height: 240 });
    expect(drawImage).toHaveBeenCalledOnce();
  });

  it('rejects an already failed image instead of waiting for an event that has passed', async () => {
    TestImage.cached = 'bad';
    await expect(loadRasterImage('/broken.webp')).rejects.toThrow('Could not read that image.');
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('handles a load error even when decode has not settled yet', async () => {
    const result = loadRasterImage('/broken.webp');
    const image = TestImage.instances[0];
    image.complete = true;
    image.dispatchEvent(new Event('error'));
    await expect(result).rejects.toThrow('Could not read that image.');
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('can use the load event without waiting for decode', async () => {
    const result = loadRasterImage('/photo.webp');
    const image = TestImage.instances[0];
    image.complete = true;
    image.naturalWidth = 900;
    image.naturalHeight = 600;
    image.dispatchEvent(new Event('load'));
    await expect(result).resolves.toEqual({ data, width: 360, height: 240 });
  });

  it('stops a superseded load without drawing stale pixels', async () => {
    const controller = new AbortController();
    const result = loadRasterImage('blob:old-photo', 360, controller.signal);
    const image = TestImage.instances[0];
    controller.abort();
    image.naturalWidth = 900;
    image.naturalHeight = 600;
    image.dispatchEvent(new Event('load'));
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(image.removeAttribute).toHaveBeenCalledWith('src');
    expect(drawImage).not.toHaveBeenCalled();
  });

  it('does not start loading when the request was already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(loadRasterImage('/photo.webp', 360, controller.signal))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(TestImage.instances).toHaveLength(0);
  });
});
