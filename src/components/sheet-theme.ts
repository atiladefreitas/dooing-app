import { useThemeColors } from '@/constants/theme';

/**
 * Themed pieces for the bottom sheets.
 *
 * `StyleSheet.create` runs once at module load and so cannot see the active
 * theme. Sheets keep their static metrics in a StyleSheet and merge these colour
 * fragments in at render, rather than rebuilding whole style objects per theme.
 */
export function useSheetTheme() {
  const c = useThemeColors();
  return {
    /** Sheet surface — one step up from the screen behind it. */
    background: { backgroundColor: c.surface },
    handle: { backgroundColor: c.fgFaint, width: 40 },
    /** Inputs sit *below* the sheet surface so they read as wells. */
    input: { backgroundColor: c.canvas, color: c.fg },
    placeholder: c.fgMuted,
    invalid: { borderWidth: 1, borderColor: c.danger },
  };
}
