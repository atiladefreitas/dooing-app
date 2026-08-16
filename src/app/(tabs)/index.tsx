import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddTodoSheet, AddTodoSheetRef } from "@/components/add-todo-sheet";
import { Fab } from "@/components/fab";
import { SectionHeader } from "@/components/section-header";
import { TodoActionsSheet, TodoActionsSheetRef } from "@/components/todo-actions-sheet";
import { TodoItem } from "@/components/todo-item";
import { rowGlide, rowIn, rowOut } from "@/constants/motion";
import { Type } from "@/constants/theme";
import { todayKey } from "@/lib/date";
import { scheduleMap } from "@/lib/schedule";
import { buildSections, toListItems } from "@/lib/sections";
import { rowsForDisplay } from "@/lib/todo";
import { useBlocks } from "@/store/blocks";
import { useTodos } from "@/store/todos";

const TILDE_LINE = 20;

/**
 * The `~` filler of an empty vim buffer — DESIGN.md §4.7.
 *
 * Height comes from flex, never from the tildes themselves, so measuring it
 * cannot feed back into the content size and oscillate.
 *
 * The tildes cascade in top-to-bottom like a terminal painting its rows.
 */
function TildeFill() {
  const [height, setHeight] = useState(0);
  const count = Math.max(0, Math.floor(height / TILDE_LINE));

  return (
    <View
      className="flex-1 overflow-hidden"
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(i * 14).duration(150)}>
          <Text
            style={{ ...Type.meta, lineHeight: TILDE_LINE }}
            className="text-fg-faint">
            ~
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

/** Empty list: tildes, then a vim-style file message. */
function EmptyState() {
  return (
    <View className="flex-1">
      <TildeFill />
      <View className="border-t border-line" />
      <Animated.View entering={FadeIn.delay(250).duration(200)}>
        <Text
          style={Type.status}
          className="pt-2 text-fg-muted">
          &quot;todos&quot; — empty · add one, or scan a QR to import
        </Text>
      </Animated.View>
    </View>
  );
}

export default function HomeScreen() {
  const todos = useTodos((s) => s.todos);
  const toggle = useTodos((s) => s.toggleStatus);
  const collapsedMap = useTodos((s) => s.collapsed);
  const toggleCollapsed = useTodos((s) => s.toggleCollapsed);
  const blocks = useBlocks((s) => s.blocks);
  const links = useBlocks((s) => s.links);
  const sheetRef = useRef<AddTodoSheetRef>(null);
  const actionsRef = useRef<TodoActionsSheetRef>(null);

  const collapsedSet = useMemo(
    () => new Set(Object.keys(collapsedMap).filter((id) => collapsedMap[id])),
    [collapsedMap],
  );
  const scheduled = useMemo(
    () => scheduleMap(todos, blocks, links, todayKey()),
    [blocks, links, todos],
  );

  // rowsForDisplay carries tree-guide ancestry and child counts, so the screen no
  // longer needs its own child-count pass.
  const data = useMemo(
    () => toListItems(buildSections(rowsForDisplay(todos, collapsedSet))),
    [todos, collapsedSet],
  );

  // A lone TODAY header with nothing under it is the empty state, not content.
  const isEmpty = todos.length === 0;

  return (
    <SafeAreaView
      edges={["bottom"]}
      className="flex-1 bg-canvas">
      <Animated.FlatList
        data={isEmpty ? [] : data}
        keyExtractor={(item) =>
          item.kind === "section" ? `section:${item.key}` : item.row.todo.id
        }
        // Toggling a todo re-sorts it into another section; stable keys mean the
        // row GLIDES to its new slot instead of teleporting. New/removed rows
        // (added todo, collapsed subtree, emptied section) fade in/out.
        itemLayoutAnimation={rowGlide}
        renderItem={({ item }) => (
          <Animated.View
            entering={rowIn}
            exiting={rowOut}>
            {item.kind === "section" ? (
              <SectionHeader
                section={item.key}
                count={item.count}
                first={item.first}
              />
            ) : (
              <TodoItem
                todo={item.row.todo}
                onToggle={() => toggle(item.row.todo.id)}
                onLongPress={() =>
                  actionsRef.current?.present({
                    id: item.row.todo.id,
                    text: item.row.todo.text,
                  })
                }
                guides={item.row.guides}
                childCount={item.row.childCount}
                collapsed={collapsedSet.has(item.row.todo.id)}
                onToggleCollapse={() => toggleCollapsed(item.row.todo.id)}
                scheduled={scheduled[item.row.todo.id]}
                onPressScheduled={() =>
                  router.push({
                    pathname: "/calendar",
                    params: { date: scheduled[item.row.todo.id]?.date },
                  })
                }
              />
            )}
          </Animated.View>
        )}
        ListEmptyComponent={EmptyState}
        // No row gap: the tree guides draw a continuous vertical line from a
        // parent into its subtree, and any gap would break it.
        contentContainerStyle={{ padding: 16, paddingBottom: 96, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      />

      <Fab
        onPress={() => sheetRef.current?.present()}
        accessibilityLabel="Add task"
        style={{ right: 24, bottom: 32 }}
      />

      <AddTodoSheet ref={sheetRef} />
      <TodoActionsSheet
        ref={actionsRef}
        onAddSubtask={(target) => sheetRef.current?.present(target)}
      />
    </SafeAreaView>
  );
}
