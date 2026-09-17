import {
  generateTheme,
  type SampledColor,
  type ThemeMode,
  type ThemeRole,
  type ThemeSet,
} from 'hueframe';

export type Device = 'desktop' | 'mobile';
export type StudioStatus = 'empty' | 'extracting' | 'ready' | 'error';

/** How many colours we pull out of a photo. */
export const PALETTE_SIZE = 5;

/** Which fixed page the preview renders. */
export type TemplateId = 'guesthouse' | 'portfolio';

export interface TemplateOption {
  readonly id: TemplateId;
  readonly label: string;
  readonly blurb: string;
}

export const TEMPLATES: readonly TemplateOption[] = [
  { id: 'guesthouse', label: 'Guesthouse', blurb: 'A coastal hotel page.' },
  { id: 'portfolio', label: 'Portfolio', blurb: 'A personal designer page.' },
];

/** Light, dark, or whatever the operating system is set to. */
export type ModePreference = ThemeMode | 'system';

export const MODE_OPTIONS: readonly { id: ModePreference; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

/** Resolves the user's choice against the system preference. */
export function resolveMode(preference: ModePreference, systemMode: ThemeMode): ThemeMode {
  return preference === 'system' ? systemMode : preference;
}

export interface SourcePhoto {
  /** Blob URL for dropped files, or a public path for the bundled sample. */
  readonly url: string;
  readonly name: string;
  readonly isSample: boolean;
}

/** One of the bundled photos, ready to be used as a colour source. */
export interface SamplePhoto {
  readonly id: string;
  readonly url: string;
  readonly name: string;
  /** Short label for the picker. */
  readonly label: string;
}

/**
 * The photos the picker offers. Eight CC0 scenes with deliberately different
 * colour signatures — turquoise, gold, neon, green, sand, pink, ice, monochrome
 * — so the transformation can be shown without hunting for a file first.
 */
export const SAMPLE_PHOTOS: readonly SamplePhoto[] = [
  { id: 'coast', url: '/samples/source/coast.webp', name: 'coast.webp', label: 'Coast' },
  { id: 'sunset', url: '/samples/source/sunset.webp', name: 'sunset.webp', label: 'Sunset' },
  { id: 'forest', url: '/samples/source/forest.webp', name: 'forest.webp', label: 'Forest' },
  { id: 'neon', url: '/samples/source/neon.webp', name: 'neon.webp', label: 'Neon' },
  { id: 'desert', url: '/samples/source/desert.webp', name: 'desert.webp', label: 'Desert' },
  { id: 'blossom', url: '/samples/source/blossom.webp', name: 'blossom.webp', label: 'Blossom' },
  { id: 'alpine', url: '/samples/source/alpine.webp', name: 'alpine.webp', label: 'Alpine' },
  {
    id: 'monochrome',
    url: '/samples/source/monochrome.webp',
    name: 'monochrome.webp',
    label: 'Monochrome',
  },
];

/** The photo the playground opens with. */
export const OPENING_PHOTO: SamplePhoto = SAMPLE_PHOTOS[0];

/** Wraps a bundled sample as the studio's current source photo. */
export function sampleToPhoto(sample: SamplePhoto): SourcePhoto {
  return { url: sample.url, name: sample.name, isSample: true };
}

export interface ModeEdits {
  readonly overrides: Partial<Record<ThemeRole, string>>;
  readonly locked: readonly ThemeRole[];
}

export interface StudioState {
  readonly photo: SourcePhoto | null;
  readonly palette: readonly SampledColor[];
  readonly status: StudioStatus;
  readonly error: string | null;
  /** Light, dark, or system — what the preview should follow. */
  readonly modePreference: ModePreference;
  /** Which fixed page the preview renders. */
  readonly template: TemplateId;
  readonly device: Device;
  /** Increments every time the palette is re-derived into a new variation. */
  readonly variation: number;
  /** Locks and manual colours are per mode: light and dark are edited separately. */
  readonly edits: Record<ThemeMode, ModeEdits>;
}

/** Both modes of the current photo, shaped exactly like the package's ThemeSet. */
export type StudioThemes = ThemeSet;

export const emptyEdits: ModeEdits = { overrides: {}, locked: [] };

export function initialStudioState(withSample: boolean): StudioState {
  return {
    photo: withSample ? sampleToPhoto(OPENING_PHOTO) : null,
    palette: [],
    status: withSample ? 'extracting' : 'empty',
    error: null,
    modePreference: 'light',
    template: 'guesthouse',
    device: 'desktop',
    variation: 0,
    edits: { light: emptyEdits, dark: emptyEdits },
  };
}

/** Both themes for the current palette, variation, locks and manual colours. */
export function deriveThemes(state: StudioState): StudioThemes | null {
  if (state.palette.length === 0) {
    return null;
  }
  const palette = state.palette;
  const theme = (mode: ThemeMode) =>
    generateTheme(palette, {
      mode,
      variation: state.variation,
      locked: state.edits[mode].locked,
      overrides: state.edits[mode].overrides,
    });

  // Both modes are kept current even when one is on screen, so exporting a set
  // and toggling light/dark never re-derives anything differently.
  return { palette, light: theme('light'), dark: theme('dark') };
}

function withEdits(
  state: StudioState,
  mode: ThemeMode,
  edits: Partial<ModeEdits>,
): StudioState {
  return {
    ...state,
    edits: { ...state.edits, [mode]: { ...state.edits[mode], ...edits } },
  };
}

/** Stores a manual colour for one role in one mode. */
export function applyRoleColor(
  state: StudioState,
  mode: ThemeMode,
  role: ThemeRole,
  hex: string,
): StudioState {
  return withEdits(state, mode, {
    overrides: { ...state.edits[mode].overrides, [role]: hex },
  });
}

/** Pins a role so it survives the next variation. */
export function toggleRoleLock(
  state: StudioState,
  mode: ThemeMode,
  role: ThemeRole,
  locked: boolean,
): StudioState {
  const current = state.edits[mode].locked;
  const next = locked
    ? [...current.filter((entry) => entry !== role), role]
    : current.filter((entry) => entry !== role);
  return withEdits(state, mode, { locked: next });
}

/**
 * Moves to the next variation. Locked roles are frozen into explicit values so
 * they survive the re-derivation in both modes; every other manual colour is
 * dropped, so an unlocked edit is replaced by the new variation rather than
 * quietly sticking around.
 */
export function nextVariation(state: StudioState, themes: StudioThemes | null): StudioState {
  if (!themes) {
    return state;
  }
  const freeze = (mode: ThemeMode): ModeEdits => {
    const overrides: Partial<Record<ThemeRole, string>> = {};
    for (const role of state.edits[mode].locked) {
      overrides[role] = themes[mode].roles[role].hex;
    }
    return { overrides, locked: state.edits[mode].locked };
  };

  return {
    ...state,
    variation: state.variation + 1,
    edits: { light: freeze('light'), dark: freeze('dark') },
  };
}

/** Drops every manual colour and lock and returns to the first variation. */
export function resetEdits(state: StudioState): StudioState {
  return { ...state, variation: 0, edits: { light: emptyEdits, dark: emptyEdits } };
}

export function hasEdits(state: StudioState): boolean {
  return (['light', 'dark'] as const).some((mode) => {
    const edits = state.edits[mode];
    return edits.locked.length > 0 || Object.keys(edits.overrides).length > 0;
  });
}

/** Applies a freshly extracted palette to the studio state. */
export function withPalette(
  state: StudioState,
  photo: SourcePhoto,
  palette: readonly SampledColor[],
): StudioState {
  return {
    ...state,
    photo,
    palette,
    status: palette.length > 0 ? 'ready' : 'error',
    error: palette.length > 0 ? null : 'That image has no colours to sample.',
    variation: 0,
    edits: { light: emptyEdits, dark: emptyEdits },
  };
}
