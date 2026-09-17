# Changelog

## 1.0.3 - 2026-09-17

### Fixed

- Fix Chrome showing a previous playground background after changing a sample photo, uploaded
  image, or theme. Remove the scrolling preview's background-colour animation so the new colour
  appears without requiring a hover or another repaint.

### Added

- Live playground links in the repository and npm package READMEs.

## 1.0.2 - 2026-09-17

### Fixed

- Cancel superseded sample and upload requests, and discard late state updates so an earlier
  image cannot replace the latest selection.
- Run palette extraction in a Web Worker to keep the playground responsive while sampling.
- Reuse completed sample palettes and avoid regenerating themes for unrelated UI changes.
- Handle failed and cancelled image decodes without leaving the playground loading indefinitely.
- Release replaced upload URLs and finished workers, and disable export while a new image is loading.

### Added

- Regression tests for image loading, cancellation, worker cleanup, and extraction failures.

## 1.0.1 - 2026-09-17

### Added

- GitHub icon link beside Export CSS, opening the hueframe repository in a new tab
  with an accessible label.

### Fixed

- Visible keyboard focus for links.
- Header actions wrap on narrow screens to keep the export button and repository link together.

## 1.0.0 - 2026-09-17

Initial release of hueframe.

### Added

- Framework-independent TypeScript package with zero runtime dependencies and ESM exports.
- Deterministic palette extraction from image pixels, RGBA buffers, and hex colour lists,
  using Oklab clustering and population weights.
- Light and dark theme generation with background, surface, text, primary, and accent roles,
  configurable contrast targets, readable labels, manual colour edits, and role locking.
- Theme variations, colour conversion utilities, and contrast reports.
- CSS custom property and JSON design token exports, including light and dark theme sets.
- Next.js playground with image upload, drag and drop, clipboard paste, and eight sample photos.
- Guesthouse and Portfolio previews with desktop and mobile layouts, light/dark/system modes,
  editable theme roles, and CSS/JSON export dialogs.
- Browser-local image processing, bundled CC0 photography with source credits, and MIT licensing.
- Unit tests for colour conversion, contrast, palette extraction, theme generation, and exports.
