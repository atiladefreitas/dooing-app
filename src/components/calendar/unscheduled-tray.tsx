import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, SharedValue } from 'react-native-reanimated';

import { useThemeName } from '@/constants/theme';
import { paletteForTag } from '@/lib/block';
import { extractCategory } from '@/lib/todo';
import { Todo } from '@/types/todo';

interface TrayProps {
  todos: Todo[];
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  onDragStart: (todo: Todo) => void;
  onDragMove: (x: number, y: number) => void;
  onDrop: (todo: Todo, x: number, y: number) => void;
  onDragEnd: () => void;
  onPressTodo: (todo: Todo) => void;
}

function TrayChip({
  todo,
  dragX,
  dragY,
  onDragStart,
  onDragMove,
  onDrop,
  onDragEnd,
  onPressTodo,
}: { todo: Todo } & Omit<TrayProps, 'todos'>) {
  const theme = useThemeName();
  const palette = paletteForTag(extractCategory(todo.text).toLowerCase(), theme);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activateAfterLongPress(180)
      .onStart((e) => {
        dragX.set(e.absoluteX);
        dragY.set(e.absoluteY);
        runOnJS(onDragStart)(todo);
      })
      .onUpdate((e) => {
        dragX.set(e.absoluteX);
        dragY.set(e.absoluteY);
        runOnJS(onDragMove)(e.absoluteX, e.absoluteY);
      })
      .onEnd((e) => {
        runOnJS(onDrop)(todo, e.absoluteX, e.absoluteY);
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
  }, [dragX, dragY, onDragEnd, onDragMove, onDragStart, onDrop, onPressTodo, todo]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={{ backgroundColor: palette.fill, borderColor: palette.border }}
        className="max-w-[190px] flex-row items-center gap-1.5 rounded-full border py-2 pl-2.5 pr-3.5">
        <View style={{ backgroundColor: palette.bar }} className="h-2 w-2 rounded-full" />
        <Text numberOfLines={1} style={{ color: palette.text }} className="text-[13px]">
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
      <Text className="px-4 pb-1.5 text-[10px] uppercase tracking-wide text-fg-muted">
        Unscheduled · hold to drag onto the grid
      </Text>
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
