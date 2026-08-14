import { Text, View } from "react-native";

import { Layout, Type } from "@/constants/theme";
import { SECTION_LABEL, SectionKey } from "@/lib/sections";

/**
 * Section rule — DESIGN.md §4.4, mirroring the plugin's modern style:
 *
 *   IN PROGRESS ──────────────────────── 3
 *
 * The rule runs INLINE between the label and the count, as in the terminal. It
 * is a flex hairline rather than repeated `─` glyphs, so it fills exactly on any
 * width without measuring characters.
 *
 * Tone reuses the marker's colour language: in-progress is accent (same blue as
 * `[~]`), done is faint (same as `[x]`).
 */
const TONE: Record<SectionKey, string> = {
  in_progress: "text-accent",
  pending: "text-fg-muted",
  done: "text-fg-faint",
};

const RULE: Record<SectionKey, string> = {
  in_progress: "bg-accent/30",
  pending: "bg-line",
  done: "bg-line/50",
};

export function SectionHeader({
  section,
  count,
  first,
}: {
  section: SectionKey;
  count: number;
  first: boolean;
}) {
  return (
    <View
      className="flex-row items-center gap-2"
      style={{ marginTop: first ? 0 : Layout.sectionGap, marginBottom: 4 }}>
      <Text
        style={Type.section}
        className={TONE[section]}>
        {SECTION_LABEL[section]}
      </Text>
      <View className={`h-px flex-1 ${RULE[section]}`} />
      <Text
        style={Type.count}
        className={TONE[section]}>
        {count}
      </Text>
    </View>
  );
}
