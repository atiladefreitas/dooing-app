import { router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { ReactNode, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getStatus } from '@/lib/todo';
import { useTodos } from '@/store/todos';

// Priority names come from the plugin's config (config.lua defaults).
const KNOWN_PRIORITIES = ['important', 'urgent'] as const;

function endOfDayIn(days: number): number {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 0);
  return Math.floor(d.getTime() / 1000);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </Text>
      {children}
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full bg-neutral-800 px-3 py-1 active:opacity-70">
      <Text className="text-sm text-neutral-200">{label}</Text>
    </Pressable>
  );
}

export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const todo = useTodos((s) => s.todos.find((t) => t.id === id));
  const update = useTodos((s) => s.update);
  const remove = useTodos((s) => s.remove);
  const addNested = useTodos((s) => s.addNested);
  const toggle = useTodos((s) => s.toggleStatus);
  const headerHeight = useHeaderHeight();
  const [sub, setSub] = useState('');

  if (!todo) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <Text className="text-neutral-400">Todo not found.</Text>
      </View>
    );
  }

  const priorities = todo.priorities ?? [];
  const status = getStatus(todo);

  const togglePriority = (p: string) => {
    const next = priorities.includes(p)
      ? priorities.filter((x) => x !== p)
      : [...priorities, p];
    update(todo.id, { priorities: next.length ? next : null });
  };

  const addSubtask = () => {
    const value = sub.trim();
    if (!value) return;
    addNested(todo.id, value);
    setSub('');
  };

  const confirmDelete = () => {
    Alert.alert('Delete todo?', todo.text, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove(todo.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neutral-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}>
      <ScrollView
        className="flex-1 bg-neutral-950"
        contentContainerStyle={{ padding: 16, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
      <Field label="Status">
        <Pressable
          onPress={() => toggle(todo.id)}
          className="self-start rounded-lg bg-neutral-900 px-3 py-2 active:opacity-70">
          <Text className="text-base capitalize text-neutral-200">
            {status.replace('_', ' ')} — tap to advance
          </Text>
        </Pressable>
      </Field>

      <Field label="Task">
        <TextInput
          defaultValue={todo.text}
          onChangeText={(v) => update(todo.id, { text: v })}
          multiline
          placeholder="Task text (use #tags)"
          placeholderTextColor="#666"
          className="rounded-lg bg-neutral-900 px-3 py-2 text-base text-white"
          style={{ textAlignVertical: 'top' }}
        />
      </Field>

      <Field label="Priorities">
        <View className="flex-row gap-2">
          {KNOWN_PRIORITIES.map((p) => {
            const on = priorities.includes(p);
            const onBg = p === 'important' ? 'bg-priority-important' : 'bg-priority-urgent';
            return (
              <Pressable
                key={p}
                onPress={() => togglePriority(p)}
                className={`rounded-full px-3 py-1 ${on ? onBg : 'bg-neutral-800'}`}>
                <Text
                  className={`text-sm ${
                    on ? 'font-semibold text-neutral-950' : 'text-neutral-300'
                  }`}>
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Due date">
        <View className="flex-row flex-wrap gap-2">
          <Chip label="Today" onPress={() => update(todo.id, { due_at: endOfDayIn(0) })} />
          <Chip label="Tomorrow" onPress={() => update(todo.id, { due_at: endOfDayIn(1) })} />
          <Chip label="+7 days" onPress={() => update(todo.id, { due_at: endOfDayIn(7) })} />
          <Chip label="Clear" onPress={() => update(todo.id, { due_at: null })} />
        </View>
        {todo.due_at ? (
          <Text className="text-sm text-neutral-400">
            {new Date(todo.due_at * 1000).toLocaleDateString()}
          </Text>
        ) : null}
      </Field>

      <Field label="Estimated hours">
        <TextInput
          defaultValue={todo.estimated_hours?.toString() ?? ''}
          onChangeText={(v) => {
            const n = parseFloat(v);
            update(todo.id, { estimated_hours: Number.isFinite(n) ? n : null });
          }}
          keyboardType="decimal-pad"
          placeholder="e.g. 2"
          placeholderTextColor="#666"
          className="w-24 rounded-lg bg-neutral-900 px-3 py-2 text-base text-white"
        />
      </Field>

      <Field label="Notes">
        <TextInput
          defaultValue={todo.notes}
          onChangeText={(v) => update(todo.id, { notes: v })}
          multiline
          placeholder="Scratchpad notes…"
          placeholderTextColor="#666"
          className="min-h-24 rounded-lg bg-neutral-900 px-3 py-2 text-base text-white"
          style={{ textAlignVertical: 'top' }}
        />
      </Field>

      <Field label="Add subtask">
        <View className="flex-row gap-2">
          <TextInput
            value={sub}
            onChangeText={setSub}
            onSubmitEditing={addSubtask}
            returnKeyType="done"
            placeholder="Subtask…"
            placeholderTextColor="#666"
            className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-base text-white"
          />
          <Pressable
            onPress={addSubtask}
            className="rounded-lg bg-blue-500 px-4 py-2 active:opacity-70">
            <Text className="font-semibold text-white">Add</Text>
          </Pressable>
        </View>
      </Field>

      <Pressable
        onPress={confirmDelete}
        className="mt-4 items-center rounded-lg border border-red-500/40 py-3 active:opacity-70">
        <Text className="font-semibold text-red-400">Delete todo</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
