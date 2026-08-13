import { forwardRef, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { paletteForTag } from '@/lib/block';
import { dayOfMonth, todayKey, weekdayShort } from '@/lib/date';
import { dueTodosOn } from '@/lib/schedule';
import { extractCategory } from '@/lib/todo';
import { Block } from '@/types/block';
import { Todo } from '@/types/todo';

import { GUTTER_W, TimeGrid, TimeGridHandle } from './time-grid';

interface GridViewProps {
  days: string[];
  blocksByDay: Record<string, Block[]>;
  todos: Todo[];
  todoForBlock: (blockId: string) => Todo | undefined;
  onCreate: (date: string, startMin: number, durationMin: number) => void;
  onOpenBlock: (block: Block, date: string) => void;
  onMoveBlock: (block: Block, date: string, startMin: number) => void;
  onResizeBlock: (block: Block, durationMin: number) => void;
  onToggleTodo: (todoId: string) => void;
  onOpenTodo: (todo: Todo) => void;
  onSelectDay: (date: string) => void;
}

function DueChip({ todo, onPress }: { todo: Todo; onPress: () => void }) {
  const palette = paletteForTag(extractCategory(todo.text).toLowerCase());
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: palette.fill, borderColor: palette.border }}
      className="flex-row items-center gap-1 rounded border px-1.5 py-0.5 active:opacity-70">
      <View style={{ backgroundColor: palette.bar }} className="h-1.5 w-1.5 rounded-full" />
      <Text
        numberOfLines={1}
        style={{ color: todo.done ? palette.muted : palette.text }}
        className={`flex-1 text-[10px] leading-[13px] ${todo.done ? 'line-through' : ''}`}>
        {todo.text}
      </Text>
    </Pressable>
  );
}

export const GridView = forwardRef<TimeGridHandle, GridViewProps>(function GridView(
  {
    days,
    blocksByDay,
    todos,
    todoForBlock,
    onCreate,
    onOpenBlock,
    onMoveBlock,
    onResizeBlock,
    onToggleTodo,
    onOpenTodo,
    onSelectDay,
  },
  ref
) {
  const today = todayKey();
  const compact = days.length > 1;

  const dueByDay = useMemo(() => {
    const out: Record<string, Todo[]> = {};
    for (const date of days) out[date] = dueTodosOn(todos, date);
    return out;
  }, [days, todos]);

  const hasDue = days.some((d) => (dueByDay[d] ?? []).length > 0);

  return (
    <View className="flex-1">
      <View className="flex-row border-b border-neutral-800">
        <View style={{ width: GUTTER_W }} />
        {days.map((date) => {
          const isToday = date === today;
          return (
            <Pressable
              key={date}
              onPress={() => onSelectDay(date)}
              className="flex-1 items-center py-2 active:opacity-60">
              <Text
                className={`text-[10px] uppercase tracking-wide ${
                  isToday ? 'text-blue-400' : 'text-neutral-500'
                }`}>
                {weekdayShort(date)}
              </Text>
              <View
                className={`mt-0.5 h-7 w-7 items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-500' : ''
                }`}>
                <Text
                  className={`text-[15px] tabular-nums ${
                    isToday ? 'font-bold text-white' : 'text-neutral-200'
                  }`}>
                  {dayOfMonth(date)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {hasDue ? (
        <View className="flex-row border-b border-neutral-800 bg-neutral-950">
          <View style={{ width: GUTTER_W }} className="justify-center pr-2">
            <Text className="text-right text-[9px] uppercase tracking-wide text-neutral-600">
              due
            </Text>
          </View>
          {days.map((date) => (
            <View key={date} className="flex-1 px-0.5 py-1">
              <ScrollView
                style={{ maxHeight: 66 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 2 }}>
                {(dueByDay[date] ?? []).map((todo) => (
                  <DueChip key={todo.id} todo={todo} onPress={() => onOpenTodo(todo)} />
                ))}
              </ScrollView>
            </View>
          ))}
        </View>
      ) : null}

      <TimeGrid
        ref={ref}
        days={days}
        blocksByDay={blocksByDay}
        todoForBlock={todoForBlock}
        onCreate={onCreate}
        onOpenBlock={onOpenBlock}
        onMoveBlock={onMoveBlock}
        onResizeBlock={onResizeBlock}
        onToggleTodo={onToggleTodo}
        compact={compact}
      />
    </View>
  );
});
