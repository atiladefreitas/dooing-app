import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlockEditorSheet, BlockEditorSheetRef } from '@/components/block-editor-sheet';
import { GridView } from '@/components/calendar/grid-view';
import { MonthView } from '@/components/calendar/month-view';
import { TimeGridHandle } from '@/components/calendar/time-grid';
import { UnscheduledTray } from '@/components/calendar/unscheduled-tray';
import { blocksByDate, GRANULARITY, paletteForTag } from '@/lib/block';
import {
  addDays,
  addMonths,
  longDateLabel,
  minutesNow,
  monthLabel,
  shortDateLabel,
  startOfMonth,
  todayKey,
} from '@/lib/date';
import { unscheduledTodos } from '@/lib/schedule';
import { extractCategory } from '@/lib/todo';
import { useBlocks } from '@/store/blocks';
import { useTodos } from '@/store/todos';
import { Block, CalendarView } from '@/types/block';
import { Todo } from '@/types/todo';

const VIEWS: { label: string; value: CalendarView }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

const WEEK_SPAN = 3;

function nextSlot(): number {
  return Math.min(1440 - GRANULARITY, Math.ceil(minutesNow() / GRANULARITY) * GRANULARITY);
}

export default function CalendarScreen() {
  const params = useLocalSearchParams<{ scheduleTodo?: string; date?: string }>();

  const blocks = useBlocks((s) => s.blocks);
  const links = useBlocks((s) => s.links);
  const view = useBlocks((s) => s.view);
  const setView = useBlocks((s) => s.setView);
  const moveBlock = useBlocks((s) => s.move);
  const resizeBlock = useBlocks((s) => s.resize);

  const todos = useTodos((s) => s.todos);
  const toggleStatus = useTodos((s) => s.toggleStatus);

  const [cursor, setCursor] = useState(todayKey);
  const [selected, setSelected] = useState(todayKey);
  const [dragging, setDragging] = useState<Todo | null>(null);
  const [dropHint, setDropHint] = useState<string | null>(null);

  const gridRef = useRef<TimeGridHandle>(null);
  const editorRef = useRef<BlockEditorSheetRef>(null);
  const scheduledFor = useRef<string | null>(null);

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  const days = useMemo(
    () =>
      view === 'week'
        ? Array.from({ length: WEEK_SPAN }, (_, i) => addDays(cursor, i))
        : [cursor],
    [cursor, view]
  );

  const byDay = useMemo(() => blocksByDate(blocks, days), [blocks, days]);

  const todoById = useMemo(() => new Map(todos.map((t) => [t.id, t])), [todos]);
  const todoForBlock = useCallback(
    (blockId: string) => {
      const todoId = links[blockId];
      return todoId ? todoById.get(todoId) : undefined;
    },
    [links, todoById]
  );

  const tray = useMemo(() => unscheduledTodos(todos, links), [links, todos]);

  useEffect(() => {
    if (view !== 'month') {
      const timer = setTimeout(() => gridRef.current?.scrollToMinute(minutesNow()), 60);
      return () => clearTimeout(timer);
    }
  }, [view]);

  const [lastParams, setLastParams] = useState({ date: params.date, todo: params.scheduleTodo });
  if (params.date !== lastParams.date || params.scheduleTodo !== lastParams.todo) {
    setLastParams({ date: params.date, todo: params.scheduleTodo });
    const target = params.date || (params.scheduleTodo ? todayKey() : null);
    if (target) {
      setCursor(target);
      setSelected(target);
    }
  }

  useEffect(() => {
    const todoId = params.scheduleTodo;
    if (!todoId) {
      scheduledFor.current = null;
      return;
    }
    if (scheduledFor.current === todoId) return;
    scheduledFor.current = todoId;

    const todo = todos.find((t) => t.id === todoId);
    router.setParams({ scheduleTodo: '' });
    if (!todo) return;
    if (view === 'month') setView('day');
    const date = params.date || todayKey();
    setTimeout(() => {
      editorRef.current?.present({
        mode: 'create',
        date,
        start_min: nextSlot(),
        duration_min: 60,
        todoId: todo.id,
        title: todo.text,
      });
    }, 120);
  });

  const shift = useCallback(
    (direction: number) => {
      if (view === 'month') setCursor((c) => addMonths(c, direction));
      else setCursor((c) => addDays(c, direction * (view === 'week' ? WEEK_SPAN : 1)));
    },
    [view]
  );

  const goToday = useCallback(() => {
    const key = todayKey();
    setCursor(key);
    setSelected(key);
    if (view !== 'month') setTimeout(() => gridRef.current?.scrollToMinute(minutesNow(), true), 60);
  }, [view]);

  const openDay = useCallback(
    (date: string) => {
      setCursor(date);
      setSelected(date);
      setView('day');
    },
    [setView]
  );

  const openTodo = useCallback((todo: Todo) => {
    router.push({ pathname: '/todo/[id]', params: { id: todo.id } });
  }, []);

  const handleCreate = useCallback((date: string, startMin: number, durationMin: number) => {
    editorRef.current?.present({
      mode: 'create',
      date,
      start_min: startMin,
      duration_min: durationMin,
    });
  }, []);

  const handleOpenBlock = useCallback((block: Block) => {
    editorRef.current?.present({ mode: 'edit', block });
  }, []);

  const handleMove = useCallback(
    (block: Block, date: string, startMin: number) => {
      if (block.date === date && block.start_min === startMin) return;
      moveBlock(block.id, block.recurrence ? block.date : date, startMin);
    },
    [moveBlock]
  );

  const handleResize = useCallback(
    (block: Block, durationMin: number) => {
      if (block.duration_min === durationMin) return;
      resizeBlock(block.id, durationMin);
    },
    [resizeBlock]
  );

  const handleDragMove = useCallback((x: number, y: number) => {
    const hit = gridRef.current?.hitTest(x, y);
    setDropHint(hit ? `${hit.date === todayKey() ? 'Today' : shortDateLabel(hit.date)}` : null);
  }, []);

  const handleDrop = useCallback((todo: Todo, x: number, y: number) => {
    const hit = gridRef.current?.hitTest(x, y);
    if (!hit) return;
    editorRef.current?.present({
      mode: 'create',
      date: hit.date,
      start_min: hit.start_min,
      duration_min: 60,
      todoId: todo.id,
      title: todo.text,
    });
  }, []);

  const pager = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-16, 16])
        .onEnd((e) => {
          if (e.translationX < -40) runOnJS(shift)(1);
          else if (e.translationX > 40) runOnJS(shift)(-1);
        }),
    [shift]
  );

  const overlayStyle = useAnimatedStyle(() => ({
    left: dragX.get() - 70,
    top: dragY.get() - 24,
  }));

  const dragPalette = dragging
    ? paletteForTag(extractCategory(dragging.text).toLowerCase())
    : null;

  const title =
    view === 'month'
      ? monthLabel(cursor)
      : view === 'week'
        ? `${shortDateLabel(days[0])} – ${shortDateLabel(days[days.length - 1])}`
        : longDateLabel(cursor);

  const isToday = view === 'month' ? startOfMonth(cursor) === startOfMonth(todayKey()) : days.includes(todayKey());

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-neutral-950">
      <View className="flex-row items-center justify-between px-4 pb-2 pt-1">
        <Text className="text-lg font-semibold text-white">{title}</Text>
        <View className="flex-row items-center gap-1">
          {!isToday ? (
            <Pressable
              onPress={goToday}
              hitSlop={6}
              className="mr-1 rounded-full bg-neutral-800 px-3 py-1.5 active:opacity-70">
              <Text className="text-xs font-medium text-neutral-200">Today</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => shift(-1)}
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-full active:bg-neutral-800">
            <ChevronLeft size={20} color="#d4d4d4" />
          </Pressable>
          <Pressable
            onPress={() => shift(1)}
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-full active:bg-neutral-800">
            <ChevronRight size={20} color="#d4d4d4" />
          </Pressable>
        </View>
      </View>

      <View className="mx-4 mb-2 flex-row rounded-lg bg-neutral-900 p-1">
        {VIEWS.map((v) => {
          const active = view === v.value;
          return (
            <Pressable
              key={v.value}
              onPress={() => setView(v.value)}
              className={`flex-1 items-center rounded-md py-1.5 ${active ? 'bg-neutral-700' : ''}`}>
              <Text
                className={`text-[13px] ${active ? 'font-semibold text-white' : 'text-neutral-400'}`}>
                {v.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {view === 'month' ? (
        <MonthView
          cursor={cursor}
          selected={selected}
          blocks={blocks}
          todos={todos}
          todoForBlock={todoForBlock}
          onSelect={setSelected}
          onOpenDay={openDay}
          onOpenBlock={handleOpenBlock}
          onOpenTodo={openTodo}
          onToggleTodo={toggleStatus}
        />
      ) : (
        <GestureDetector gesture={pager}>
          <View className="flex-1">
            <GridView
              ref={gridRef}
              days={days}
              blocksByDay={byDay}
              todos={todos}
              todoForBlock={todoForBlock}
              onCreate={handleCreate}
              onOpenBlock={handleOpenBlock}
              onMoveBlock={handleMove}
              onResizeBlock={handleResize}
              onToggleTodo={toggleStatus}
              onOpenTodo={openTodo}
              onSelectDay={openDay}
            />
          </View>
        </GestureDetector>
      )}

      {view !== 'month' ? (
        <UnscheduledTray
          todos={tray}
          dragX={dragX}
          dragY={dragY}
          onDragStart={setDragging}
          onDragMove={handleDragMove}
          onDrop={handleDrop}
          onDragEnd={() => {
            setDragging(null);
            setDropHint(null);
          }}
          onPressTodo={openTodo}
        />
      ) : null}

      {dragging && dragPalette ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', width: 150 },
            overlayStyle,
          ]}>
          <View
            style={{ backgroundColor: dragPalette.bar }}
            className="rounded-lg px-3 py-2 shadow-lg">
            <Text numberOfLines={1} className="text-[12px] font-semibold text-neutral-950">
              {dragging.text}
            </Text>
            {dropHint ? (
              <Text className="text-[10px] text-neutral-800">{dropHint}</Text>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      <Pressable
        onPress={() =>
          editorRef.current?.present({
            mode: 'create',
            date: view === 'month' ? selected : cursor,
            start_min: nextSlot(),
            duration_min: 60,
          })
        }
        accessibilityLabel="Add time block"
        style={{ elevation: 8 }}
        className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/40 active:opacity-80">
        <Plus size={26} color="#ffffff" strokeWidth={2.5} />
      </Pressable>

      <BlockEditorSheet
        ref={editorRef}
        onSaved={(date) => {
          setSelected(date);
          if (view !== 'month' && !days.includes(date)) setCursor(date);
        }}
      />
    </SafeAreaView>
  );
}
