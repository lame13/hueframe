/**
 * hueframe — turn a photo into a website palette.
 *
 * The pipeline is three steps, each usable on its own:
 *
 * 1. `extractPalette` pulls dominant colours out of image data.
 * 2. `generateTheme` (or `createThemeSet`) turns those colours into usable
 *    background, surface, text, primary and accent roles.
 * 3. `exportCssVariables` / `exportJsonTokens` ship the result.
 *
 * Nothing here touches the DOM, a framework, or a network.
 */

// Colour maths
export {
  clamp,
  colorDistance,
  deltaEOk,
  hexToHsl,
  hexToOklab,
  hslToHex,
  hslToRgb,
  hueDistance,
  isHexColor,
  linearToSrgb,
  mixOklab,
  normalizeHex,
  oklabChroma,
  oklabHue,
  oklabToHex,
  oklabToRgb,
  parseHex,
  retune,
  rgbToHex,
  rgbToHsl,
  rgbToOklab,
  rotateOklabHue,
  scaleOklabChroma,
  setOklabLightness,
  srgbToLinear,
} from './color/convert.js';

// Contrast
export {
  checkContrast,
  contrastRatio,
  enforceContrast,
  pickReadableInk,
  rateContrast,
  relativeLuminance,
  toHex,
  toRgb,
  type ColorInput,
  type ContrastPair,
  type ContrastRating,
  type EnforceContrastOptions,
  type ReadableInkOptions,
} from './color/contrast.js';

// Extraction
export { extractPalette, type ExtractOptions, type PaletteInput, type PixelSource } from './extract/extract.js';
export { createRandom, kmeans, type Cluster, type KMeansOptions } from './extract/kmeans.js';

// Theme generation
export {
  DEFAULT_READABILITY,
  checkThemeContrast,
  createThemeSet,
  generateTheme,
  isThemeReadable,
  regenerateTheme,
  setRoleColor,
  setRoleLocked,
  themeColors,
} from './theme/generate.js';

// Export
export {
  exportCssVariables,
  exportThemeSetCss,
  themeToCssVariables,
  type CssVariableOptions,
} from './export/css.js';
export {
  exportJsonTokens,
  exportJsonTokensString,
  exportThemeSetJson,
  type ColorToken,
  type ContrastToken,
  type JsonTokenOptions,
  type PaletteToken,
  type ThemeTokens,
} from './export/json.js';

// Types
export {
  THEME_ROLES,
  type ColorSource,
  type ContrastCheck,
  type Hsl,
  type Oklab,
  type ReadabilityOptions,
  type Rgb,
  type SampledColor,
  type Theme,
  type ThemeMode,
  type ThemeOptions,
  type ThemeRole,
  type ThemeRoleValue,
  type ThemeSet,
  type ThemeSetOptions,
} from './types.js';
