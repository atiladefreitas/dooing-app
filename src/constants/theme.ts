/**
 * Dooing design tokens — see DESIGN.md.
 *
 * Prefer `className` with the semantic Tailwind tokens (`bg-surface`, `text-fg-muted`)
 * for anything renderable. This module exists for the APIs that cannot take a
 * className: navigation header options, StatusBar, react-native-svg, and lucide
 * icon `color` props.
 *
 * The palette below MIRRORS the CSS variables in src/global.css.
 * Change one, change the other.
 */

import '@/global.css';

import { useColorScheme } from 'nativewind';

export const Palette = {
  day: {
    canvas: '#f5f5f8',
    surface: '#eceef4',
    elevated: '#ffffff',
    overlay: '#e6e8ef',

    fg: '#2a2c3d',
    fgDim: '#4a4d63',
    fgMuted: '#767b91',
    fgFaint: '#c8cbd9',

    line: '#c8cbd9',
    lineStrong: '#767b91',

    accent: '#3b5fc4',
    danger: '#b8395a',
    warn: '#8f6410',
    ok: '#4c7a28',

    hueCyan: '#1a6f8f',
    hueTeal: '#0f7a66',
    hueGreen: '#4c7a28',
    hueYellow: '#8f6410',
    hueOrange: '#b85c1e',
    hueMagenta: '#6a3fc4',
  },
  night: {
    canvas: '#1a1b26',
    surface: '#1f2030',
    elevated: '#24283b',
    overlay: '#16161e',

    fg: '#c0caf5',
    fgDim: '#a9b1d6',
    fgMuted: '#565f89',
    fgFaint: '#3b4261',

    line: '#3b4261',
    lineStrong: '#565f89',

    accent: '#7aa2f7',
    danger: '#f7768e',
    warn: '#e0af68',
    ok: '#9ece6a',

    hueCyan: '#7dcfff',
    hueTeal: '#1abc9c',
    hueGreen: '#9ece6a',
    hueYellow: '#e0af68',
    hueOrange: '#ff9e64',
    hueMagenta: '#bb9af7',
  },
} as const;

/** Widened to `string` — `as const` would otherwise pin each key to one theme's literal. */
export type ThemeColors = Record<keyof (typeof Palette)['night'], string>;
export type ThemeName = keyof typeof Palette;

/** Category hues, in `paletteForTag` order. Accent and danger are deliberately absent. */
export const CATEGORY_HUES = [
  'hueCyan',
  'hueGreen',
  'hueMagenta',
  'hueOrange',
  'hueTeal',
  'hueYellow',
] as const satisfies readonly (keyof ThemeColors)[];

/** The active theme's name. NativeWind reports undefined before it resolves; treat as light. */
export function useThemeName(): ThemeName {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? 'night' : 'day';
}

/** Resolved colors for the active scheme. */
export function useThemeColors(): ThemeColors {
  return Palette[useThemeName()];
}

// ── Type ────────────────────────────────────────────────────────────────────
// React Native picks weight from the family name, not `fontWeight`. Each weight
// is a separate loaded family — `font-mono font-bold` does NOT render bold.

export const Font = {
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
} as const;

const TABULAR = { fontVariant: ['tabular-nums' as const] };

/** The scale from DESIGN.md §1. Every numeral is tabular mono. */
export const Type = {
  /** `TODAY`, `OVERDUE`, `#dev` — uppercase, tracked out. */
  section: {
    fontFamily: Font.monoMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    textTransform: 'uppercase' as const,
  },
  /** Todo text. The human talking. */
  body: { fontFamily: Font.sans, fontSize: 15, lineHeight: 21 },
  /** Block titles. */
  bodyStrong: { fontFamily: Font.sansSemiBold, fontSize: 15, lineHeight: 21 },
  /** Tags, times, durations. The machine talking. */
  meta: { fontFamily: Font.mono, fontSize: 12, lineHeight: 16, ...TABULAR },
  /** `[ ]` `[~]` `[x]` — sits in a fixed-width cell, centered. */
  marker: { fontFamily: Font.monoMedium, fontSize: 14, lineHeight: 20 },
  /** Section counts, `3/7`. */
  count: { fontFamily: Font.monoMedium, fontSize: 12, lineHeight: 16, ...TABULAR },
  /** Status line. */
  status: { fontFamily: Font.mono, fontSize: 11, lineHeight: 14, ...TABULAR },
} as const;

// ── Layout ──────────────────────────────────────────────────────────────────
/** DESIGN.md §3 — comfortable density. Tap targets reach 44pt via hitSlop, not padding. */

const MARKER_SIZE = 14;
/** Mirrors StatusMarker's cell width so tree lines can hit the glyph's centre. */
const MARKER_CELL = Math.round(MARKER_SIZE * 1.95);
const MARKER_LINE_HEIGHT = Math.round(MARKER_SIZE * 1.45);

export const Layout = {
  markerSize: MARKER_SIZE,
  markerCell: MARKER_CELL,
  rowPaddingY: 10,
  rowGap: 6,
  sectionGap: 28,
  metaGap: 10,
  screenPadX: 16,

  /**
   * Tree geometry — see DESIGN.md §4.3.
   *
   * `treeLineX` MUST be half the marker cell: a child's vertical line then lands
   * exactly on the centre of its parent's marker at every depth, because a row's
   * marker starts at `treeColumn * depth` and its centre is that plus half a cell.
   * Change the marker size and these follow, or the tree stops lining up.
   */
  treeColumn: 22,
  treeLineX: Math.round(MARKER_CELL / 2),
  /** Y of the marker's centreline within a row — where the connector joins. */
  treeConnectY: 10 + Math.round(MARKER_LINE_HEIGHT / 2),
  /**
   * Y a parent's descender starts: just under its own marker, so the line
   * emerges from beneath the glyph instead of striking through it.
   */
  treeDescendY: 10 + MARKER_LINE_HEIGHT,
} as const;
