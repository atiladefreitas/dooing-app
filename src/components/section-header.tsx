import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Springs } from "@/constants/motion";
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

/** The hairline draws itself in when the section first appears. */
function Rule({ section }: { section: SectionKey }) {
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = withTiming(1, {
      duration: 450,
      easing: Easing.out(Easing.cubic),
    });
  }, [grow]);

  const style = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ scaleX: grow.value }],
  }));

  return (
    <Animated.View style={style}>
      <View className={`h-px w-full ${RULE[section]}`} />
    </Animated.View>
  );
}

/**
 * The count ticks like an odometer digit: it rolls in from below when the
 * section gains a todo and from above when it loses one. Never fires on mount.
 */
function Count({ count, tone }: { count: number; tone: string }) {
  const roll = useSharedValue(0);
  const prev = useRef(count);

  useEffect(() => {
    if (prev.current === count) return;
    roll.value = prev.current < count ? 8 : -8;
    prev.current = count;
    roll.value = withSpring(0, Springs.stamp);
  }, [count, roll]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: roll.value }],
  }));

  return (
    <Animated.View style={style}>
      <Text
        style={Type.count}
        className={tone}>
        {count}
      </Text>
    </Animated.View>
  );
}

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
      <Rule section={section} />
      <Count
        count={count}
        tone={TONE[section]}
      />
    </View>
  );
}
