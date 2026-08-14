import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useThemeName } from '@/constants/theme';
import { blocksForDate, paletteForBlock, paletteForTag, stripTags } from '@/lib/block';
import {
  dayOfMonth,
  formatDuration,
  formatMinutes,
  isSameMonth,
  longDateLabel,
  monthMatrix,
  todayKey,
  weekdayInitials,
} from '@/lib/date';
import { dueTodosOn } from '@/lib/schedule';
import { extractCategory, getStatus } from '@/lib/todo';
import { Block } from '@/types/block';
import { Todo } from '@/types/todo';

import { StatusMarker } from '../status-marker';

const WEEK_START = 0;
const MAX_BARS = 3;
const BAR_AREA = 20;

interface MonthViewProps {
  cursor: string;
  selected: string;
  blocks: Block[];
  todos: Todo[];
  todoForBlock: (blockId: string) => Todo | undefined;
  onSelect: (date: string) => void;
  onOpenDay: (date: string) => void;
  onOpenBlock: (block: Block, date: string) => void;
  onOpenTodo: (todo: Todo) => void;
  onToggleTodo: (todoId: string) => void;
}

function DensityBars({ blocks }: { blocks: Block[] }) {
  const theme = useThemeName();
  const extra = blocks.length - MAX_BARS;
  return (
    <View style={{ height: BAR_AREA }} className="w-full items-stretch px-1.5 pt-1">
      {blocks.slice(0, MAX_BARS).map((block) => (
        <View
          key={block.id}
          style={{ backgroundColor: paletteForBlock(block, theme).bar }}
          className="mb-[2px] h-[3px] rounded-full"
        />
      ))}
      {extra > 0 ? (
        <Text className="text-center text-[8px] leading-[9px] text-fg-muted">+{extra}</Text>
      ) : null}
    </View>
  );
}

export function MonthView({
  cursor,
  selected,
  blocks,
  todos,
  todoForBlock,
  onSelect,
  onOpenDay,
  onOpenBlock,
  onOpenTodo,
  onToggleTodo,
}: MonthViewProps) {
  const theme = useThemeName();
  const today = todayKey();
  const matrix = useMemo(() => monthMatrix(cursor, WEEK_START), [cursor]);
  const initials = useMemo(() => weekdayInitials(WEEK_START), []);

  const byDate = useMemo(() => {
    const out: Record<string, Block[]> = {};
    for (const row of matrix) {
      for (const date of row) out[date] = blocksForDate(blocks, date);
    }
    return out;
  }, [blocks, matrix]);

  const dayBlocks = byDate[selected] ?? blocksForDate(blocks, selected);
  const dayDue = useMemo(() => dueTodosOn(todos, selected), [selected, todos]);
  const booked = dayBlocks.reduce((sum, b) => sum + b.duration_min, 0);

  return (
    <View className="flex-1">
      <View className="flex-row px-1 pb-1">
        {initials.map((label, i) => (
          <View key={i} className="flex-1 items-center">
            <Text className="text-[10px] uppercase text-fg-muted">{label}</Text>
          </View>
        ))}
      </View>

      <View className="px-1">
        {matrix.map((row, r) => (
          <View key={r} className="flex-row">
            {row.map((date) => {
              const inMonth = isSameMonth(date, cursor);
              const isToday = date === today;
              const isSelected = date === selected;
              return (
                <Pressable
                  key={date}
                  onPress={() => (isSelected ? onOpenDay(date) : onSelect(date))}
                  className={`flex-1 items-center rounded-lg pb-1 pt-1.5 ${
                    isSelected ? 'bg-elevated' : 'active:bg-surface'
                  }`}>
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-full ${
                      isToday ? 'bg-accent' : ''
                    }`}>
                    <Text
                      className={`text-[13px] tabular-nums ${
                        isToday
                          ? 'font-bold text-canvas'
                          : inMonth
                            ? 'text-fg'
                            : 'text-fg-faint'
                      }`}>
                      {dayOfMonth(date)}
                    </Text>
                  </View>
                  <DensityBars blocks={byDate[date] ?? []} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View className="mt-2 flex-row items-baseline justify-between border-t border-line px-4 pb-1 pt-3">
        <Text className="text-sm font-semibold text-fg">
          {longDateLabel(selected)}
        </Text>
        <Pressable onPress={() => onOpenDay(selected)} hitSlop={8}>
          <Text className="text-xs text-accent">Open day</Text>
        </Pressable>
      </View>
      {booked ? (
        <Text className="px-4 pb-1 text-[11px] text-fg-muted">
          {formatDuration(booked)} blocked
        </Text>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 6 }}>
        {dayDue.map((todo) => {
          const palette = paletteForTag(extractCategory(todo.text).toLowerCase(), theme);
          return (
            <Pressable
              key={`due-${todo.id}`}
              onPress={() => onOpenTodo(todo)}
              className="flex-row items-center gap-2 rounded-lg bg-surface px-3 py-2 active:opacity-70">
              <StatusMarker
                status={getStatus(todo)}
                size={12}
                onPress={() => onToggleTodo(todo.id)}
              />
              <Text
                numberOfLines={1}
                className={`flex-1 text-[13px] ${
                  todo.done ? 'text-fg-muted line-through' : 'text-fg'
                }`}>
                {todo.text}
              </Text>
              <View
                style={{ backgroundColor: palette.fill }}
                className="rounded-full px-2 py-0.5">
                <Text style={{ color: palette.dim }} className="text-[10px]">
                  due
                </Text>
              </View>
            </Pressable>
          );
        })}

        {dayBlocks.map((block) => {
          const palette = paletteForBlock(block, theme);
          const todo = todoForBlock(block.id);
          return (
            <Pressable
              key={block.id}
              onPress={() => onOpenBlock(block, selected)}
              className="flex-row items-center gap-3 active:opacity-70">
              <Text className="w-11 text-right text-[11px] tabular-nums text-fg-muted">
                {formatMinutes(block.start_min)}
              </Text>
              <View
                style={{ backgroundColor: palette.fill, borderColor: palette.border }}
                className="flex-1 flex-row items-center gap-2 overflow-hidden rounded-lg border px-3 py-2">
                <View
                  style={{ backgroundColor: palette.bar }}
                  className="absolute bottom-0 left-0 top-0 w-1"
                />
                {todo ? (
                  <View className="ml-1">
                    <StatusMarker
                      status={getStatus(todo)}
                      size={12}
                      onPress={() => onToggleTodo(todo.id)}
                    />
                  </View>
                ) : null}
                <Text
                  numberOfLines={1}
                  style={{ color: todo?.done ? palette.muted : palette.text }}
                  className={`flex-1 text-[13px] ${todo?.done ? 'line-through' : ''} ${
                    todo ? '' : 'ml-1'
                  }`}>
                  {stripTags(block.title) || block.title}
                </Text>
                <Text style={{ color: palette.dim }} className="text-[11px] tabular-nums">
                  {formatDuration(block.duration_min)}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {!dayBlocks.length && !dayDue.length ? (
          <View className="items-center py-10">
            <Text className="text-sm text-fg-muted">Nothing scheduled</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
