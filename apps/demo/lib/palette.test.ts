import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { extractImagePalette, type PaletteResponse } from './palette';

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage: ((event: MessageEvent<PaletteResponse>) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    TestWorker.instances.push(this);
  }

  reply(data: PaletteResponse) {
    this.onmessage?.({ data } as MessageEvent<PaletteResponse>);
  }
}

const raster = { data: new Uint8ClampedArray([30, 70, 50, 255]), width: 1, height: 1 };
const palette = [{ hex: '#1e4632', rgb: { r: 30, g: 70, b: 50 }, population: 1 }];

beforeEach(() => {
  TestWorker.instances = [];
  vi.stubGlobal('Worker', TestWorker);
});

afterEach(() => vi.unstubAllGlobals());

describe('extractImagePalette', () => {
  it('returns the computed palette and releases the worker', async () => {
    const result = extractImagePalette(raster, 5, new AbortController().signal);
    const worker = TestWorker.instances[0];
    worker.reply({ palette });
    await expect(result).resolves.toEqual(palette);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('terminates superseded work while the replacement can still finish', async () => {
    const controller = new AbortController();
    const oldResult = extractImagePalette(raster, 5, controller.signal);
    controller.abort();
    const nextResult = extractImagePalette(raster, 5, new AbortController().signal);
    const [oldWorker, nextWorker] = TestWorker.instances;
    oldWorker.reply({ palette: [] });
    nextWorker.reply({ palette });
    await expect(oldResult).rejects.toMatchObject({ name: 'AbortError' });
    await expect(nextResult).resolves.toEqual(palette);
    expect(oldWorker.terminate).toHaveBeenCalledOnce();
  });

  it('does not create a worker for an already cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(extractImagePalette(raster, 5, controller.signal))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(TestWorker.instances).toHaveLength(0);
  });

  it('reports extraction failures and releases the worker', async () => {
    const result = extractImagePalette(raster, 5, new AbortController().signal);
    const worker = TestWorker.instances[0];
    worker.reply({ error: 'No usable pixels.' });
    await expect(result).rejects.toThrow('No usable pixels.');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('reports worker startup failures rather than leaving the image loading', async () => {
    const result = extractImagePalette(raster, 5, new AbortController().signal);
    const worker = TestWorker.instances[0];
    worker.onerror?.();
    await expect(result).rejects.toThrow('Could not sample that image. Please try again.');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
