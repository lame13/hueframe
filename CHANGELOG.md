# Changelog

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
