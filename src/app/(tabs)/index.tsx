import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddTodoSheet, AddTodoSheetRef } from "@/components/add-todo-sheet";
import { SectionHeader } from "@/components/section-header";
import { TodoActionsSheet, TodoActionsSheetRef } from "@/components/todo-actions-sheet";
import { TodoItem } from "@/components/todo-item";
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
 */
function TildeFill() {
  const [height, setHeight] = useState(0);
  const count = Math.max(0, Math.floor(height / TILDE_LINE));

  return (
    <View
      className="flex-1 overflow-hidden"
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {Array.from({ length: count }, (_, i) => (
        <Text
          key={i}
          style={{ ...Type.meta, lineHeight: TILDE_LINE }}
          className="text-fg-faint">
          ~
        </Text>
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
      <Text
        style={Type.status}
        className="pt-2 text-fg-muted">
        &quot;todos&quot; — empty, scan a QR to import
      </Text>
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
  const data = useMemo(() => {
    const rows = rowsForDisplay(todos, collapsedSet);
    return toListItems(buildSections(rows, todos, scheduled, todayKey()));
  }, [todos, collapsedSet, scheduled]);

  // A lone TODAY header with nothing under it is the empty state, not content.
  const isEmpty = todos.length === 0;

  return (
    <SafeAreaView
      edges={["bottom"]}
      className="flex-1 bg-canvas">
      <FlatList
        data={isEmpty ? [] : data}
        keyExtractor={(item) =>
          item.kind === "section" ? `section:${item.key}` : item.row.todo.id
        }
        renderItem={({ item }) =>
          item.kind === "section" ? (
            <SectionHeader
              section={item.key}
              done={item.done}
              total={item.total}
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
          )
        }
        ListEmptyComponent={EmptyState}
        // No row gap: the tree guides draw a continuous vertical line from a
        // parent into its subtree, and any gap would break it.
        contentContainerStyle={{ padding: 16, paddingBottom: 96, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      />

      <Pressable
        onPress={() => sheetRef.current?.present()}
        accessibilityLabel="Add task"
        style={{ elevation: 8 }}
        className="absolute right-6 bottom-8 justify-center items-center w-14 h-14 rounded-full bg-accent active:opacity-80">
        {/* text-canvas = the app background colour, which contrasts against the
            accent in BOTH themes; a literal white only works in light mode. */}
        <Text
          style={{ ...Type.body, fontSize: 24, lineHeight: 28 }}
          className="text-canvas">
          +
        </Text>
      </Pressable>

      <AddTodoSheet ref={sheetRef} />
      <TodoActionsSheet
        ref={actionsRef}
        onAddSubtask={(target) => sheetRef.current?.present(target)}
      />
    </SafeAreaView>
  );
}
