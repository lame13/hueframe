import { extractPalette } from 'hueframe';

import type { PaletteRequest, PaletteResponse } from './palette';

self.onmessage = ({ data }: MessageEvent<PaletteRequest>) => {
  let response: PaletteResponse;
  try {
    response = { palette: extractPalette(data.raster, { count: data.count }) };
  } catch (error) {
    response = { error: error instanceof Error ? error.message : 'Could not sample that image.' };
  }
  self.postMessage(response);
};
