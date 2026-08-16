import { useEffect, useRef } from "react";
import { Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { Springs } from "@/constants/motion";
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

/**
 * Bracket-free form for dense surfaces — inside a calendar block a 3-character
 * cell eats width the block does not have, and the brackets crowd the title.
 * The block's own bar and fill already provide the container the brackets would.
 */
const GLYPH_COMPACT: Record<TodoStatus, string> = {
  pending: "·",
  in_progress: "▸",
  done: "✓",
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
  /** Drop the brackets for tight surfaces like calendar blocks. */
  compact?: boolean;
}

export function StatusMarker({ status, onPress, priorities, size = 14, compact = false }: Props) {
  // The new glyph "stamps" in: it eases up from small and settles with no
  // overshoot. Runs only on status CHANGE, never on mount, so scrolling a
  // list never triggers it.
  const stamp = useSharedValue(1);
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current === status) return;
    prevStatus.current = status;
    stamp.value = 0.5;
    stamp.value = withSpring(1, Springs.stamp);
  }, [status, stamp]);

  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stamp.value }],
  }));

  return (
    <Pressable
      hitSlop={12}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: status === "done" }}
      // A terminal highlights the cell; it does not fade. No opacity, no scale.
      className="rounded-sm active:bg-elevated">
      <Animated.View style={stampStyle}>
        <Text
          style={{
            fontFamily: Font.monoMedium,
            fontSize: size,
            lineHeight: Math.round(size * 1.45),
            minWidth: Math.round(size * (compact ? 0.9 : 1.95)),
            textAlign: "center",
          }}
          className={colorClass(status, priorities)}>
          {(compact ? GLYPH_COMPACT : GLYPH)[status]}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
