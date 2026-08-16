import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Springs } from "@/constants/motion";
import { Layout, ThemeColors, Type, useThemeColors } from "@/constants/theme";
import { daysBetween, formatMinutes, shortDateLabel, todayKey, weekdayShort } from "@/lib/date";
import { categoryColor } from "@/lib/palette";
import { ScheduledAt } from "@/lib/schedule";
import { extractTags, getStatus, stripTags } from "@/lib/todo";
import { Todo } from "@/types/todo";

import { StatusMarker } from "./status-marker";

function scheduleLabel({ block, date }: ScheduledAt): string {
  const today = todayKey();
  const time = formatMinutes(block.start_min);
  if (date === today) return `Today ${time}`;
  const ahead = daysBetween(today, date);
  if (ahead === 1) return `Tomorrow ${time}`;
  if (ahead > 1 && ahead < 7) return `${weekdayShort(date)} ${time}`;
  return `${shortDateLabel(date)} ${time}`;
}

function isOverdue(dueSeconds: number): boolean {
  return dueSeconds * 1000 < Date.now();
}

function dueLabel(dueSeconds: number): string {
  return new Date(dueSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Tree guides — DESIGN.md §4.3.
 *
 * Drawn as geometry, NOT as `│`/`├─` text glyphs. A glyph only exists on its own
 * text line, so the line would break across each row's vertical padding and the
 * subtree would read as detached from its parent. These Views stretch the full
 * row height, so the vertical runs unbroken from one row into the next.
 */
function TreeGuides({ guides, color }: { guides: boolean[]; color: string }) {
  if (!guides.length) return null;

  return (
    <View className="flex-row self-stretch">
      {guides.map((hasNext, i) => {
        const isConnector = i === guides.length - 1;
        // Ancestors only draw a line while their subtree continues below.
        const showVertical = isConnector || hasNext;
        // The connector stops at the marker's centreline unless siblings follow.
        const stopsAtConnect = isConnector && !hasNext;

        return (
          <View
            key={i}
            style={{ width: Layout.treeColumn }}
            className="self-stretch">
            {showVertical ? (
              <View
                style={{
                  position: "absolute",
                  left: Layout.treeLineX,
                  top: 0,
                  width: 1,
                  backgroundColor: color,
                  ...(stopsAtConnect ? { height: Layout.treeConnectY } : { bottom: 0 }),
                }}
              />
            ) : null}

            {isConnector ? (
              <View
                style={{
                  position: "absolute",
                  left: Layout.treeLineX,
                  top: Layout.treeConnectY,
                  width: Layout.treeColumn - Layout.treeLineX,
                  height: 1,
                  backgroundColor: color,
                }}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Collapse toggle with a rotating chevron: one `▸` glyph that springs through
 * 90° instead of swapping to `▾`, so expanding a subtree reads as the arrow
 * physically turning to point at the children.
 */
function CollapseToggle({
  collapsed,
  count,
  onPress,
}: {
  collapsed: boolean;
  count: number;
  onPress?: () => void;
}) {
  // Initialized to the current state and animated only on CHANGE, so rows
  // mounting during a scroll never twirl their chevrons.
  const turn = useSharedValue(collapsed ? 0 : 1);
  const prevCollapsed = useRef(collapsed);

  useEffect(() => {
    if (prevCollapsed.current === collapsed) return;
    prevCollapsed.current = collapsed;
    turn.value = withSpring(collapsed ? 0 : 1, Springs.stamp);
  }, [collapsed, turn]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 90}deg` }],
  }));

  return (
    <Pressable
      hitSlop={10}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={collapsed ? "Expand subtasks" : "Collapse subtasks"}
      className="flex-row items-center rounded-sm active:bg-elevated">
      <Animated.View style={chevronStyle}>
        <Text
          style={Type.meta}
          className="text-fg-muted">
          ▸
        </Text>
      </Animated.View>
      <Text
        style={Type.meta}
        className="text-fg-muted">
        {" "}
        {count}
      </Text>
    </Pressable>
  );
}

/** One `#tag` chip on the meta line, in its own category hue. */
function Tag({ tag, colors }: { tag: string; colors: ThemeColors }) {
  const hue = categoryColor(tag, colors);
  return (
    <Text
      style={[Type.meta, hue ? { color: hue } : undefined]}
      className={hue ? undefined : "text-fg-muted"}>
      #{tag}
    </Text>
  );
}

interface Props {
  todo: Todo;
  onToggle: () => void;
  onLongPress?: () => void;
  /** Ancestor sibling flags from `rowsForDisplay`. Empty for roots. */
  guides?: boolean[];
  childCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  scheduled?: ScheduledAt;
  onPressScheduled?: () => void;
}

export function TodoItem({
  todo,
  onToggle,
  onLongPress,
  guides = [],
  childCount = 0,
  collapsed = false,
  onToggleCollapse,
  scheduled,
  onPressScheduled,
}: Props) {
  const colors = useThemeColors();
  const status = getStatus(todo);

  // The meta line eases to its dimmed state instead of snapping, so completing
  // a todo reads as the row settling rather than flickering. Starts at the
  // current state and animates only on CHANGE — never on scroll-in.
  const metaOpacity = useSharedValue(todo.done ? 0.4 : 1);
  const prevDone = useRef(todo.done);

  useEffect(() => {
    if (prevDone.current === todo.done) return;
    prevDone.current = todo.done;
    metaOpacity.value = withTiming(todo.done ? 0.4 : 1, { duration: 220 });
  }, [todo.done, metaOpacity]);

  const metaFade = useAnimatedStyle(() => ({
    opacity: metaOpacity.value,
  }));

  // Tags are lifted out of the title and rendered on the meta line beneath it.
  // A todo that is *only* tags keeps them as its title instead, so they are not
  // printed twice.
  const stripped = stripTags(todo.text);
  const title = stripped || todo.text.trim();
  const tags = stripped ? extractTags(todo.text) : [];

  const overdue = todo.due_at != null && !todo.done && isOverdue(todo.due_at);
  const hasMeta =
    tags.length > 0 || todo.due_at != null || todo.estimated_hours != null || scheduled != null;

  return (
    // Vertical padding lives on the inner columns, not here: the guides must
    // stretch the full row height for the tree line to stay continuous.
    <Pressable
      onPress={onToggle}
      onLongPress={onLongPress}
      delayLongPress={300}
      className="flex-row items-stretch active:bg-elevated">
      <TreeGuides
        guides={guides}
        color={colors.fgFaint}
      />

      {/*
        Descender into this row's own subtree. Without it the tree line would
        only start at the first child's row, leaving the parent visually detached
        from the children it owns.
      */}
      {childCount > 0 && !collapsed ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: Layout.treeColumn * guides.length + Layout.treeLineX,
            top: Layout.treeDescendY,
            bottom: 0,
            width: 1,
            backgroundColor: colors.fgFaint,
          }}
        />
      ) : null}

      <View
        className="self-start"
        style={{ paddingVertical: Layout.rowPaddingY }}>
        <StatusMarker
          status={status}
          priorities={todo.priorities}
          onPress={onToggle}
          size={Layout.markerSize}
        />
      </View>

      <View
        className="flex-1 self-start"
        style={{
          gap: Layout.rowGap,
          marginLeft: 6,
          paddingVertical: Layout.rowPaddingY,
        }}>
        <View className="flex-row gap-2 items-start">
          <View className="flex-1">
            <Text
              style={Type.body}
              className={todo.done ? "text-fg-faint line-through" : "text-fg"}>
              {title}
            </Text>
          </View>

          {childCount > 0 ? (
            <CollapseToggle
              collapsed={collapsed}
              count={childCount}
              onPress={onToggleCollapse}
            />
          ) : null}
        </View>

        {hasMeta ? (
          <Animated.View style={metaFade}>
            <View
              className="flex-row flex-wrap items-center"
              style={{ gap: Layout.metaGap }}>
              {tags.map((tag) => (
                <Tag
                  key={tag}
                  tag={tag}
                  colors={colors}
                />
              ))}

              {todo.estimated_hours != null ? (
                <Text
                  style={Type.meta}
                  className="text-ok">
                  {todo.estimated_hours}h
                </Text>
              ) : null}

              {todo.due_at != null ? (
                <Text
                  style={Type.meta}
                  className={overdue ? "text-danger" : "text-fg-muted"}>
                  {overdue ? "OVERDUE" : dueLabel(todo.due_at)}
                </Text>
              ) : null}

              {scheduled ? (
                <Pressable
                  hitSlop={8}
                  onPress={onPressScheduled}
                  accessibilityRole="button"
                  accessibilityLabel={`Scheduled ${scheduleLabel(scheduled)}`}
                  className="rounded-sm active:bg-elevated">
                  <Text
                    style={Type.meta}
                    className="text-accent">
                    {scheduleLabel(scheduled)}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Pressable>
  );
}
