import { Text, View } from "react-native";

import { Layout, Type } from "@/constants/theme";
import { SECTION_LABEL, SectionKey } from "@/lib/sections";

/**
 * Section rule — DESIGN.md §4.4. Uppercase mono label, tabular count hard-right,
 * hairline underneath. OVERDUE renders hot; everything else is quiet.
 */
export function SectionHeader({
  section,
  done,
  total,
  first,
}: {
  section: SectionKey;
  done: number;
  total: number;
  first: boolean;
}) {
  const overdue = section === "overdue";
  const tone = overdue ? "text-danger" : "text-fg-muted";

  return (
    <View style={{ marginTop: first ? 0 : Layout.sectionGap, marginBottom: 4 }}>
      <View className="flex-row justify-between items-baseline">
        <Text
          style={Type.section}
          className={tone}>
          {SECTION_LABEL[section]}
        </Text>
        <Text
          style={Type.count}
          className={tone}>
          {/* Overdue todos are never done, so a done/total ratio there is noise. */}
          {overdue ? total : `${done}/${total}`}
        </Text>
      </View>
      <View
        className={overdue ? "border-t border-danger/40" : "border-t border-line"}
        style={{ marginTop: 6 }}
      />
    </View>
  );
}
