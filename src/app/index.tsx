import { router, Stack } from "expo-router";
import { useMemo, useRef } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AddTodoSheet, AddTodoSheetRef } from "@/components/add-todo-sheet";
import { TodoActionsSheet, TodoActionsSheetRef } from "@/components/todo-actions-sheet";
import { TodoItem } from "@/components/todo-item";
import { orderForDisplay } from "@/lib/todo";
import { useTodos } from "@/store/todos";

function HeaderButtons() {
  return (
    <View className="flex-row gap-5 items-center">
      <Pressable
        onPress={() => router.push("/scan")}
        hitSlop={8}>
        <Text className="text-base text-blue-400">Scan</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push("/settings")}
        hitSlop={8}>
        <Text className="text-xl text-blue-400">⚙</Text>
      </Pressable>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 gap-2 justify-center items-center py-24">
      <Text className="text-lg text-neutral-300">No todos yet</Text>
      <Text className="text-sm text-center text-neutral-500">
        Tap the + button to add one, or Scan to import from Neovim.
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const todos = useTodos((s) => s.todos);
  const toggle = useTodos((s) => s.toggleStatus);
  const collapsedMap = useTodos((s) => s.collapsed);
  const toggleCollapsed = useTodos((s) => s.toggleCollapsed);
  const sheetRef = useRef<AddTodoSheetRef>(null);
  const actionsRef = useRef<TodoActionsSheetRef>(null);

  const collapsedSet = useMemo(
    () => new Set(Object.keys(collapsedMap).filter((id) => collapsedMap[id])),
    [collapsedMap],
  );
  const childCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of todos) {
      if (t.parent_id) counts[t.parent_id] = (counts[t.parent_id] ?? 0) + 1;
    }
    return counts;
  }, [todos]);

  const data = useMemo(() => orderForDisplay(todos, collapsedSet), [todos, collapsedSet]);
  const remaining = todos.filter((t) => !t.done).length;

  return (
    <SafeAreaView
      edges={["bottom"]}
      className="flex-1 bg-neutral-950">
      <Stack.Screen options={{ headerRight: HeaderButtons }} />

      <FlatList
        data={data}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TodoItem
            todo={item}
            onToggle={() => toggle(item.id)}
            onLongPress={() => actionsRef.current?.present({ id: item.id, text: item.text })}
            hasChildren={(childCount[item.id] ?? 0) > 0}
            childCount={childCount[item.id] ?? 0}
            collapsed={collapsedSet.has(item.id)}
            onToggleCollapse={() => toggleCollapsed(item.id)}
          />
        )}
        ListHeaderComponent={
          data.length > 0 ? (
            <Text className="pb-2 text-xs tracking-wide uppercase text-neutral-500">{remaining} remaining</Text>
          ) : null
        }
        ListEmptyComponent={EmptyState}
        contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 2, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      />

      <Pressable
        onPress={() => sheetRef.current?.present()}
        accessibilityLabel="Add task"
        style={{ elevation: 8 }}
        className="absolute right-6 bottom-8 justify-center items-center w-14 h-14 bg-blue-500 rounded-full shadow-lg active:opacity-80 shadow-blue-500/40">
        <Text className="text-3xl font-light leading-9 text-white">+</Text>
      </Pressable>

      <AddTodoSheet ref={sheetRef} />
      <TodoActionsSheet
        ref={actionsRef}
        onAddSubtask={(target) => sheetRef.current?.present(target)}
      />
    </SafeAreaView>
  );
}
