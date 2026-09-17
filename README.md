# hueframe

Drop a photo. Watch a working webpage recolour itself. Export the result.

[Package documentation](packages/hueframe/README.md) · [IndexLane](https://indexlane.dev)

`hueframe` is a framework-independent TypeScript package that turns an image into a usable website
theme — background, surface, text, primary and accent — then exports it as CSS variables or JSON
design tokens. This repo also ships a Next.js playground that puts the package in front of a
real-looking page, so the transformation is visible in seconds.

This repo holds two things:

| Path                | What it is                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `packages/hueframe` | The framework-independent TypeScript package: colour extraction, theme generation, export. |
| `apps/demo`         | A Next.js + TypeScript playground that puts the package in front of a real-looking page.   |

Both are part of one npm workspace. There is no application code in the package and no theme logic
in the demo — the demo only renders what the package returns.

## Try the playground

```bash
npm install
npm run dev            # builds the package, then starts the demo on http://localhost:3000
```

Drop a photo anywhere in the window, paste one with `⌘V`, or start from one of the eight bundled
sample photos in the sidebar. Colours are read in the browser and never uploaded.

## One useful example

Feed it pixels, get a theme back, ship the CSS:

```ts
import {
  extractPalette,
  generateTheme,
  exportCssVariables,
  exportJsonTokensString,
} from 'hueframe';

// 1. ImageData, a Uint8ClampedArray/Buffer, or a list of hex colours.
const palette = extractPalette(imageData, { count: 5 });

// 2. Sampled colours in, usable roles out.
const theme = generateTheme(palette, { mode: 'light', variation: 0 });

// 3. Ship it.
const css = exportCssVariables(theme, { includePalette: true });
const json = exportJsonTokensString(theme);
```

That is exactly what the demo runs, after downscaling the image to a 360px long edge on a canvas.
[`packages/hueframe/README.md`](packages/hueframe/README.md) has the full API.

## What the playground does

- **Neutral editor.** The sidebar, header and controls never change colour. The only thing that
  moves is the preview, so a change is impossible to miss.
- **Sample photos.** Eight CC0 photos with deliberately different colour signatures — turquoise,
  gold, green, neon, sand, pink, ice, monochrome — sit under the dropzone, so you can show the
  transformation without hunting for a file first.
- **Sampled colours.** Five dominant colours come out of the photo, with their share of the pixels.
  Click a swatch to copy its hex.
- **Theme colours.** The same photo becomes five usable roles: background, surface, text, primary
  and accent. Hue is kept; lightness and chroma are retuned, and text is pushed until it clears its
  contrast target. Button labels are chosen from the fill that actually ships, so even a hand-picked
  white primary still gets a readable label.
- **Editable roles.** Pick a colour with the swatch, type a hex, or press the lock to pin a role.
  `New variation` re-derives the theme from the same photo and keeps every locked role exactly as it
  was; manual edits without a lock are replaced by the next variation. `Reset` starts over.
- **Immediate preview.** Light, dark or system, and desktop or mobile, are one click away. The
  mobile frame re-lays out the page with container queries; nothing is scaled or faked. `System`
  follows the operating system setting and marks the mode it resolved to.
- **Two templates.** `Guesthouse` and `Portfolio` are fixed pages with their own layout, copy and
  photography — one is a business page, one is a person's page. Both are driven by the same five
  roles, and the tabs sit next to the Light/Dark/System control.
- **Photos are the colour source, not the content.** The image you drop only feeds the palette; the
  page keeps its own CC0 photography, so every template looks finished whatever you feed it.
- **Export.** CSS variables first (`:root` plus a `[data-theme="dark"]` block and a
  `prefers-color-scheme` variant), JSON design tokens alongside them.

### Keyboard and pointer

- Drop a photo anywhere in the window, or paste one from the clipboard.
- `Tab` reaches the sample photos, swatches, hex fields, locks and both segmented controls.
- `Esc` closes a dialog and focus returns to the button that opened it.

## Design decisions

**Fixed templates.** Each preview page keeps its layout, copy and photography; only the colours
change. That keeps the transformation legible, makes the two templates comparable, and keeps the
release small. A template is a component that takes a theme and nothing else.

**Sampled is not the same as usable.** A photo's average colours are rarely good page furniture, so
`generateTheme` treats them as raw material: the lightest colour becomes the page, the darkest
becomes ink, the most vivid becomes the primary, and a second hue-separated colour becomes the
accent. Values are retuned in Oklab and contrast targets are enforced (7:1 body text, 4.5:1 labels
on fills, 3:1 fills against the page).

**Everything is deterministic.** The same palette, seed and variation always produce the same
theme, so screenshots, tests and exports stay reproducible.

**Nothing leaves the browser.** The photo is read through a canvas and never uploaded; the blob URL
is revoked as soon as it is replaced. Every bundled photo — the eight samples and the template
photography — is CC0 (public domain, no attribution required) and served as WebP; see
[CREDITS.md](CREDITS.md).

## Development

```bash
npm run dev            # build the package, then run the demo
npm run build          # package (tsc) then demo (next build)
npm run typecheck      # package + demo, strict
npm test               # package + playground unit tests (vitest)
npm run lint --workspace @hueframe/demo  # demo lint (eslint, next config)
```

Repository notes:

- The package is ESM-only (`type: module`) and has zero runtime dependencies. Build it before
  consuming it: `npm run build:package`.
- `apps/demo` imports the built package, so running `next dev` on its own needs the package built
  once. The root `npm run dev` handles that.
- `npm run clean` removes `dist` and the Next.js build output.

## Licence

MIT

Created by [Niko Minadze](https://indexlane.dev) at IndexLane.

See [CHANGELOG.md](CHANGELOG.md) for release history.
