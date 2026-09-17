import {
  clamp,
  hexToOklab,
  hueDistance,
  isHexColor,
  mixOklab,
  normalizeHex,
  oklabChroma,
  oklabHue,
  retune,
  rotateOklabHue,
} from '../color/convert.js';
import {
  checkContrast,
  contrastRatio,
  enforceContrast,
  pickReadableInk,
} from '../color/contrast.js';
import { createRandom } from '../extract/kmeans.js';
import {
  THEME_ROLES,
  type ContrastCheck,
  type Oklab,
  type ReadabilityOptions,
  type SampledColor,
  type Theme,
  type ThemeMode,
  type ThemeOptions,
  type ThemeRole,
  type ThemeRoleValue,
  type ThemeSet,
  type ThemeSetOptions,
} from '../types.js';

export const DEFAULT_READABILITY: Required<ReadabilityOptions> = {
  text: 7,
  ink: 4.5,
  ui: 3,
};

interface Candidate {
  readonly hex: string;
  readonly lab: Oklab;
  readonly chroma: number;
  readonly hue: number;
  readonly weight: number;
  readonly index: number;
}

/**
 * Bounded, variation-specific decisions. Kept small so every variation stays a
 * usable theme instead of a lottery.
 */
interface VariationProfile {
  readonly surfaceDelta: number;
  readonly backgroundChroma: number;
  readonly tintMix: number;
  readonly textChroma: number;
  readonly textLightness: number;
  readonly primaryLightness: number;
  readonly primaryChroma: number;
  readonly accentLightness: number;
  readonly accentChroma: number;
  readonly accentHueShift: number;
}

function variationProfile(variation: number, seed: number): VariationProfile {
  const random = createRandom(seed * 2246822519 + variation * 2654435761);
  const between = (min: number, max: number) => min + random() * (max - min);

  return {
    surfaceDelta: between(0.035, 0.06),
    backgroundChroma: between(0.45, 0.8),
    tintMix: between(0.1, 0.22),
    textChroma: between(0.35, 0.65),
    textLightness: between(0.24, 0.34),
    primaryLightness: between(0.52, 0.62),
    primaryChroma: between(1, 1.25),
    accentLightness: between(0.56, 0.68),
    accentChroma: between(0.85, 1.15),
    accentHueShift: between(-10, 10),
  };
}

function toCandidates(palette: readonly SampledColor[]): Candidate[] {
  return palette.map((sample, index) => {
    const lab = hexToOklab(sample.hex);
    return {
      hex: normalizeHex(sample.hex),
      lab,
      chroma: oklabChroma(lab),
      hue: oklabHue(lab),
      weight: sample.population,
      index,
    };
  });
}

function mostChromatic(candidates: readonly Candidate[]): Candidate {
  return [...candidates].sort(
    (a, b) => b.chroma * 0.8 + b.weight * 0.4 - (a.chroma * 0.8 + a.weight * 0.4),
  )[0];
}

function mostPopulous(candidates: readonly Candidate[]): Candidate {
  return [...candidates].sort((a, b) => b.weight - a.weight)[0];
}

/** The candidate that best matches a lightness preference for a given mode. */
function pickByLightness(candidates: readonly Candidate[], mode: ThemeMode): Candidate {
  const scored = candidates.map((candidate) => {
    const fit = mode === 'light' ? candidate.lab.l : 1 - candidate.lab.l;
    return {
      candidate,
      score: fit * 1.8 - candidate.chroma * 2.4 + candidate.weight * 0.5,
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].candidate;
}

/** The candidate best suited to become text: darkest for light, lightest for dark. */
function pickInk(candidates: readonly Candidate[], mode: ThemeMode): Candidate {
  const scored = candidates.map((candidate) => ({
    candidate,
    score:
      (mode === 'light' ? 1 - candidate.lab.l : candidate.lab.l) * 1.8 +
      candidate.weight * 0.4,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].candidate;
}

/** The most vivid candidate, optionally avoiding hues close to `avoidHue`. */
function pickVivid(
  candidates: readonly Candidate[],
  {
    avoidHue,
    minHueDistance = 0,
  }: { avoidHue?: number; minHueDistance?: number } = {},
): Candidate | undefined {
  const pool = candidates.filter((candidate) => {
    if (avoidHue === undefined || minHueDistance === 0) {
      return true;
    }
    return candidate.chroma < 0.02 || hueDistance(candidate.hue, avoidHue) >= minHueDistance;
  });

  const scored = (pool.length > 0 ? pool : candidates).map((candidate) => ({
    candidate,
    score:
      candidate.chroma * 1.7 +
      candidate.weight * 0.5 -
      Math.abs(candidate.lab.l - 0.55) * 1.1,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.candidate;
}

function resolveReadability(options?: ReadabilityOptions): Required<ReadabilityOptions> {
  return {
    text: options?.text ?? DEFAULT_READABILITY.text,
    ink: options?.ink ?? DEFAULT_READABILITY.ink,
    ui: options?.ui ?? DEFAULT_READABILITY.ui,
  };
}

function validateOverrides(
  overrides: Partial<Record<ThemeRole, string>> | undefined,
): Partial<Record<ThemeRole, string>> {
  if (!overrides) {
    return {};
  }
  const resolved: Partial<Record<ThemeRole, string>> = {};
  for (const role of THEME_ROLES) {
    const value = overrides[role];
    if (value === undefined) {
      continue;
    }
    if (!isHexColor(value)) {
      throw new TypeError(`Override for "${role}" is not a hex colour: ${JSON.stringify(value)}`);
    }
    resolved[role] = normalizeHex(value);
  }
  return resolved;
}

function themeRole(
  role: ThemeRole,
  hex: string,
  locked: boolean,
  source: ThemeRoleValue['source'],
  sampledIndex?: number,
): ThemeRoleValue {
  const value: ThemeRoleValue = { role, hex: normalizeHex(hex), source, locked };
  return sampledIndex === undefined ? value : { ...value, sampledIndex };
}

/**
 * Keeps a fill distinguishable from the surfaces behind it. Without this, a
 * muted photo can hand you a button that melts into the page.
 */
function enforceFill(fillHex: string, backdrops: readonly string[], target: number): string {
  const ratios = backdrops.map((backdrop) => ({
    backdrop,
    ratio: contrastRatio(fillHex, backdrop),
  }));
  ratios.sort((a, b) => a.ratio - b.ratio);
  const weakest = ratios[0];

  if (weakest.ratio >= target) {
    return fillHex;
  }
  return enforceContrast(fillHex, weakest.backdrop, { target, maxShift: 0.3 });
}

/**
 * Nudges a fill until its preferred label colour fits.
 *
 * The primary action has an expected look — a saturated fill with a light
 * label — so the fill moves rather than the label. The accent is happy to keep
 * its sampled colour, so `switch` tries the opposite label before moving it.
 * Either way the label itself is chosen later, from the fill that survives.
 */
function adjustFillForInk(
  fillHex: string,
  mode: ThemeMode,
  target: number,
  strategy: 'adjust' | 'switch',
): string {
  const preferred = mode === 'light' ? '#ffffff' : '#101b18';
  const opposite = mode === 'light' ? '#101b18' : '#ffffff';

  if (contrastRatio(preferred, fillHex) >= target) {
    return fillHex;
  }
  if (strategy === 'switch' && contrastRatio(opposite, fillHex) >= target) {
    return fillHex;
  }
  return enforceContrast(fillHex, preferred, {
    target,
    direction: mode === 'light' ? 'darker' : 'lighter',
    maxShift: 0.4,
  });
}

/** Label colours to try for a fill, in order of preference for the mode. */
function inkCandidates(mode: ThemeMode): readonly string[] {
  return mode === 'light' ? ['#ffffff', '#101b18'] : ['#101b18', '#ffffff'];
}

/**
 * Picks the label colours for whatever fills the theme currently holds.
 *
 * Every path that can change a fill — generation, overrides, locking, or a
 * manual {@link setRoleColor} — goes through here, so a hand-picked white
 * primary always comes back with a dark label instead of a white one.
 */
function readableInkFor(
  roles: Readonly<Record<ThemeRole, ThemeRoleValue>>,
  mode: ThemeMode,
  target: number = DEFAULT_READABILITY.ink,
): Theme['readableInk'] {
  const ink = (fill: string) => pickReadableInk(fill, { target, candidates: inkCandidates(mode) });
  return {
    onPrimary: ink(roles.primary.hex),
    onAccent: ink(roles.accent.hex),
  };
}

/**
 * Turns extracted colours into a five-role website theme.
 *
 * The generator deliberately adjusts what it samples: a photo's colours are
 * rarely usable as background, ink or button fills as-is. Hue is preserved
 * while lightness and chroma are retuned, and text/ink colours are pushed until
 * they reach the requested contrast targets.
 *
 * ```ts
 * const palette = extractPalette(imageData, { count: 5 });
 * const theme = generateTheme(palette, { mode: 'light' });
 * ```
 */
export function generateTheme(
  palette: readonly SampledColor[],
  options: ThemeOptions = {},
): Theme {
  if (palette.length === 0) {
    throw new RangeError('generateTheme needs at least one sampled colour.');
  }

  const mode = options.mode ?? 'light';
  const seed = options.seed ?? 1;
  const variation = Math.max(0, Math.trunc(options.variation ?? 0));
  const readability = resolveReadability(options.readability);
  const lockedRoles = new Set(options.locked ?? []);
  const overrides = validateOverrides(options.overrides);
  const profile = variationProfile(variation, seed);
  const candidates = toCandidates(palette);

  // Background: the lightest (or darkest) colour, pulled into a usable range.
  const backgroundBase = pickByLightness(candidates, mode);
  const backgroundLightness =
    mode === 'light'
      ? clamp(backgroundBase.lab.l, 0.93, 0.985)
      : clamp(backgroundBase.lab.l, 0.13, 0.22);
  const backgroundHex = retune(backgroundBase.hex, {
    lightness: backgroundLightness,
    chroma: backgroundBase.chroma * profile.backgroundChroma,
  });

  // Surface: the same page, one step away, tinted towards the vivid colour.
  const tintSource = mixOklab(backgroundBase.hex, mostChromatic(candidates).hex, profile.tintMix);
  const surfaceLightness =
    mode === 'light'
      ? clamp(backgroundLightness - profile.surfaceDelta, 0.87, 0.95)
      : clamp(backgroundLightness + profile.surfaceDelta, 0.18, 0.3);
  const surfaceHex = retune(tintSource, {
    lightness: surfaceLightness,
    chroma: clamp(mostChromatic(candidates).chroma * 0.12, 0.005, 0.018),
  });

  // Text: keep the ink hue of the photo, then guarantee readability on both
  // the background and the surface.
  const inkSource = pickInk(candidates, mode);
  const textLightness =
    mode === 'light'
      ? profile.textLightness
      : clamp(1 - profile.textLightness + 0.63, 0.92, 0.97);
  let textHex = retune(inkSource.hex, {
    lightness: textLightness,
    chroma: Math.min(inkSource.chroma * profile.textChroma, 0.06),
  });
  const harderBackdrop =
    contrastRatio(textHex, backgroundHex) <= contrastRatio(textHex, surfaceHex)
      ? backgroundHex
      : surfaceHex;
  textHex = enforceContrast(textHex, harderBackdrop, {
    target: readability.text,
    direction: mode === 'light' ? 'darker' : 'lighter',
  });

  // Primary: the most usable vivid colour, held near a mid lightness.
  const primaryBase = pickVivid(candidates) ?? mostPopulous(candidates);
  const primaryLightness =
    mode === 'light'
      ? clamp(primaryBase.lab.l * 0.4 + profile.primaryLightness * 0.6, 0.44, 0.6)
      : clamp(primaryBase.lab.l * 0.3 + (profile.primaryLightness + 0.12) * 0.7, 0.52, 0.7);
  let primaryHex = retune(primaryBase.hex, {
    lightness: primaryLightness,
    chroma: clamp(primaryBase.chroma * profile.primaryChroma, 0.045, 0.17),
  });

  // Fills still have to read as fills: keep them clear of the page and surface.
  primaryHex = enforceFill(primaryHex, [backgroundHex, surfaceHex], readability.ui);
  primaryHex = adjustFillForInk(primaryHex, mode, readability.ink, 'adjust');

  // Accent: a second vivid colour, kept a clear hue step away from the primary.
  const accentBase =
    pickVivid(candidates, { avoidHue: primaryBase.hue, minHueDistance: 40 }) ?? primaryBase;
  const accentLightness =
    mode === 'light'
      ? clamp(accentBase.lab.l * 0.4 + profile.accentLightness * 0.6, 0.5, 0.72)
      : clamp(accentBase.lab.l * 0.3 + (profile.accentLightness + 0.06) * 0.7, 0.56, 0.76);
  let accentHex = retune(accentBase.hex, {
    lightness: accentLightness,
    chroma: clamp(accentBase.chroma * profile.accentChroma, 0.035, 0.15),
  });
  if (profile.accentHueShift !== 0) {
    accentHex = rotateOklabHue(accentHex, profile.accentHueShift);
  }
  accentHex = enforceFill(accentHex, [backgroundHex, surfaceHex], readability.ui);
  accentHex = adjustFillForInk(accentHex, mode, readability.ink, 'switch');

  const derived: Record<ThemeRole, { hex: string; source: ThemeRoleValue['source']; sampledIndex?: number }> = {
    background: { hex: backgroundHex, source: 'sampled', sampledIndex: backgroundBase.index },
    surface: { hex: surfaceHex, source: 'derived' },
    text: { hex: textHex, source: 'sampled', sampledIndex: inkSource.index },
    primary: { hex: primaryHex, source: 'sampled', sampledIndex: primaryBase.index },
    accent: { hex: accentHex, source: 'sampled', sampledIndex: accentBase.index },
  };

  const roles = Object.fromEntries(
    THEME_ROLES.map((role) => {
      const override = overrides[role];
      const locked = lockedRoles.has(role);
      if (override !== undefined) {
        return [role, themeRole(role, override, locked, 'user')];
      }
      const value = derived[role];
      return [
        role,
        themeRole(role, value.hex, locked, value.source, value.sampledIndex),
      ];
    }),
  ) as Record<ThemeRole, ThemeRoleValue>;

  return {
    mode,
    variation,
    roles,
    palette,
    // Labels are chosen from the fills that actually ship, so an override or a
    // locked value still gets a readable label.
    readableInk: readableInkFor(roles, mode, readability.ink),
  };
}

/** Regenerates a theme from its own palette, keeping locked roles untouched. */
export function regenerateTheme(theme: Theme, options: ThemeOptions = {}): Theme {
  const locked = options.locked ?? THEME_ROLES.filter((role) => theme.roles[role].locked);
  const frozen: Partial<Record<ThemeRole, string>> = {};
  for (const role of locked) {
    frozen[role] = theme.roles[role].hex;
  }

  return generateTheme(theme.palette, {
    ...options,
    mode: options.mode ?? theme.mode,
    variation: options.variation ?? theme.variation + 1,
    locked,
    overrides: { ...frozen, ...options.overrides },
  });
}

/** Generates the light and dark themes for one image. */
export function createThemeSet(
  palette: readonly SampledColor[],
  options: ThemeSetOptions = {},
): ThemeSet {
  const shared = {
    seed: options.seed,
    variation: options.variation,
    locked: options.locked,
    overrides: options.overrides,
    readability: options.readability,
  };
  return {
    palette,
    light: generateTheme(palette, { ...shared, mode: 'light' }),
    dark: generateTheme(palette, { ...shared, mode: 'dark' }),
  };
}

/**
 * Applies a manual colour to one role, marking it as user-authored.
 *
 * The dependent label colours are recalculated against the new fill, so
 * `setRoleColor(theme, 'primary', '#ffffff')` returns a dark label rather than
 * a white button with a white label. Labels use the default ink target; pass
 * `overrides` to {@link generateTheme} when a custom target is needed.
 */
export function setRoleColor(theme: Theme, role: ThemeRole, hex: string): Theme {
  if (!isHexColor(hex)) {
    throw new TypeError(`Not a hex colour: ${JSON.stringify(hex)}`);
  }
  const current = theme.roles[role];
  const roles = {
    ...theme.roles,
    [role]: { ...current, hex: normalizeHex(hex), source: 'user' as const },
  };
  return { ...theme, roles, readableInk: readableInkFor(roles, theme.mode) };
}

/** Locks or unlocks a role. Locked roles survive {@link regenerateTheme}. */
export function setRoleLocked(theme: Theme, role: ThemeRole, locked: boolean): Theme {
  const current = theme.roles[role];
  return {
    ...theme,
    roles: { ...theme.roles, [role]: { ...current, locked } },
  };
}

/** The five role colours as plain hex strings. */
export function themeColors(theme: Theme): Record<ThemeRole, string> {
  return Object.fromEntries(THEME_ROLES.map((role) => [role, theme.roles[role].hex])) as Record<
    ThemeRole,
    string
  >;
}

/**
 * Contrast pairs that matter for a page: body text, button labels and the
 * primary/accent fills against the page.
 */
export function checkThemeContrast(theme: Theme): ContrastCheck[] {
  const { background, surface, text, primary, accent } = themeColors(theme);
  return checkContrast([
    {
      id: 'text-on-background',
      label: 'Body text on background',
      foreground: text,
      background,
    },
    { id: 'text-on-surface', label: 'Body text on surface', foreground: text, background: surface },
    {
      id: 'ink-on-primary',
      label: 'Button label on primary',
      foreground: theme.readableInk.onPrimary,
      background: primary,
    },
    {
      id: 'ink-on-accent',
      label: 'Label on accent',
      foreground: theme.readableInk.onAccent,
      background: accent,
    },
    {
      id: 'primary-on-background',
      label: 'Primary fill on background',
      foreground: primary,
      background,
    },
    {
      id: 'accent-on-background',
      label: 'Accent fill on background',
      foreground: accent,
      background,
    },
  ]);
}

/**
 * True when every text pair in the theme clears the given target: body text on
 * the background and surface, and labels on the primary and accent fills.
 * Use {@link checkThemeContrast} for the fill-versus-page pairs as well.
 */
export function isThemeReadable(
  theme: Theme,
  readability: ReadabilityOptions = {},
): boolean {
  const targets = resolveReadability(readability);
  const bodyText = new Set(['text-on-background', 'text-on-surface']);
  const labels = new Set(['ink-on-primary', 'ink-on-accent']);
  return checkThemeContrast(theme).every((check) => {
    if (bodyText.has(check.id)) {
      return check.ratio >= targets.text;
    }
    return labels.has(check.id) ? check.ratio >= targets.ink : check.ratio >= targets.ui;
  });
}
