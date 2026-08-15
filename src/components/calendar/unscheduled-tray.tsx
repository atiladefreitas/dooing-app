import { useMemo } from 'react';
import { LayoutChangeEvent, ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, SharedValue, useSharedValue } from 'react-native-reanimated';

import { Type, useThemeName } from '@/constants/theme';
import { paletteForTag } from '@/lib/block';
import { extractCategory } from '@/lib/todo';
import { Todo } from '@/types/todo';

/**
 * Shared values the floating ghost is drawn from. `dragX/dragY` are the finger
 * in window space; `grabX/grabY` is where inside the chip the finger landed, so
 * the ghost can keep that exact relationship instead of snapping to the finger.
 */
export interface DragValues {
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  grabX: SharedValue<number>;
  grabY: SharedValue<number>;
  dragW: SharedValue<number>;
}

interface TrayProps extends DragValues {
  todos: Todo[];
  onDragStart: (todo: Todo) => void;
  /** `topY` is the ghost's top edge, not the finger — that is what sets the time. */
  onDragMove: (x: number, topY: number) => void;
  onDrop: (todo: Todo, x: number, topY: number) => void;
  onDragEnd: () => void;
  onPressTodo: (todo: Todo) => void;
}

function TrayChip({
  todo,
  dragX,
  dragY,
  grabX,
  grabY,
  dragW,
  onDragStart,
  onDragMove,
  onDrop,
  onDragEnd,
  onPressTodo,
}: { todo: Todo } & Omit<TrayProps, 'todos'>) {
  const theme = useThemeName();
  const palette = paletteForTag(extractCategory(todo.text).toLowerCase(), theme);

  const width = useSharedValue(0);
  const height = useSharedValue(0);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activateAfterLongPress(180)
      .onStart((e) => {
        // Clamp so a grab on the chip's edge still leaves the ghost under the
        // finger once it is swapped for the (differently sized) drag ghost.
        grabX.set(Math.min(Math.max(e.x, 12), Math.max(width.get() - 12, 12)));
        grabY.set(Math.min(Math.max(e.y, 0), Math.max(height.get(), 1)));
        dragW.set(width.get() || 150);
        dragX.set(e.absoluteX);
        dragY.set(e.absoluteY);
        runOnJS(onDragStart)(todo);
      })
      .onUpdate((e) => {
        dragX.set(e.absoluteX);
        dragY.set(e.absoluteY);
        runOnJS(onDragMove)(e.absoluteX, e.absoluteY - grabY.get());
      })
      .onEnd((e) => {
        runOnJS(onDrop)(todo, e.absoluteX, e.absoluteY - grabY.get());
      })
      .onFinalize(() => {
        runOnJS(onDragEnd)();
      });

    const tap = Gesture.Tap()
      .maxDuration(240)
      .onEnd(() => {
        runOnJS(onPressTodo)(todo);
      });

    return Gesture.Race(pan, tap);
  }, [
    dragW,
    dragX,
    dragY,
    grabX,
    grabY,
    height,
    onDragEnd,
    onDragMove,
    onDragStart,
    onDrop,
    onPressTodo,
    todo,
    width,
  ]);

  const onLayout = (e: LayoutChangeEvent) => {
    width.set(e.nativeEvent.layout.width);
    height.set(e.nativeEvent.layout.height);
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={onLayout}
        style={{ backgroundColor: palette.fill, borderColor: palette.border }}
        className="max-w-[190px] flex-row items-center overflow-hidden rounded-sm border py-1.5 pl-2.5 pr-3">
        <View
          style={{ backgroundColor: palette.bar }}
          className="absolute bottom-0 left-0 top-0 w-0.5"
        />
        <Text numberOfLines={1} style={[Type.body, { color: palette.text, fontSize: 13 }]}>
          {todo.text}
        </Text>
      </View>
    </GestureDetector>
  );
}

export function UnscheduledTray({ todos, ...handlers }: TrayProps) {
  if (!todos.length) return null;

  return (
    <View className="border-t border-line bg-canvas pb-1 pt-2">
      <View className="flex-row items-baseline justify-between px-4 pb-1.5">
        <Text style={Type.section} className="text-fg-muted">
          unscheduled
        </Text>
        <Text style={Type.status} className="text-fg-faint">
          hold to drag · {todos.length}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 6 }}>
        {todos.map((todo) => (
          <TrayChip key={todo.id} todo={todo} {...handlers} />
        ))}
      </ScrollView>
    </View>
  );
}
