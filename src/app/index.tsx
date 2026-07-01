import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        Add one below, or tap Scan to import from Neovim.
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const todos = useTodos((s) => s.todos);
  const add = useTodos((s) => s.add);
  const toggle = useTodos((s) => s.toggleStatus);
  const [text, setText] = useState('');

  const data = useMemo(() => orderForDisplay(todos), [todos]);
  const remaining = todos.filter((t) => !t.done).length;

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    add(value);
    setText('');
  };

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-neutral-950">
      <Stack.Screen options={{ headerRight: HeaderButtons }} />

      <FlatList
        data={data}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TodoItem todo={item} onToggle={() => toggle(item.id)} />
        )}
        ListHeaderComponent={
          data.length > 0 ? (
            <Text className="px-2 pb-2 text-xs uppercase tracking-wide text-neutral-500">
              {remaining} remaining
            </Text>
          ) : null
        }
        ListEmptyComponent={EmptyState}
        contentContainerStyle={{ padding: 16, gap: 2, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      />

      <View className="flex-row items-center gap-2 border-t border-neutral-800 px-4 py-2">
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="done"
          placeholder="Add a todo…  (use #tags)"
          placeholderTextColor="#666"
          className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-base text-white"
        />
        <Pressable
          onPress={submit}
          className="rounded-lg bg-blue-500 px-4 py-2 active:opacity-70">
          <Text className="font-semibold text-white">Add</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
