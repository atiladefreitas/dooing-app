import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import {
  forwardRef,
  ReactNode,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTodos } from '@/store/todos';

export interface ActionTarget {
  id: string;
  text: string;
}

export type TodoActionsSheetRef = {
  /** Open the action menu for a given todo. */
  present: (target: ActionTarget) => void;
};

interface Props {
  /** Called when "Add subtask" is chosen (after this sheet closes). */
  onAddSubtask: (target: ActionTarget) => void;
}

function ActionRow({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl px-3 py-3.5 active:bg-neutral-800">
      {icon}
      <Text className={`text-base ${destructive ? 'text-red-400' : 'text-neutral-100'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export const TodoActionsSheet = forwardRef<TodoActionsSheetRef, Props>(function TodoActionsSheet(
  { onAddSubtask },
  ref
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const remove = useTodos((s) => s.remove);

  const [target, setTarget] = useState<ActionTarget | null>(null);
  // Follow-up action to run once the sheet has fully closed, so we never
  // stack two bottom sheets or fire navigation mid-dismiss animation.
  const pending = useRef<(() => void) | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      present: (next: ActionTarget) => {
        setTarget(next);
        sheetRef.current?.present();
      },
    }),
    []
  );

  const dismissThen = (fn: () => void) => {
    pending.current = fn;
    sheetRef.current?.dismiss();
  };

  const handleDismiss = useCallback(() => {
    const fn = pending.current;
    pending.current = null;
    setTarget(null);
    fn?.();
  }, []);

  const handleAddSubtask = () => {
    if (!target) return;
    const t = target;
    dismissThen(() => onAddSubtask(t));
  };

  const handleEdit = () => {
    if (!target) return;
    const id = target.id;
    dismissThen(() => router.push({ pathname: '/todo/[id]', params: { id } }));
  };

  const handleDelete = () => {
    if (!target) return;
    const t = target;
    dismissThen(() =>
      Alert.alert('Delete todo?', t.text, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove(t.id) },
      ])
    );
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      onDismiss={handleDismiss}>
      <BottomSheetView style={styles.content}>
        {target ? (
          <Text
            className="px-3 pb-1 text-sm text-neutral-500"
            numberOfLines={1}>
            {target.text}
          </Text>
        ) : null}
        <ActionRow
          icon={<Plus size={20} color="#e5e5e5" strokeWidth={2} />}
          label="Add subtask"
          onPress={handleAddSubtask}
        />
        <ActionRow
          icon={<Pencil size={18} color="#e5e5e5" strokeWidth={2} />}
          label="Edit"
          onPress={handleEdit}
        />
        <ActionRow
          icon={<Trash2 size={18} color="#f87171" strokeWidth={2} />}
          label="Delete"
          destructive
          onPress={handleDelete}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  background: { backgroundColor: '#171717' },
  handle: { backgroundColor: '#525252', width: 40 },
  content: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 36, gap: 2 },
});
