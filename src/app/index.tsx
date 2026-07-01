import { router, Stack } from 'expo-router';
import { useMemo, useRef } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddTodoSheet, AddTodoSheetRef } from '@/components/add-todo-sheet';
import { TodoItem } from '@/components/todo-item';
import { orderForDisplay } from '@/lib/todo';
import { useTodos } from '@/store/todos';

function HeaderButtons() {
  return (
    <View className="flex-row items-center gap-5">
      <Pressable onPress={() => router.push('/scan')} hitSlop={8}>
        <Text className="text-base text-blue-400">Scan</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
        <Text className="text-xl text-blue-400">⚙</Text>
      </Pressable>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center gap-2 py-24">
      <Text className="text-lg text-neutral-300">No todos yet</Text>
      <Text className="text-center text-sm text-neutral-500">
        Tap the + button to add one, or Scan to import from Neovim.
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const todos = useTodos((s) => s.todos);
  const toggle = useTodos((s) => s.toggleStatus);
  const sheetRef = useRef<AddTodoSheetRef>(null);

  const data = useMemo(() => orderForDisplay(todos), [todos]);
  const remaining = todos.filter((t) => !t.done).length;

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-neutral-950">
      <Stack.Screen options={{ headerRight: HeaderButtons }} />

      <FlatList
        data={data}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TodoItem
            todo={item}
            onToggle={() => toggle(item.id)}
            onLongPress={() =>
              sheetRef.current?.present({ id: item.id, text: item.text })
            }
          />
        )}
        ListHeaderComponent={
          data.length > 0 ? (
            <Text className="px-2 pb-2 text-xs uppercase tracking-wide text-neutral-500">
              {remaining} remaining
            </Text>
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
        className="absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/40 active:opacity-80">
        <Text className="text-3xl font-light leading-9 text-white">+</Text>
      </Pressable>

      <AddTodoSheet ref={sheetRef} />
    </SafeAreaView>
  );
}
