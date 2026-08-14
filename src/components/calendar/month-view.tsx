import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Type, useThemeName } from '@/constants/theme';
import { blocksForDate, paletteForBlock, stripTags } from '@/lib/block';
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
import { getStatus } from '@/lib/todo';
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
          className="mb-[2px] h-[2px]"
        />
      ))}
      {extra > 0 ? (
        <Text
          style={{ ...Type.status, fontSize: 8, lineHeight: 9 }}
          className="text-center text-fg-muted">
          +{extra}
        </Text>
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
            <Text style={Type.status} className="text-fg-muted">
              {label.toUpperCase()}
            </Text>
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
                // Brackets mark today (identity); the hairline box marks the
                // cursor (selection). Two fills would make them indistinguishable.
                <Pressable
                  key={date}
                  onPress={() => (isSelected ? onOpenDay(date) : onSelect(date))}
                  className={`flex-1 items-center rounded-sm border pb-1 pt-1.5 ${
                    isSelected ? 'border-line-strong bg-surface' : 'border-transparent'
                  }`}>
                  <Text
                    style={Type.count}
                    className={
                      isToday ? 'text-accent' : inMonth ? 'text-fg' : 'text-fg-faint'
                    }>
                    {isToday ? `[${dayOfMonth(date)}]` : ` ${dayOfMonth(date)} `}
                  </Text>
                  <DensityBars blocks={byDate[date] ?? []} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View className="mt-2 flex-row items-baseline justify-between border-t border-line px-4 pb-1 pt-3">
        <Text style={Type.section} className="text-fg-muted">
          {longDateLabel(selected)}
        </Text>
        <View className="flex-row items-baseline gap-3">
          {booked ? (
            <Text style={Type.count} className="text-fg-muted">
              {formatDuration(booked)}
            </Text>
          ) : null}
          <Pressable onPress={() => onOpenDay(selected)} hitSlop={8} className="active:opacity-60">
            <Text style={Type.meta} className="text-accent">
              [open]
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {/* A terminal listing: fixed mono column on the left, hairline-divided
            rows, no card fills. See DESIGN.md §4.5b. */}
        {dayDue.map((todo) => (
          <Pressable
            key={`due-${todo.id}`}
            onPress={() => onOpenTodo(todo)}
            className="flex-row items-center gap-3 border-b border-line py-2.5 active:bg-elevated">
            <Text style={Type.status} className="w-11 text-right text-fg-muted">
              due
            </Text>
            <StatusMarker
              status={getStatus(todo)}
              size={12}
              onPress={() => onToggleTodo(todo.id)}
            />
            <Text
              numberOfLines={1}
              style={Type.body}
              className={`flex-1 ${todo.done ? 'text-fg-faint line-through' : 'text-fg'}`}>
              {todo.text}
            </Text>
          </Pressable>
        ))}

        {dayBlocks.map((block) => {
          const palette = paletteForBlock(block, theme);
          const todo = todoForBlock(block.id);
          return (
            <Pressable
              key={block.id}
              onPress={() => onOpenBlock(block, selected)}
              className="flex-row items-center gap-3 border-b border-line py-2.5 active:bg-elevated">
              <Text style={Type.count} className="w-11 text-right text-fg-muted">
                {formatMinutes(block.start_min)}
              </Text>
              <View
                style={{ backgroundColor: palette.bar }}
                className="h-4 w-0.5 self-center"
              />
              {todo ? (
                <StatusMarker
                  status={getStatus(todo)}
                  size={12}
                  onPress={() => onToggleTodo(todo.id)}
                />
              ) : null}
              <Text
                numberOfLines={1}
                style={Type.body}
                className={`flex-1 ${todo?.done ? 'text-fg-faint line-through' : 'text-fg'}`}>
                {stripTags(block.title) || block.title}
              </Text>
              <Text style={Type.count} className="text-fg-muted">
                {formatDuration(block.duration_min)}
              </Text>
            </Pressable>
          );
        })}

        {!dayBlocks.length && !dayDue.length ? (
          <View className="py-10">
            <Text style={Type.status} className="text-fg-faint">
              ~
            </Text>
            <Text style={Type.status} className="pt-1 text-fg-muted">
              nothing scheduled
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
