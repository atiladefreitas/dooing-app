import { Pressable, Text } from 'react-native';

import { TodoStatus } from '@/types/todo';

const GLYPH: Record<TodoStatus, string> = {
  pending: '○',
  in_progress: '◐',
  done: '✓',
};

const COLOR: Record<TodoStatus, string> = {
  pending: 'text-neutral-500',
  in_progress: 'text-priority-urgent',
  done: 'text-green-500',
};

interface Props {
  status: TodoStatus;
  onPress: () => void;
}

export function StatusCheckbox({ status, onPress }: Props) {
  return (
    <Pressable hitSlop={10} onPress={onPress} className="pt-0.5">
      <Text className={`text-xl leading-6 ${COLOR[status]}`}>{GLYPH[status]}</Text>
    </Pressable>
  );
}
