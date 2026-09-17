/** An sRGB colour with 8-bit channels. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** HSL with hue in degrees (0-360) and saturation/lightness in 0-1. */
export interface Hsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

/**
 * Oklab coordinates. `l` is perceptual lightness (0-1), `a`/`b` are the
 * green-red and blue-yellow axes.
 */
export interface Oklab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

/** A colour that means the same thing in light and dark mode. */
export type ThemeRole = 'background' | 'surface' | 'text' | 'primary' | 'accent';

/** Every role a theme has, in the order a UI should present them. */
export const THEME_ROLES: readonly ThemeRole[] = [
  'background',
  'surface',
  'text',
  'primary',
  'accent',
];

export type ThemeMode = 'light' | 'dark';

/** Where a role's current value came from. */
export type ColorSource = 'sampled' | 'derived' | 'user';

/** One colour pulled out of the source image, with its share of the pixels. */
export interface SampledColor {
  readonly hex: string;
  readonly rgb: Rgb;
  /** Share of sampled pixels this colour covers, 0-1. All populations sum to 1. */
  readonly population: number;
}

/** One role inside a generated theme. */
export interface ThemeRoleValue {
  readonly role: ThemeRole;
  readonly hex: string;
  readonly source: ColorSource;
  /** Locked roles survive {@link regenerateTheme} and variation changes. */
  readonly locked: boolean;
  /** Index into {@link Theme.palette} when this value came from a sampled colour. */
  readonly sampledIndex?: number;
}

/** A ready-to-use palette: five roles, the samples behind them, and readable fills. */
export interface Theme {
  readonly mode: ThemeMode;
  /** Which variation produced the current values. See {@link ThemeOptions.variation}. */
  readonly variation: number;
  readonly roles: Readonly<Record<ThemeRole, ThemeRoleValue>>;
  /** The extracted colours this theme was generated from. */
  readonly palette: readonly SampledColor[];
  /** Foreground colours that stay readable on the primary and accent fills. */
  readonly readableInk: {
    readonly onPrimary: string;
    readonly onAccent: string;
  };
}

/** A light and a dark theme generated from the same image. */
export interface ThemeSet {
  readonly palette: readonly SampledColor[];
  readonly light: Theme;
  readonly dark: Theme;
}

/** Contrast targets used while generating and checking a theme. */
export interface ReadabilityOptions {
  /** Minimum ratio for body text on background/surface. Defaults to 7. */
  readonly text?: number;
  /** Minimum ratio for labels sitting on the primary/accent fills. Defaults to 4.5. */
  readonly ink?: number;
  /** Minimum ratio for large text and non-text UI. Defaults to 3. */
  readonly ui?: number;
}

/** Everything that shapes a generated theme. */
export interface ThemeOptions {
  readonly mode?: ThemeMode;
  /**
   * Which variation to generate. Every value is deterministic, so the same
   * palette and variation always produce the same theme.
   */
  readonly variation?: number;
  /** Seed for the colour search. Defaults to 1. */
  readonly seed?: number;
  /** Roles to keep exactly as they are in the palette-independent sense. */
  readonly locked?: readonly ThemeRole[];
  /** Explicit colours for specific roles. Wins over everything else. */
  readonly overrides?: Partial<Record<ThemeRole, string>>;
  readonly readability?: ReadabilityOptions;
}

/** Options for {@link createThemeSet}; light and dark share locks and overrides. */
export interface ThemeSetOptions {
  readonly seed?: number;
  readonly variation?: number;
  readonly locked?: readonly ThemeRole[];
  readonly overrides?: Partial<Record<ThemeRole, string>>;
  readonly readability?: ReadabilityOptions;
}

/** The outcome of one contrast pair. */
export interface ContrastCheck {
  readonly id: string;
  readonly label: string;
  readonly foreground: string;
  readonly background: string;
  /** WCAG 2.1 contrast ratio, 1-21. */
  readonly ratio: number;
  /** Meets AA for body text (4.5:1). */
  readonly aa: boolean;
  /** Meets AAA for body text (7:1). */
  readonly aaa: boolean;
  /** Meets AA for large text (3:1). */
  readonly aaLarge: boolean;
}
