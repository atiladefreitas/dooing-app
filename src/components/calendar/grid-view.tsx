import { forwardRef, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Font, Type, useThemeName } from '@/constants/theme';
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
  dropPreview?: { date: string; start_min: number; duration_min: number } | null;
}

function DueChip({ todo, onPress }: { todo: Todo; onPress: () => void }) {
  const theme = useThemeName();
  const palette = paletteForTag(extractCategory(todo.text).toLowerCase(), theme);
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: palette.fill, borderColor: palette.border }}
      className="flex-row items-center overflow-hidden rounded-sm border py-0.5 pl-2 pr-1 active:opacity-70">
      <View
        style={{ backgroundColor: palette.bar }}
        className="absolute bottom-0 left-0 top-0 w-0.5"
      />
      <Text
        numberOfLines={1}
        style={{
          ...Type.status,
          fontFamily: Font.sans,
          color: todo.done ? palette.muted : palette.text,
        }}
        className={`flex-1 ${todo.done ? 'line-through' : ''}`}>
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
    dropPreview,
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
      <View className="flex-row border-b border-line">
        <View style={{ width: GUTTER_W }} />
        {days.map((date) => {
          const isToday = date === today;
          return (
            <Pressable
              key={date}
              onPress={() => onSelectDay(date)}
              className="flex-1 items-center py-2 active:opacity-60">
              <Text
                style={Type.status}
                className={isToday ? 'text-accent' : 'text-fg-muted'}>
                {weekdayShort(date).toUpperCase()}
              </Text>
              {/* `[13]` marks today. Other days pad with spaces so the mono
                  column keeps its width and the row never shifts. */}
              <Text
                style={[Type.count, { fontSize: 14, lineHeight: 20 }]}
                className={isToday ? 'text-accent' : 'text-fg'}>
                {isToday ? `[${dayOfMonth(date)}]` : ` ${dayOfMonth(date)} `}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {hasDue ? (
        <View className="flex-row border-b border-line bg-canvas">
          <View style={{ width: GUTTER_W }} className="justify-center pr-2">
            <Text style={Type.section} className="text-right text-fg-muted">
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
        onShowMore={onSelectDay}
        dropPreview={dropPreview}
        compact={compact}
      />
    </View>
  );
});
