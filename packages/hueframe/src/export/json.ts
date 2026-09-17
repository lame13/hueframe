import { checkThemeContrast, themeColors } from '../theme/generate.js';
import { THEME_ROLES, type Theme, type ThemeMode, type ThemeRole, type ThemeSet } from '../types.js';

const ROLE_DESCRIPTIONS: Record<ThemeRole, string> = {
  background: 'Page background',
  surface: 'Raised surface and section fill',
  text: 'Body text and headings',
  primary: 'Primary action fill',
  accent: 'Secondary accent',
};

export interface JsonTokenOptions {
  /** Include the sampled palette. Defaults to true. */
  readonly includePalette?: boolean;
  /** Include contrast results. Defaults to true. */
  readonly includeContrast?: boolean;
  /** Pretty-print the string output. Defaults to true. */
  readonly pretty?: boolean;
  /** Number of spaces used when pretty-printing. Defaults to 2. */
  readonly indent?: number;
}

export interface ColorToken {
  readonly $type: 'color';
  readonly $value: string;
  readonly $description: string;
}

export interface PaletteToken extends ColorToken {
  /** Share of the source image covered by this colour, 0-1. */
  readonly $extensions: {
    readonly 'dev.hueframe': { readonly population: number };
  };
}

export interface ContrastToken {
  readonly foreground: string;
  readonly background: string;
  readonly ratio: number;
  readonly aa: boolean;
  readonly aaa: boolean;
}

/** Design-token document for one theme, following the DTCG shape. */
export interface ThemeTokens {
  readonly $description: string;
  readonly mode: ThemeMode;
  readonly variation: number;
  readonly color: Record<string, ColorToken>;
  readonly palette?: PaletteToken[];
  readonly contrast?: Record<string, ContrastToken>;
}

/** One theme as a design-token document. */
export function exportJsonTokens(theme: Theme, options: JsonTokenOptions = {}): ThemeTokens {
  const colors = themeColors(theme);
  const color: Record<string, ColorToken> = {};

  for (const role of THEME_ROLES) {
    color[role] = {
      $type: 'color',
      $value: colors[role],
      $description: ROLE_DESCRIPTIONS[role],
    };
  }
  color['on-primary'] = {
    $type: 'color',
    $value: theme.readableInk.onPrimary,
    $description: 'Text and icons on the primary fill',
  };
  color['on-accent'] = {
    $type: 'color',
    $value: theme.readableInk.onAccent,
    $description: 'Text and icons on the accent fill',
  };

  const paletteTokens: PaletteToken[] | undefined =
    (options.includePalette ?? true)
      ? theme.palette.map((sample) => ({
      $type: 'color' as const,
      $value: sample.hex,
      $description: `${Math.round(sample.population * 1000) / 10}% of the sampled pixels`,
      $extensions: { 'dev.hueframe': { population: sample.population } },
    }))
      : undefined;

  const contrastTokens: Record<string, ContrastToken> | undefined =
    (options.includeContrast ?? true)
      ? Object.fromEntries(
          checkThemeContrast(theme).map((check) => [
            check.id,
            {
              foreground: check.foreground,
              background: check.background,
              ratio: check.ratio,
              aa: check.aa,
              aaa: check.aaa,
            },
          ]),
        )
      : undefined;

  return {
    $description: `hueframe ${theme.mode} theme generated from ${theme.palette.length} sampled colours`,
    mode: theme.mode,
    variation: theme.variation,
    color,
    ...(paletteTokens ? { palette: paletteTokens } : {}),
    ...(contrastTokens ? { contrast: contrastTokens } : {}),
  };
}

/** The design-token document serialised to JSON. */
export function exportJsonTokensString(theme: Theme, options: JsonTokenOptions = {}): string {
  const { pretty = true, indent = 2 } = options;
  const tokens = exportJsonTokens(theme, options);
  return JSON.stringify(tokens, null, pretty ? indent : undefined);
}

/** Both themes of a set as design-token documents. */
export function exportThemeSetJson(
  set: ThemeSet,
  options: JsonTokenOptions = {},
): { readonly light: ThemeTokens; readonly dark: ThemeTokens } {
  return {
    light: exportJsonTokens(set.light, options),
    dark: exportJsonTokens(set.dark, options),
  };
}
