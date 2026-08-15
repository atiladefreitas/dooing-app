import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
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
import { Type, useThemeColors, useThemeName } from '@/constants/theme';
import { blocksByDate, GRANULARITY, paletteForTag } from '@/lib/block';
import {
  addDays,
  addMonths,
  formatMinutes,
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
  { label: 'day', value: 'day' },
  { label: 'week', value: 'week' },
  { label: 'month', value: 'month' },
];

const WEEK_SPAN = 3;
/** Length a todo dropped onto the grid gets — the preview must match the commit. */
const DROP_DURATION = 60;

function nextSlot(): number {
  return Math.min(1440 - GRANULARITY, Math.ceil(minutesNow() / GRANULARITY) * GRANULARITY);
}

export default function CalendarScreen() {
  const c = useThemeColors();
  const theme = useThemeName();
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
  const [dropHit, setDropHit] = useState<{ date: string; start_min: number } | null>(null);

  const gridRef = useRef<TimeGridHandle>(null);
  const editorRef = useRef<BlockEditorSheetRef>(null);
  const scheduledFor = useRef<string | null>(null);
  const rootRef = useRef<View>(null);

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const grabX = useSharedValue(0);
  const grabY = useSharedValue(0);
  const dragW = useSharedValue(150);
  // The ghost is absolutely positioned inside this screen, but the gesture
  // reports window coordinates — without the screen's own origin the ghost
  // lands a header's height below the finger.
  const rootX = useSharedValue(0);
  const rootY = useSharedValue(0);

  const measureRoot = useCallback(() => {
    requestAnimationFrame(() => {
      rootRef.current?.measureInWindow((x, y) => {
        rootX.set(x);
        rootY.set(y);
      });
    });
  }, [rootX, rootY]);

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

  const handleDragStart = useCallback((todo: Todo) => {
    // The tray appearing/disappearing reflows the grid; re-read its origin so
    // the very first hit test of the drag is already correct.
    gridRef.current?.remeasure();
    measureRoot();
    setDragging(todo);
  }, [measureRoot]);

  const handleDragMove = useCallback((x: number, topY: number) => {
    const hit = gridRef.current?.hitTest(x, topY, DROP_DURATION) ?? null;
    setDropHit((prev) =>
      prev?.date === hit?.date && prev?.start_min === hit?.start_min ? prev : hit
    );
  }, []);

  const handleDrop = useCallback((todo: Todo, x: number, topY: number) => {
    const hit = gridRef.current?.hitTest(x, topY, DROP_DURATION);
    if (!hit) return;
    editorRef.current?.present({
      mode: 'create',
      date: hit.date,
      start_min: hit.start_min,
      duration_min: DROP_DURATION,
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

  // Window point → screen-local point → back off by the grab offset, so the
  // ghost sits under the finger exactly where the chip was picked up.
  const overlayStyle = useAnimatedStyle(() => ({
    width: dragW.get(),
    transform: [
      { translateX: dragX.get() - rootX.get() - grabX.get() },
      { translateY: dragY.get() - rootY.get() - grabY.get() },
    ],
  }));

  const dragPalette = dragging
    ? paletteForTag(extractCategory(dragging.text).toLowerCase(), theme)
    : null;

  const dropHint = dropHit
    ? `${dropHit.date === todayKey() ? 'today' : shortDateLabel(dropHit.date)} · ${formatMinutes(dropHit.start_min)}`
    : null;

  const dropPreview =
    dragging && dropHit ? { ...dropHit, duration_min: DROP_DURATION } : null;

  const title =
    view === 'month'
      ? monthLabel(cursor)
      : view === 'week'
        ? `${shortDateLabel(days[0])} – ${shortDateLabel(days[days.length - 1])}`
        : longDateLabel(cursor);

  const isToday = view === 'month' ? startOfMonth(cursor) === startOfMonth(todayKey()) : days.includes(todayKey());

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-canvas">
      <View ref={rootRef} collapsable={false} onLayout={measureRoot} className="flex-1">
        <View className="flex-row items-baseline justify-between px-4 pb-2 pt-1">
          <Text style={Type.section} className="text-fg">
            {title}
          </Text>
          <View className="flex-row items-center gap-3">
            {!isToday ? (
              <Pressable onPress={goToday} hitSlop={8} className="active:opacity-60">
                <Text style={Type.meta} className="text-accent">
                  [today]
                </Text>
              </Pressable>
            ) : null}
            {/* Mono arrows rather than icons — same voice as the `→` in the sync log. */}
            <Pressable onPress={() => shift(-1)} hitSlop={12} className="active:opacity-60">
              <Text style={Type.meta} className="text-fg-dim">
                ←
              </Text>
            </Pressable>
            <Pressable onPress={() => shift(1)} hitSlop={12} className="active:opacity-60">
              <Text style={Type.meta} className="text-fg-dim">
                →
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Bracket marks the active view, exactly as it marks the active tab. Inactive
            labels pad with spaces so the mono row never shifts width. */}
        <View className="mb-2 flex-row gap-4 border-y border-line px-4 py-2">
          {VIEWS.map((v) => {
            const active = view === v.value;
            return (
              <Pressable
                key={v.value}
                onPress={() => setView(v.value)}
                hitSlop={8}
                className="active:opacity-60">
                <Text style={Type.meta} className={active ? 'text-accent' : 'text-fg-muted'}>
                  {active ? `[${v.label}]` : ` ${v.label} `}
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
                dropPreview={dropPreview}
              />
            </View>
          </GestureDetector>
        )}

        {view !== 'month' ? (
          <UnscheduledTray
            todos={tray}
            dragX={dragX}
            dragY={dragY}
            grabX={grabX}
            grabY={grabY}
            dragW={dragW}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDrop={handleDrop}
            onDragEnd={() => {
              setDragging(null);
              setDropHit(null);
            }}
            onPressTodo={openTodo}
          />
        ) : null}

        {dragging && dragPalette ? (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: 0, left: 0, zIndex: 100 }, overlayStyle]}>
            <View
              style={{ backgroundColor: dragPalette.fill, borderColor: dragPalette.bar }}
              className="rounded-sm border px-2 py-1.5">
              <View
                style={{ backgroundColor: dragPalette.bar }}
                className="absolute bottom-0 left-0 top-0 w-0.5"
              />
              <Text
                numberOfLines={1}
                style={[Type.meta, { color: dragPalette.text }]}
                className="pl-1.5">
                {dragging.text}
              </Text>
              {dropHint ? (
                <Text style={[Type.status, { color: dragPalette.dim }]} className="pl-1.5">
                  {dropHint}
                </Text>
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
          className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-accent active:opacity-80">
          <Plus size={26} color={c.canvas} strokeWidth={2.5} />
        </Pressable>
      </View>

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
