import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, SharedValue } from 'react-native-reanimated';

import { Type, useThemeName } from '@/constants/theme';
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
