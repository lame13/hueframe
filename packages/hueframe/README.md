# hueframe

Extract the colours from an image, turn them into a website theme, and export it as CSS variables or
JSON design tokens.

- Zero dependencies, no DOM and no framework assumptions — pass `ImageData`, a raw RGBA buffer, or a
  list of hex colours.
- Deterministic: the same input, seed and variation always produce the same theme.
- Adjusts what it samples. A photo's colours are raw material, not finished roles.

```bash
npm install hueframe
```

```ts
import { extractPalette, createThemeSet, exportThemeSetCss } from 'hueframe';

const palette = extractPalette(imageData, { count: 5 });
const themes = createThemeSet(palette);

exportThemeSetCss(themes, { includePalette: true });
```

## 1. Extract

```ts
extractPalette(source, options?): SampledColor[]
```

`source` is `{ data, width, height }` — anything shaped like `ImageData`, including a Node `Buffer`
— or a `string[]` of hex colours. Pixels are sampled, converted to Oklab, clustered with seeded
k-means, then condensed: colours covering less than `minPopulation` of the picture are dropped so
stray pixels never become theme colours.

| Option             | Default | Meaning                                    |
| ------------------ | ------- | ------------------------------------------ |
| `count`            | `6`     | How many colours to return.                |
| `seed`             | `1`     | Cluster seed; the result is deterministic. |
| `maxSamples`       | `24000` | Upper bound on pixels inspected.           |
| `ignoreAlphaBelow` | `125`   | Transparent pixels are skipped.            |
| `mergeThreshold`   | `0.045` | Oklab distance under which clusters merge. |
| `minPopulation`    | `0.008` | Minimum share of the image for a colour.   |

Each result is `{ hex, rgb, population }`, sorted by how much of the image it covers. Populations are
normalised to sum to 1.

## 2. Generate

```ts
generateTheme(palette, options?): Theme
createThemeSet(palette, options?): ThemeSet          // { palette, light, dark }
regenerateTheme(theme, options?): Theme              // next variation, locked roles preserved
setRoleColor(theme, role, hex): Theme                // user-authored; labels recalculated
setRoleLocked(theme, role, locked): Theme
themeColors(theme): Record<ThemeRole, string>
```

`ThemeOptions`:

| Option        | Default   | Meaning                                                     |
| ------------- | --------- | ----------------------------------------------------------- |
| `mode`        | `'light'` | `'light'` or `'dark'`.                                       |
| `variation`   | `0`       | Which variation to generate. Bounded and deterministic.       |
| `seed`        | `1`       | Seed for the colour search.                                  |
| `locked`      | `[]`      | Roles to keep exactly as they are.                            |
| `overrides`   | `{}`      | Explicit colours per role; wins over everything else.         |
| `readability` | see below | Contrast targets: `{ text: 7, ink: 4.5, ui: 3 }`.            |

Five roles mean the same thing in both modes:

| Role         | Used for                       |
| ------------ | ------------------------------ |
| `background` | the page                       |
| `surface`    | raised cards and section bands |
| `text`       | body copy and headings         |
| `primary`    | the main action                |
| `accent`     | the secondary colour           |

`Theme` also carries `readableInk.onPrimary` / `readableInk.onAccent` — label colours that stay
readable on those fills — plus the sampled `palette` the theme came from. The labels are chosen
from the fills that actually ship, so an `overrides` value, a locked colour, or a later
`setRoleColor` gets a readable label too: force `primary` to `#ffffff` and `readableInk.onPrimary`
comes back dark, not white.

### How the roles are chosen

The page takes the lightest (or darkest) colour, pulled into a usable lightness range. The surface
sits one step away, tinted towards the palette's most chromatic colour. Ink takes the opposite end of
the palette and keeps its hue. The primary is the most vivid colour held near a mid lightness; the
accent is the next vivid colour at least 40° of hue away. Text and labels are then moved along their
own lightness axis until they clear the contrast targets, and fills are nudged until they stay
distinct from the page.

### Variations

`variation` changes the picks among near-equal candidates and the derived treatments (surface depth,
tint, chroma) — never the contract: every variation is still a readable theme.
`regenerateTheme` freezes locked roles into explicit values before re-deriving, so a locked colour
survives the change byte for byte.

## 3. Export

```ts
themeToCssVariables(theme, options?): Record<string, string>
exportCssVariables(theme, options?): string
exportThemeSetCss(set, options?): string

exportJsonTokens(theme, options?): ThemeTokens
exportJsonTokensString(theme, options?): string
exportThemeSetJson(set, options?): { light: ThemeTokens; dark: ThemeTokens }
```

CSS output is a block of custom properties — `--hf-background`, `--hf-surface`, `--hf-text`,
`--hf-primary`, `--hf-accent`, `--hf-on-primary`, `--hf-on-accent`, plus `--hf-sample-N` when asked.
`color-scheme` is included, and a set can emit a dark block via `darkSelector` (default
`[data-theme="dark"]`) and/or `@media (prefers-color-scheme: dark)` with `prefersColorScheme: true`.
Set `prefix`, `selector` and `indent` to match an existing design system.

JSON output follows the DTCG shape (`$type` / `$value` / `$description`, palette weights as
`$extensions`) and can include the contrast report.

## Contrast

```ts
checkThemeContrast(theme): ContrastCheck[]        // the six pairs that matter on a page
isThemeReadable(theme, readability?): boolean     // every text pair meets its target

contrastRatio(a, b): number
rateContrast(ratio): { aa, aaa, aaLarge }
pickReadableInk(background, { candidates, target }): string
enforceContrast(foreground, background, { target, direction, maxShift }): string
```

`enforceContrast` moves a colour along its own lightness axis, keeping hue and chroma, so a terracotta
stays a terracotta while it becomes readable. It never moves more than `maxShift` of lightness —
`maxShift: 0` returns the colour untouched — and when the target is out of reach it returns the best
colour it found rather than one that reads worse.

## Colour utilities

Everything the pipeline uses is exported: `parseHex`, `normalizeHex`, `isHexColor`, `rgbToHex`,
`rgbToHsl`, `hslToHex`, `rgbToOklab`, `oklabToRgb`, `oklabToHex`, `deltaEOk`, `colorDistance`,
`mixOklab`, `retune`, `rotateOklabHue`, `scaleOklabChroma`, `setOklabLightness`, `hueDistance`,
`oklabChroma`, `oklabHue`, `relativeLuminance`, `toHex`, `toRgb`, `clamp`, plus the types (`Rgb`,
`Hsl`, `Oklab`, `Theme`, `ThemeSet`, `ThemeRole`, `SampledColor`, `ContrastCheck`, …).

## Notes

- ESM only. Build with `npm run build` (tsc) before consuming.
- No network, no filesystem access, no DOM assumptions at runtime.
- `extractPalette` expects RGBA data with 4 bytes per pixel. Downscale large photos first — a 360px
  long edge is enough for dominant colours and keeps the pass in milliseconds.

## Licence

MIT
