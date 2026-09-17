import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../color/contrast.js';
import { colorDistance, hexToOklab, oklabChroma } from '../color/convert.js';
import { extractPalette } from '../extract/extract.js';
import {
  checkThemeContrast,
  createThemeSet,
  generateTheme,
  isThemeReadable,
  regenerateTheme,
  setRoleColor,
  setRoleLocked,
  themeColors,
} from './generate.js';
import { THEME_ROLES, type ThemeRole } from '../types.js';

/** The kind of palette a coastal photo produces. */
const coastal = extractPalette(['#f8f4ec', '#ece5d8', '#213f3b', '#b95d41', '#7c967d']);

/** A low-contrast palette: the hard case for role assignment. */
const muddy = extractPalette(['#8a8a86', '#9a938c', '#7d7b76', '#a9a29a', '#6f6a63']);

const palettes: readonly (readonly [string, Parameters<typeof generateTheme>[0]])[] = [
  ['coastal', coastal],
  ['muddy', muddy],
];

describe('generateTheme', () => {
  it('requires a palette', () => {
    expect(() => generateTheme([])).toThrow(RangeError);
  });

  it('produces five valid hex roles', () => {
    const theme = generateTheme(coastal);
    const colors = themeColors(theme);
    for (const role of THEME_ROLES) {
      expect(colors[role]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('keeps the photo hue for the ink colour', () => {
    const theme = generateTheme(coastal, { mode: 'light' });
    const ink = hexToOklab(theme.roles.text.hex);
    expect(oklabChroma(ink)).toBeGreaterThan(0.005);
    expect(theme.roles.text.hex).not.toBe('#000000');
  });

  it('builds primary and accent from the vivid samples', () => {
    const theme = generateTheme(coastal, { mode: 'light' });
    expect(colorDistance(theme.roles.primary.hex, '#b95d41')).toBeLessThan(0.14);
    expect(colorDistance(theme.roles.accent.hex, '#7c967d')).toBeLessThan(0.14);
    expect(theme.roles.primary.sampledIndex).toBe(3);
    expect(theme.roles.accent.sampledIndex).toBe(4);
  });

  it('is deterministic', () => {
    expect(generateTheme(coastal, { variation: 3 })).toEqual(
      generateTheme(coastal, { variation: 3 }),
    );
  });

  describe.each(palettes)('%s palette', (_name, palette) => {
    it.each(['light', 'dark'] as const)('meets the text targets in %s mode', (mode) => {
      const theme = generateTheme(palette, { mode });
      const colors = themeColors(theme);

      expect(contrastRatio(colors.text, colors.background)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(colors.text, colors.surface)).toBeGreaterThanOrEqual(7);
      expect(
        contrastRatio(theme.readableInk.onPrimary, colors.primary),
      ).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.readableInk.onAccent, colors.accent)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrastRatio(colors.primary, colors.background)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(colors.accent, colors.background)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(colors.text, colors.surface)).toBeGreaterThanOrEqual(7);
    });

    it('reports the theme as readable', () => {
      const set = createThemeSet(palette);
      expect(isThemeReadable(set.light)).toBe(true);
      expect(isThemeReadable(set.dark)).toBe(true);
    });
  });

  it('makes the light background lighter than the dark one', () => {
    const set = createThemeSet(coastal);
    expect(hexToOklab(set.light.roles.background.hex).l).toBeGreaterThan(
      hexToOklab(set.dark.roles.background.hex).l,
    );
    expect(set.light.mode).toBe('light');
    expect(set.dark.mode).toBe('dark');
  });

  it('honours overrides and marks them as user colours', () => {
    const theme = generateTheme(coastal, { overrides: { accent: '#123456' } });
    expect(theme.roles.accent.hex).toBe('#123456');
    expect(theme.roles.accent.source).toBe('user');
    expect(theme.roles.accent.locked).toBe(false);
  });

  it('recomputes the label colours from an overridden fill', () => {
    // A white primary with a white label reads at 1:1. The label has to follow
    // the fill the user actually set, in the theme and in every export.
    const theme = generateTheme(coastal, {
      mode: 'light',
      overrides: { primary: '#ffffff', accent: '#ffffff' },
    });

    expect(theme.roles.primary.hex).toBe('#ffffff');
    expect(theme.readableInk.onPrimary).not.toBe('#ffffff');
    expect(contrastRatio(theme.readableInk.onPrimary, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.readableInk.onAccent, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('recomputes the label colours when a locked value differs from the derived fill', () => {
    const base = generateTheme(coastal, { mode: 'dark' });
    // Dark mode prefers a dark label; a locked near-black fill has to flip it.
    const lockedDark = generateTheme(coastal, {
      mode: 'dark',
      overrides: { accent: '#12100e' },
      locked: ['accent'],
    });

    expect(lockedDark.roles.accent.hex).toBe('#12100e');
    expect(lockedDark.roles.accent.locked).toBe(true);
    expect(lockedDark.readableInk.onAccent).not.toBe(base.readableInk.onAccent);
    expect(
      contrastRatio(lockedDark.readableInk.onAccent, lockedDark.roles.accent.hex),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('rejects invalid overrides', () => {
    expect(() => generateTheme(coastal, { overrides: { text: 'not-a-colour' } })).toThrow(
      TypeError,
    );
  });

  it('keeps variation changes bounded', () => {
    const variations = [0, 1, 2, 3, 4].map((variation) =>
      generateTheme(coastal, { variation, mode: 'light' }),
    );
    for (const theme of variations) {
      const colors = themeColors(theme);
      expect(contrastRatio(colors.text, colors.background)).toBeGreaterThanOrEqual(7);
    }
    const signatures = new Set(variations.map((theme) => themeColors(theme).surface));
    expect(signatures.size).toBeGreaterThan(1);
  });
});

describe('regenerateTheme', () => {
  it('keeps locked roles exactly and re-derives the rest', () => {
    const base = generateTheme(coastal, { variation: 0 });
    const locked = setRoleLocked(base, 'primary', true);
    const next = regenerateTheme(locked);

    expect(next.roles.primary.hex).toBe(base.roles.primary.hex);
    expect(next.roles.primary.locked).toBe(true);
    expect(next.variation).toBe(base.variation + 1);
  });

  it('keeps the same palette', () => {
    const base = generateTheme(coastal);
    expect(regenerateTheme(base).palette).toBe(base.palette);
  });
});

describe('role editing', () => {
  it('stores a manual colour without changing the lock', () => {
    const theme = setRoleColor(generateTheme(coastal), 'primary', '#0A0B0C');
    expect(theme.roles.primary.hex).toBe('#0a0b0c');
    expect(theme.roles.primary.source).toBe('user');
    expect(theme.roles.primary.locked).toBe(false);
  });

  it('recalculates the label colour when a manual fill is applied', () => {
    // The demo goes through generateTheme(overrides), but this helper is public
    // API: it used to hand back a white button still carrying its white label.
    const base = generateTheme(coastal, { mode: 'light' });
    expect(base.readableInk.onPrimary).toBe('#ffffff');

    const theme = setRoleColor(base, 'primary', '#ffffff');
    expect(theme.roles.primary.hex).toBe('#ffffff');
    expect(theme.readableInk.onPrimary).toBe('#101b18');
    expect(contrastRatio(theme.readableInk.onPrimary, theme.roles.primary.hex)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it.each(THEME_ROLES)('keeps both labels readable after setting %s', (role: ThemeRole) => {
    const theme = setRoleColor(generateTheme(coastal, { mode: 'light' }), role, '#fdfdfb');
    expect(contrastRatio(theme.readableInk.onPrimary, theme.roles.primary.hex)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio(theme.readableInk.onAccent, theme.roles.accent.hex)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('leaves the labels alone when a non-fill role changes', () => {
    const base = generateTheme(coastal, { mode: 'light' });
    const theme = setRoleColor(base, 'text', '#0b0b0b');
    expect(theme.readableInk).toEqual(base.readableInk);
  });

  it('keeps the labels readable in dark mode too', () => {
    const theme = setRoleColor(generateTheme(coastal, { mode: 'dark' }), 'accent', '#0d0d0d');
    expect(theme.roles.accent.hex).toBe('#0d0d0d');
    expect(theme.readableInk.onAccent).toBe('#ffffff');
    expect(contrastRatio(theme.readableInk.onAccent, theme.roles.accent.hex)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('keeps the exported tokens consistent with a manual fill', () => {
    const theme = setRoleColor(generateTheme(coastal), 'accent', '#ffffff');
    const inkOnAccent = checkThemeContrast(theme).find((check) => check.id === 'ink-on-accent');
    expect(inkOnAccent?.foreground).toBe(theme.readableInk.onAccent);
    expect(inkOnAccent?.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('rejects a manual colour that is not hex', () => {
    expect(() => setRoleColor(generateTheme(coastal), 'primary', 'rgb(1,2,3)')).toThrow(TypeError);
  });

  it.each(THEME_ROLES)('locks and unlocks %s', (role: ThemeRole) => {
    const locked = setRoleLocked(generateTheme(coastal), role, true);
    expect(locked.roles[role].locked).toBe(true);
    expect(setRoleLocked(locked, role, false).roles[role].locked).toBe(false);
  });
});

describe('checkThemeContrast', () => {
  it('covers the page-level pairs', () => {
    const checks = checkThemeContrast(generateTheme(coastal));
    expect(checks.map((check) => check.id)).toEqual([
      'text-on-background',
      'text-on-surface',
      'ink-on-primary',
      'ink-on-accent',
      'primary-on-background',
      'accent-on-background',
    ]);
    expect(checks.every((check) => check.ratio >= 1 && check.ratio <= 21)).toBe(true);
  });

  it('flags an unreadable pair', () => {
    const theme = generateTheme(coastal, { overrides: { text: '#f6f2ea' } });
    const textOnBackground = checkThemeContrast(theme).find(
      (check) => check.id === 'text-on-background',
    );
    expect(textOnBackground?.aa).toBe(false);
    expect(isThemeReadable(theme)).toBe(false);
  });
});
