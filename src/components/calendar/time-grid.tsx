import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import {
  GRANULARITY,
  MIN_DURATION,
  PositionedBlock,
  layoutOverlaps,
  paletteForBlock,
  stripTags,
} from '@/lib/block';
import { Font, Type, useThemeName } from '@/constants/theme';
import { formatMinutes, minutesNow, todayKey } from '@/lib/date';
import { getStatus } from '@/lib/todo';
import { Block } from '@/types/block';
import { Todo } from '@/types/todo';

import { StatusMarker } from '../status-marker';

export const HOUR_HEIGHT = 62;
export const GUTTER_W = 52;
const DAY_HEIGHT = HOUR_HEIGHT * 24;
const LONG_PRESS_MS = 220;
/** Pixel height of one snap step — the unit every drag quantises to. */
const STEP_H = (GRANULARITY / 60) * HOUR_HEIGHT;

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export interface GridHit {
  date: string;
  start_min: number;
}

export interface TimeGridHandle {
  /**
   * `pageY` is the *top edge* of whatever is being dropped, not the finger —
   * a block starts where its top edge lands, so the caller passes the ghost's
   * top so the preview and the commit agree to the pixel.
   */
  hitTest: (pageX: number, pageY: number, durationMin?: number) => GridHit | null;
  scrollToMinute: (minute: number, animated?: boolean) => void;
  /** Re-read the viewport origin — call before a drag starts. */
  remeasure: () => void;
}

interface TimeGridProps {
  days: string[];
  blocksByDay: Record<string, Block[]>;
  todoForBlock: (blockId: string) => Todo | undefined;
  onCreate: (date: string, startMin: number, durationMin: number) => void;
  onOpenBlock: (block: Block, date: string) => void;
  onMoveBlock: (block: Block, date: string, startMin: number) => void;
  onResizeBlock: (block: Block, durationMin: number) => void;
  onToggleTodo: (todoId: string) => void;
  /** Open a single day — used by the `+n` overflow marker. */
  onShowMore?: (date: string) => void;
  /** Snapped landing slot for an in-flight drag from the unscheduled tray. */
  dropPreview?: { date: string; start_min: number; duration_min: number } | null;
  compact?: boolean;
}

function HourLines() {
  return (
    <>
      {HOURS.map((h) => (
        <View
          key={h}
          pointerEvents="none"
          style={{ top: h * HOUR_HEIGHT }}
          className="absolute right-0 left-0 h-px bg-elevated"
        />
      ))}
      {HOURS.map((h) => (
        <View
          key={`half-${h}`}
          pointerEvents="none"
          style={{ top: h * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
          className="absolute right-0 left-0 h-px bg-surface"
        />
      ))}
    </>
  );
}

function Gutter() {
  return (
    <View style={{ width: GUTTER_W, height: DAY_HEIGHT }}>
      {HOURS.map((h) => (
        <Text
          key={h}
          style={[Type.status, { position: 'absolute', top: h * HOUR_HEIGHT - 7 }]}
          className="right-2 text-fg-muted">
          {h === 0 ? '' : formatMinutes(h * 60)}
        </Text>
      ))}
    </View>
  );
}

interface GridBlockProps {
  item: PositionedBlock;
  date: string;
  dayIndex: number;
  dayCount: number;
  colWidth: number;
  todo?: Todo;
  compact: boolean;
  onOpen: (block: Block, date: string) => void;
  onMove: (block: Block, dayIndex: number, startMin: number) => void;
  onResize: (block: Block, durationMin: number) => void;
  onToggleTodo: (todoId: string) => void;
  setScrollEnabled: (enabled: boolean) => void;
  setHint: (hint: string | null) => void;
}

function GridBlock({
  item,
  date,
  dayIndex,
  dayCount,
  colWidth,
  todo,
  compact,
  onOpen,
  onMove,
  onResize,
  onToggleTodo,
  setScrollEnabled,
  setHint,
}: GridBlockProps) {
  const { block, column, columns } = item;
  const theme = useThemeName();
  const palette = paletteForBlock(block, theme);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const extraHeight = useSharedValue(0);
  const active = useSharedValue(0);
  const lastStep = useSharedValue(0);
  // What the gesture would commit right now. The block itself tracks the finger
  // 1:1; these drive the dashed placeholder, so the snapped landing slot is
  // always visible without the block ever lagging behind the touch.
  const pendingStart = useSharedValue(block.start_min);
  const pendingDay = useSharedValue(dayIndex);
  const pendingDuration = useSharedValue(block.duration_min);

  // Lanes never overlap, so every block keeps its own hit area.
  const slotWidth = (colWidth - 4) / columns;
  const left = dayIndex * colWidth + 2 + column * slotWidth;
  const top = (block.start_min / 60) * HOUR_HEIGHT;
  const height = Math.max((block.duration_min / 60) * HOUR_HEIGHT, 22);

  const showHint = useCallback(
    (startMin: number, durationMin: number) => {
      setHint(`${formatMinutes(startMin)} – ${formatMinutes(startMin + durationMin)}`);
    },
    [setHint]
  );

  const commitMove = useCallback(
    (targetDay: number, startMin: number) => {
      setHint(null);
      onMove(block, targetDay, startMin);
    },
    [block, onMove, setHint]
  );

  const commitResize = useCallback(
    (durationMin: number) => {
      setHint(null);
      onResize(block, durationMin);
    },
    [block, onResize, setHint]
  );

  const movePan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart(() => {
          active.set(1);
          lastStep.set(0);
          pendingStart.set(block.start_min);
          pendingDay.set(dayIndex);
          pendingDuration.set(block.duration_min);
          runOnJS(setScrollEnabled)(false);
          runOnJS(showHint)(block.start_min, block.duration_min);
        })
        .onUpdate((e) => {
          // The block itself is never snapped — it sits under the finger. Only
          // the bounds of the day clamp it, so it can never be dragged to a
          // position it could not actually land on.
          const dy = Math.min(
            Math.max(e.translationY, -top),
            ((1440 - block.duration_min) / 60) * HOUR_HEIGHT - top
          );
          translateY.set(dy);

          const dx =
            dayCount > 1 && colWidth
              ? Math.min(
                  Math.max(e.translationX, -dayIndex * colWidth),
                  (dayCount - 1 - dayIndex) * colWidth
                )
              : 0;
          translateX.set(dx);

          // Snapped landing slot, shown as the placeholder and committed on end.
          const step = Math.round(dy / STEP_H);
          const start = Math.max(
            0,
            Math.min(1440 - block.duration_min, block.start_min + step * GRANULARITY)
          );
          pendingStart.set(start);
          pendingDay.set(
            Math.max(0, Math.min(dayCount - 1, dayIndex + (colWidth ? Math.round(dx / colWidth) : 0)))
          );

          if (step !== lastStep.get()) {
            lastStep.set(step);
            runOnJS(showHint)(start, block.duration_min);
          }
        })
        .onEnd(() => {
          runOnJS(commitMove)(pendingDay.get(), pendingStart.get());
        })
        .onFinalize(() => {
          translateX.set(0);
          translateY.set(0);
          active.set(0);
          runOnJS(setScrollEnabled)(true);
          runOnJS(setHint)(null);
        }),
    [
      active,
      block.duration_min,
      block.start_min,
      colWidth,
      commitMove,
      dayCount,
      dayIndex,
      lastStep,
      pendingDay,
      pendingDuration,
      pendingStart,
      setHint,
      setScrollEnabled,
      showHint,
      top,
      translateX,
      translateY,
    ]
  );

  const resizePan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(2)
        .onBegin(() => {
          runOnJS(setScrollEnabled)(false);
        })
        .onStart(() => {
          active.set(1);
          lastStep.set(0);
          pendingStart.set(block.start_min);
          pendingDay.set(dayIndex);
          pendingDuration.set(block.duration_min);
          runOnJS(showHint)(block.start_min, block.duration_min);
        })
        .onUpdate((e) => {
          // Edge follows the finger; only the legal duration range clamps it.
          const dy = Math.min(
            Math.max(e.translationY, ((MIN_DURATION - block.duration_min) / 60) * HOUR_HEIGHT),
            ((1440 - block.start_min - block.duration_min) / 60) * HOUR_HEIGHT
          );
          extraHeight.set(dy);

          const step = Math.round(dy / STEP_H);
          const duration = Math.max(
            MIN_DURATION,
            Math.min(1440 - block.start_min, block.duration_min + step * GRANULARITY)
          );
          pendingDuration.set(duration);
          if (step !== lastStep.get()) {
            lastStep.set(step);
            runOnJS(showHint)(block.start_min, duration);
          }
        })
        .onEnd(() => {
          runOnJS(commitResize)(pendingDuration.get());
        })
        .onFinalize(() => {
          extraHeight.set(0);
          active.set(0);
          runOnJS(setScrollEnabled)(true);
          runOnJS(setHint)(null);
        }),
    [
      active,
      block.duration_min,
      block.start_min,
      commitResize,
      dayIndex,
      extraHeight,
      lastStep,
      pendingDay,
      pendingDuration,
      pendingStart,
      setHint,
      setScrollEnabled,
      showHint,
    ]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(LONG_PRESS_MS + 60)
        .onEnd(() => {
          runOnJS(onOpen)(block, date);
        }),
    [block, date, onOpen]
  );

  const composed = useMemo(() => Gesture.Race(movePan, tap), [movePan, tap]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }, { translateY: translateY.get() }],
    height: Math.max(height + extraHeight.get(), 22),
    borderColor: active.get() ? palette.bar : palette.border,
    opacity: active.get() ? 0.92 : 1,
    zIndex: active.get() ? 50 : 1,
    elevation: active.get() ? 12 : 0,
  }));

  // Where the block will actually land once you let go.
  const placeholderStyle = useAnimatedStyle(() => ({
    opacity: active.get(),
    top: (pendingStart.get() / 60) * HOUR_HEIGHT,
    left: pendingDay.get() * colWidth + 2 + column * slotWidth,
    width: Math.max(slotWidth - 2, 0),
    height: Math.max((pendingDuration.get() / 60) * HOUR_HEIGHT, 22),
  }));

  const status = todo ? getStatus(todo) : null;
  const label = stripTags(block.title) || block.title;
  const tall = height >= 46;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', zIndex: 2, borderColor: palette.bar },
          placeholderStyle,
        ]}
        className="rounded-sm border border-dashed"
      />
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top,
              left,
              width: slotWidth - 2,
              backgroundColor: palette.fill,
            },
            animatedStyle,
          ]}
          className="overflow-hidden rounded-sm border">
          <View
            style={{ backgroundColor: palette.bar }}
            className="absolute top-0 bottom-0 left-0 w-0.5"
          />
          <View className="flex-row flex-1 gap-1 items-start px-1.5 py-1 pl-2.5">
            {todo ? (
              <View className="pt-px">
                <StatusMarker
                  status={status ?? 'pending'}
                  size={12}
                  compact
                  onPress={() => onToggleTodo(todo.id)}
                />
              </View>
            ) : null}
            <View className="flex-1">
              {/* Title is the human talking (sans); the time is the machine (mono). */}
              <Text
                numberOfLines={tall ? 2 : 1}
                style={{
                  fontFamily: Font.sans,
                  fontSize: 11,
                  lineHeight: 14,
                  color: todo?.done ? palette.muted : palette.text,
                }}
                className={todo?.done ? 'line-through' : ''}>
                {label}
              </Text>
              {tall && !compact ? (
                <Text style={[Type.status, { color: palette.dim }]}>
                  {formatMinutes(block.start_min)}
                </Text>
              ) : null}
            </View>
          </View>
          <GestureDetector gesture={resizePan}>
            <View className="absolute right-0 bottom-0 left-0 justify-end items-center h-4">
              <View style={{ backgroundColor: palette.bar }} className="mb-0.5 h-0.5 w-6" />
            </View>
          </GestureDetector>
        </Animated.View>
      </GestureDetector>
    </>
  );
}

function NowIndicator({ dayIndex, colWidth }: { dayIndex: number; colWidth: number }) {
  const [minute, setMinute] = useState(minutesNow);

  useEffect(() => {
    const id = setInterval(() => setMinute(minutesNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <View
      pointerEvents="none"
      style={{
        top: (minute / 60) * HOUR_HEIGHT,
        left: dayIndex * colWidth,
        width: colWidth,
      }}
      className="absolute h-px bg-danger">
      {/* Square cap, not a dot — reads as a caret on the rule. */}
      <View className="absolute -top-1 left-0 h-2 w-1 bg-danger" />
    </View>
  );
}

export const TimeGrid = forwardRef<TimeGridHandle, TimeGridProps>(function TimeGrid(
  {
    days,
    blocksByDay,
    todoForBlock,
    onCreate,
    onOpenBlock,
    onMoveBlock,
    onResizeBlock,
    onToggleTodo,
    onShowMore,
    dropPreview,
    compact = false,
  },
  ref
) {
  const scrollRef = useRef<ScrollView>(null);
  const viewportRef = useRef<View>(null);
  const scrollY = useRef(0);
  const viewport = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const [bodyWidth, setBodyWidth] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [hint, setHint] = useState<string | null>(null);

  const colWidth = bodyWidth ? bodyWidth / days.length : 0;
  const today = todayKey();
  const todayIndex = days.indexOf(today);

  const draftActive = useSharedValue(0);
  const draftCol = useSharedValue(0);
  const draftStart = useSharedValue(0);
  const draftEnd = useSharedValue(0);

  // Deferred a frame: measuring inside `onLayout` can read the pre-commit
  // position on Android, which offsets every drop by the header height.
  const measure = useCallback(() => {
    requestAnimationFrame(() => {
      viewportRef.current?.measureInWindow((x, y, width, height) => {
        viewport.current = { x, y, width, height };
      });
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      hitTest: (pageX, pageY, durationMin = MIN_DURATION) => {
        const { x, y, width, height } = viewport.current;
        if (!width || !height || !colWidth) return null;
        if (pageX < x || pageX > x + width || pageY < y || pageY > y + height) return null;

        const localY = pageY - y + scrollY.current;
        const raw = (localY / HOUR_HEIGHT) * 60;
        const start = Math.max(
          0,
          Math.min(1440 - durationMin, Math.round(raw / GRANULARITY) * GRANULARITY)
        );

        const localX = pageX - x - GUTTER_W;
        const index = Math.max(0, Math.min(days.length - 1, Math.floor(localX / colWidth)));
        return { date: days[index], start_min: start };
      },
      scrollToMinute: (minute, animated = false) => {
        const offset = Math.max(0, (minute / 60) * HOUR_HEIGHT - HOUR_HEIGHT * 1.5);
        scrollRef.current?.scrollTo({ y: offset, animated });
      },
      remeasure: measure,
    }),
    [colWidth, days, measure]
  );

  const commitCreate = useCallback(
    (col: number, start: number, duration: number) => {
      const date = days[Math.max(0, Math.min(days.length - 1, col))];
      if (date) onCreate(date, start, duration);
    },
    [days, onCreate]
  );

  const showRangeHint = useCallback(
    (start: number, end: number) => {
      setHint(`${formatMinutes(start)} – ${formatMinutes(end)}`);
    },
    []
  );

  const dayCount = days.length;

  const createPan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart((e) => {
          const col = colWidth
            ? Math.max(0, Math.min(dayCount - 1, Math.floor(e.x / colWidth)))
            : 0;
          const raw = (e.y / HOUR_HEIGHT) * 60;
          const start = Math.max(
            0,
            Math.min(
              1440 - MIN_DURATION,
              Math.round(raw / GRANULARITY) * GRANULARITY
            )
          );
          draftCol.set(col);
          draftStart.set(start);
          draftEnd.set(start + MIN_DURATION);
          draftActive.set(1);
          runOnJS(setScrollEnabled)(false);
          runOnJS(showRangeHint)(start, start + MIN_DURATION);
        })
        .onUpdate((e) => {
          const raw = (e.y / HOUR_HEIGHT) * 60;
          const snapped = Math.max(
            MIN_DURATION,
            Math.min(1440, Math.round(raw / GRANULARITY) * GRANULARITY)
          );
          const next = Math.max(draftStart.get() + MIN_DURATION, snapped);
          if (next !== draftEnd.get()) {
            draftEnd.set(next);
            runOnJS(showRangeHint)(draftStart.get(), next);
          }
        })
        .onEnd(() => {
          runOnJS(commitCreate)(
            draftCol.get(),
            draftStart.get(),
            draftEnd.get() - draftStart.get()
          );
        })
        .onFinalize(() => {
          draftActive.set(0);
          runOnJS(setScrollEnabled)(true);
          runOnJS(setHint)(null);
        }),
    [
      colWidth,
      commitCreate,
      dayCount,
      draftActive,
      draftCol,
      draftEnd,
      draftStart,
      showRangeHint,
    ]
  );

  const draftStyle = useAnimatedStyle(() => ({
    opacity: draftActive.get(),
    top: (draftStart.get() / 60) * HOUR_HEIGHT,
    height: Math.max(((draftEnd.get() - draftStart.get()) / 60) * HOUR_HEIGHT, 8),
    left: draftCol.get() * colWidth + 2,
    width: Math.max(colWidth - 6, 0),
  }));

  const positioned = useMemo(
    () =>
      days.map((date, index) => ({
        date,
        index,
        ...layoutOverlaps(blocksByDay[date] ?? [], colWidth),
      })),
    [blocksByDay, days, colWidth]
  );

  const previewIndex = dropPreview ? days.indexOf(dropPreview.date) : -1;

  const handleMove = useCallback(
    (block: Block, dayIndex: number, startMin: number) => {
      onMoveBlock(block, days[dayIndex] ?? block.date, startMin);
    },
    [days, onMoveBlock]
  );

  return (
    <View className="flex-1">
      <View
        ref={viewportRef}
        collapsable={false}
        onLayout={measure}
        className="flex-1">
        <ScrollView
          ref={scrollRef}
          scrollEnabled={scrollEnabled}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ height: DAY_HEIGHT }} className="flex-row">
            <Gutter />
            <View
              className="flex-1"
              onLayout={(e: LayoutChangeEvent) => setBodyWidth(e.nativeEvent.layout.width)}>
              <HourLines />
              {days.map((date, i) =>
                i === 0 ? null : (
                  <View
                    key={`sep-${date}`}
                    pointerEvents="none"
                    style={{ left: i * colWidth }}
                    className="absolute top-0 bottom-0 w-px bg-elevated"
                  />
                )
              )}

              <GestureDetector gesture={createPan}>
                <View className="absolute inset-0" />
              </GestureDetector>

              <Animated.View
                pointerEvents="none"
                style={draftStyle}
                className="absolute rounded-md border border-dashed border-accent bg-accent/20"
              />

              {/* Landing slot for a tray drag. Drawn from the same hit-test the
                  drop commits, so the outline is never a guess. */}
              {previewIndex >= 0 && dropPreview && colWidth ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: (dropPreview.start_min / 60) * HOUR_HEIGHT,
                    left: previewIndex * colWidth + 2,
                    width: Math.max(colWidth - 6, 0),
                    height: Math.max((dropPreview.duration_min / 60) * HOUR_HEIGHT, 8),
                    zIndex: 3,
                  }}
                  className="rounded-sm border border-dashed border-accent bg-accent/20"
                />
              ) : null}

              {positioned.map(({ date, index, positioned: items }) =>
                items.map((item) => (
                  <GridBlock
                    key={`${date}-${item.block.id}`}
                    item={item}
                    date={date}
                    dayIndex={index}
                    dayCount={dayCount}
                    colWidth={colWidth}
                    todo={todoForBlock(item.block.id)}
                    compact={compact}
                    onOpen={onOpenBlock}
                    onMove={handleMove}
                    onResize={onResizeBlock}
                    onToggleTodo={onToggleTodo}
                    setScrollEnabled={setScrollEnabled}
                    setHint={setHint}
                  />
                ))
              )}

              {/* Blocks that did not fit in a lane are never dropped silently —
                  the count is shown and opens the day where they all fit. */}
              {positioned.map(({ date, index, overflow }) =>
                overflow.map((o) => (
                  <Pressable
                    key={`${date}-${o.key}`}
                    onPress={() => onShowMore?.(date)}
                    hitSlop={6}
                    style={{
                      position: 'absolute',
                      top: (o.startMin / 60) * HOUR_HEIGHT + 2,
                      left: (index + 1) * colWidth - 30,
                      zIndex: 2,
                    }}
                    className="rounded-sm border border-line bg-surface px-1 py-0.5 active:opacity-70">
                    <Text style={Type.status} className="text-fg-dim">
                      +{o.count}
                    </Text>
                  </Pressable>
                ))
              )}

              {todayIndex >= 0 && colWidth ? (
                <NowIndicator dayIndex={todayIndex} colWidth={colWidth} />
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>

      {hint ? (
        <View
          pointerEvents="none"
          className="absolute top-3 self-center rounded-sm bg-fg px-2.5 py-1">
          <Text style={Type.meta} className="text-canvas">
            {hint}
          </Text>
        </View>
      ) : null}
    </View>
  );
});
