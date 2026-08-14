import { Pressable, Text } from "react-native";

import { Font } from "@/constants/theme";
import { TodoStatus } from "@/types/todo";

/**
 * The status marker — DESIGN.md §4.1.
 *
 * Brackets, not circles: this is what a markdown checklist looks like in a
 * terminal, and what the Neovim plugin renders. The glyph carries status and its
 * COLOR carries priority, so one marker encodes both axes and the separate
 * priority pills are unnecessary.
 *
 * `[-]` (cancelled) is reserved — TodoStatus has no cancelled state yet.
 */

const GLYPH: Record<TodoStatus, string> = {
  pending: "[ ]",
  in_progress: "[~]",
  done: "[x]",
};

/** Active beats priority: blue means "in progress" and must not be ambiguous. */
function colorClass(status: TodoStatus, priorities: string[] | null | undefined): string {
  if (status === "done") return "text-fg-faint";
  if (status === "in_progress") return "text-accent";
  if (priorities?.includes("important")) return "text-danger";
  if (priorities?.includes("urgent")) return "text-warn";
  return "text-fg-muted";
}

interface Props {
  status: TodoStatus;
  onPress: () => void;
  priorities?: string[] | null;
  /** Font size of the glyph. The cell scales with it. */
  size?: number;
}

export function StatusMarker({ status, onPress, priorities, size = 14 }: Props) {
  return (
    <Pressable
      hitSlop={12}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: status === "done" }}
      // A terminal highlights the cell; it does not fade. No opacity, no scale.
      className="rounded-sm active:bg-elevated">
      <Text
        style={{
          fontFamily: Font.monoMedium,
          fontSize: size,
          lineHeight: Math.round(size * 1.45),
          minWidth: Math.round(size * 1.95),
          textAlign: "center",
        }}
        className={colorClass(status, priorities)}>
        {GLYPH[status]}
      </Text>
    </Pressable>
  );
}
