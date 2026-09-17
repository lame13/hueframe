# hueframe

Turn a photo into a website colour scheme.

hueframe extracts a palette, builds light and dark themes, and exports CSS variables or JSON design
tokens. You get colours for the page background, surfaces, text, primary actions, and accents,
plus label colours for buttons.

Use it for a theme picker, a site builder, or a page that takes its colours from a cover image.
It works in browsers and Node.js, has no runtime dependencies, and includes TypeScript types.

Created by [Niko Minadze](https://indexlane.dev) at **IndexLane**.

[GitHub](https://github.com/lame13/hueframe) ·
[Report an issue](https://github.com/lame13/hueframe/issues) ·
[IndexLane](https://indexlane.dev)

## Install

```bash
npm install hueframe
```

The package ships compiled JavaScript and type declarations. Use ESM `import`; no build step is
needed to use the installed package. For Node.js, use version 20.9 or later.

## Make your first theme

Start with a few colours so you can try the full flow without loading an image:

```js
import { extractPalette, createThemeSet, exportThemeSetCss } from 'hueframe';

const palette = extractPalette([
  '#234c45',
  '#80a18a',
  '#d2a467',
  '#f3eee4',
  '#292d32',
]);

const themes = createThemeSet(palette);
const css = exportThemeSetCss(themes);

console.log(css);
```

The result contains a `:root` block for the light theme and a `[data-theme="dark"]` block for
the dark theme. Save it in your stylesheet, then use the variables:

```css
body {
  background: var(--hf-background);
  color: var(--hf-text);
}

.card {
  background: var(--hf-surface);
}

.button {
  background: var(--hf-primary);
  color: var(--hf-on-primary);
}
```

Set `data-theme="dark"` on your `<html>` element to switch modes. To generate an additional
`prefers-color-scheme: dark` media query, pass `{ prefersColorScheme: true }` to
`exportThemeSetCss`. That media query follows the system setting even if you set a light theme
manually, so omit it when your application manages the mode itself.

## Use an image

`extractPalette` accepts either a list of hex colours or an object containing decoded RGBA pixels:
`{ data, width, height }`. Browser `ImageData` already has that shape.

### In a browser

This helper reads a local `File`, scales it to a maximum of 360 pixels on its longest edge, and
returns its dominant colours. Nothing is uploaded.

```js
import { extractPalette } from 'hueframe';

async function paletteFromFile(file) {
  const image = await createImageBitmap(file);

  try {
    const scale = Math.min(1, 360 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('A 2D canvas context is unavailable.');

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    return extractPalette(pixels, { count: 5 });
  } finally {
    image.close();
  }
}
```

Call `await paletteFromFile(file)` from your file input, drop handler, or clipboard handler, then
pass the palette to `createThemeSet`. If the image has no eligible pixels, such as a fully
transparent image, extraction returns `[]`; check for that before generating a theme.

### In Node.js

Pass decoded RGBA bytes as `data`, with the image dimensions. A `Buffer` or `Uint8ClampedArray`
works. This small example represents a two-pixel image:

```js
import { extractPalette } from 'hueframe';

const palette = extractPalette({
  data: new Uint8ClampedArray([
    35, 76, 69, 255,
    210, 164, 103, 255,
  ]),
  width: 2,
  height: 1,
});

console.log(palette); // Each entry has hex, rgb, and population.
```

hueframe does not download images or decode JPEG, PNG, or WebP files. Decode the file with your
image library first. An encoded file buffer, URL, or file path cannot be passed directly.

### Extraction options

```js
extractPalette(imageData, { count: 5, seed: 1 });
```

| Option | Default | What it controls |
| --- | --- | --- |
| `count` | `6` | Maximum number of colours returned. |
| `seed` | `1` | Seed used when clustering image pixels. |
| `maxSamples` | `24000` | Sampling budget for large images. |
| `ignoreAlphaBelow` | `125` | Skip pixels whose alpha is below this value. |
| `mergeThreshold` | `0.045` | Merge image clusters this close in Oklab. |
| `minPopulation` | `0.008` | Filter small image clusters, keeping the largest if all are below the threshold. |

Results are sorted by population: the share of retained samples represented by each colour.
Image weights are rounded to four decimal places, so their total can differ slightly from 1.
The same input and options produce the same result. For hex lists, repeated colours determine
population; image sampling and clustering options do not apply.

## Adjust the theme

Each theme contains five roles:

| Role | Use it for |
| --- | --- |
| `background` | The page background. |
| `surface` | Cards, panels, and section backgrounds. |
| `text` | Body text and headings. |
| `primary` | Main action fills. |
| `accent` | Secondary highlights. |

Read a role from `theme.roles.primary.hex`, or call `themeColors(theme)` to get a flat map.
For text on coloured buttons, use `theme.readableInk.onPrimary` and `theme.readableInk.onAccent`.

You can edit a colour, lock it, and generate another variation around it:

```js
import {
  extractPalette,
  generateTheme,
  setRoleColor,
  setRoleLocked,
  regenerateTheme,
  themeColors,
} from 'hueframe';

const palette = extractPalette(['#234c45', '#80a18a', '#d2a467', '#f3eee4']);
let theme = generateTheme(palette, { mode: 'light' });

theme = setRoleColor(theme, 'primary', '#315b50');
theme = setRoleLocked(theme, 'primary', true);
theme = regenerateTheme(theme);

console.log(themeColors(theme)); // The primary colour stays #315b50.
```

These functions return new theme objects. Manual edits are replaced on regeneration unless the
role is locked. Changing a primary or accent fill recalculates its label colour.

`generateTheme` accepts `mode`, `seed`, `variation`, `locked`, `overrides`, and `readability`.
`createThemeSet` accepts the same options except `mode`, because it creates both modes.
Use `overrides: { primary: '#315b50' }` to set a colour during generation.

## Export CSS or JSON

| Function | Returns |
| --- | --- |
| `themeToCssVariables(theme)` | A map of custom property names to colours. |
| `exportCssVariables(theme)` | One theme as a CSS string. |
| `exportThemeSetCss(themes)` | Light and dark CSS blocks. |
| `exportJsonTokens(theme)` | One theme as a JSON-compatible object. |
| `exportJsonTokensString(theme)` | One theme as a JSON string. |
| `exportThemeSetJson(themes)` | An object with `light` and `dark` token documents. |

CSS exports include `--hf-background`, `--hf-surface`, `--hf-text`, `--hf-primary`, `--hf-accent`,
`--hf-on-primary`, and `--hf-on-accent`. Pass `{ includePalette: true }` to add `--hf-sample-1`
and the remaining sampled colours.

You can also set `prefix`, `selector`, `darkSelector`, `includeColorScheme`, and `indent`.
CSS strings include `color-scheme` by default; the flat map contains only the colour variables.

JSON colour tokens use `$type`, `$value`, and `$description` fields, with hex strings as values.
Palette weights and contrast results are included by default. Use `{ includePalette: false,
includeContrast: false }` to omit them. `exportJsonTokensString` also accepts `pretty` and `indent`.

## Check contrast

Theme generation adjusts lightness and chroma toward these default contrast targets:

- `text: 7` for body text against the background and surface.
- `ink: 4.5` for labels on primary and accent fills.
- `ui: 3` for primary and accent fills against the background.

Pass `readability: { text: 7, ink: 4.5, ui: 3 }` to change them. Use
`checkThemeContrast(theme)` for the six foreground/background pairs and their ratios, or
`isThemeReadable(theme, readability)` to check whether all pairs meet your targets.

An override or manual edit can introduce poor contrast, and a requested target may be out of
reach. Check the final theme, particularly after edits. These colour checks do not assess the
accessibility of a complete page.

The package also exports `contrastRatio`, `pickReadableInk`, `enforceContrast`, RGB/HSL/Oklab
conversions, and colour mixing utilities. See the
[export list](https://github.com/lame13/hueframe/blob/main/packages/hueframe/src/index.ts)
for the full API; type declarations are included in the package.

## Try the playground

The [GitHub repository](https://github.com/lame13/hueframe) includes a Next.js playground with
sample photos, editable roles, and two page templates. To run it locally:

```bash
git clone https://github.com/lame13/hueframe.git
cd hueframe
npm ci
npm run dev
```

Open `http://localhost:3000`. The playground is separate from the npm package; installing
`hueframe` does not install Next.js or React.

## License

[MIT](https://github.com/lame13/hueframe/blob/main/packages/hueframe/LICENSE).
