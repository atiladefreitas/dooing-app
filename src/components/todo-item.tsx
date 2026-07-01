import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { getStatus } from '@/lib/todo';
import { Todo } from '@/types/todo';

import { StatusCheckbox } from './status-checkbox';

const PRIORITY_BG: Record<string, string> = {
  important: 'bg-priority-important',
  urgent: 'bg-priority-urgent',
};

function formatDue(dueSeconds: number): { label: string; overdue: boolean } {
  const date = new Date(dueSeconds * 1000);
  return {
    label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    overdue: dueSeconds * 1000 < Date.now(),
  };
}

/** Render todo text, highlighting inline #tags. */
function TodoText({ text, done }: { text: string; done: boolean }) {
  const parts = text.split(/(#\w+)/g);
  return (
    <Text
      className={`text-base ${done ? 'text-neutral-500 line-through' : 'text-neutral-100'}`}>
      {parts.map((part, i) =>
        part.startsWith('#') ? (
          <Text key={i} className={done ? 'text-neutral-500' : 'text-blue-400'}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

interface Props {
  todo: Todo;
  onToggle: () => void;
}

export function TodoItem({ todo, onToggle }: Props) {
  const status = getStatus(todo);
  const due = todo.due_at ? formatDue(todo.due_at) : null;
  const priorities = todo.priorities ?? [];
  const hasMeta = due || priorities.length > 0 || todo.estimated_hours;

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/todo/[id]', params: { id: todo.id } })
      }
      style={{ marginLeft: todo.depth * 20 }}
      className="flex-row items-start gap-3 rounded-lg px-2 py-2 active:bg-neutral-900">
      <StatusCheckbox status={status} onPress={onToggle} />
      <View className="flex-1 gap-1">
        <TodoText text={todo.text} done={todo.done} />
        {hasMeta ? (
          <View className="flex-row flex-wrap items-center gap-1.5">
            {priorities.map((p) => (
              <View
                key={p}
                className={`rounded-full px-2 py-0.5 ${PRIORITY_BG[p] ?? 'bg-priority-info'}`}>
                <Text className="text-xs font-medium text-neutral-950">{p}</Text>
              </View>
            ))}
            {due ? (
              <View
                className={`rounded-full px-2 py-0.5 ${
                  due.overdue && !todo.done ? 'bg-red-500/20' : 'bg-neutral-800'
                }`}>
                <Text
                  className={`text-xs ${
                    due.overdue && !todo.done ? 'text-red-400' : 'text-neutral-400'
                  }`}>
                  {due.label}
                </Text>
              </View>
            ) : null}
            {todo.estimated_hours ? (
              <View className="rounded-full bg-neutral-800 px-2 py-0.5">
                <Text className="text-xs text-neutral-400">{todo.estimated_hours}h</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
