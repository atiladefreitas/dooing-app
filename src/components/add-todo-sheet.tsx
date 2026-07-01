import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import {
  forwardRef,
  ReactNode,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTodos } from '@/store/todos';

const PRIORITIES = ['important', 'urgent'] as const;

const DUE_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'None', days: null },
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: '+7 days', days: 7 },
];

function endOfDayIn(days: number): number {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 0);
  return Math.floor(d.getTime() / 1000);
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
      {children}
    </Text>
  );
}

export interface SheetParent {
  id: string;
  text: string;
}

export type AddTodoSheetRef = {
  /** Open the sheet. Pass a parent to add a subtask under it. */
  present: (parent?: SheetParent) => void;
};

export const AddTodoSheet = forwardRef<AddTodoSheetRef>(function AddTodoSheet(_props, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const add = useTodos((s) => s.add);
  const addNested = useTodos((s) => s.addNested);

  const [parent, setParent] = useState<SheetParent | null>(null);
  const [title, setTitle] = useState('');
  const [priorities, setPriorities] = useState<string[]>([]);
  const [dueDays, setDueDays] = useState<number | null>(null);
  const [est, setEst] = useState('');
  const [notes, setNotes] = useState('');

  useImperativeHandle(
    ref,
    () => ({
      present: (nextParent?: SheetParent) => {
        setParent(nextParent ?? null);
        sheetRef.current?.present();
      },
    }),
    []
  );

  const reset = useCallback(() => {
    setParent(null);
    setTitle('');
    setPriorities([]);
    setDueDays(null);
    setEst('');
    setNotes('');
  }, []);

  const togglePriority = (p: string) =>
    setPriorities((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const submit = () => {
    const value = title.trim();
    if (!value) return;
    const hours = parseFloat(est);
    const opts = {
      priorities: priorities.length ? priorities : null,
      due_at: dueDays === null ? null : endOfDayIn(dueDays),
      estimated_hours: Number.isFinite(hours) ? hours : null,
      notes: notes.trim(),
    };
    if (parent) addNested(parent.id, value, opts);
    else add(value, opts);
    sheetRef.current?.dismiss();
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

  const canSubmit = title.trim().length > 0;

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      onDismiss={reset}>
      <BottomSheetView style={styles.content}>
        <Text className="text-lg font-semibold text-white">
          {parent ? 'New subtask' : 'New task'}
        </Text>
        {parent ? (
          <Text className="text-sm text-neutral-400" numberOfLines={1}>
            under “{parent.text}”
          </Text>
        ) : null}

        <BottomSheetTextInput
          value={title}
          onChangeText={setTitle}
          placeholder={parent ? 'Subtask title…' : 'What needs doing?  (use #tags)'}
          placeholderTextColor="#737373"
          style={styles.titleInput}
          returnKeyType="done"
        />

        <FieldLabel>Priorities</FieldLabel>
        <View className="flex-row gap-2">
          {PRIORITIES.map((p) => {
            const on = priorities.includes(p);
            const onBg = p === 'important' ? 'bg-priority-important' : 'bg-priority-urgent';
            return (
              <Pressable
                key={p}
                onPress={() => togglePriority(p)}
                className={`rounded-full px-4 py-2 ${on ? onBg : 'bg-neutral-800'}`}>
                <Text
                  className={`text-sm ${
                    on ? 'font-semibold text-neutral-950' : 'text-neutral-300'
                  }`}>
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FieldLabel>Due date</FieldLabel>
        <View className="flex-row flex-wrap gap-2">
          {DUE_OPTIONS.map((o) => {
            const on = o.days === dueDays;
            return (
              <Pressable
                key={o.label}
                onPress={() => setDueDays(o.days)}
                className={`rounded-full px-4 py-2 ${on ? 'bg-blue-500' : 'bg-neutral-800'}`}>
                <Text
                  className={`text-sm ${on ? 'font-semibold text-white' : 'text-neutral-300'}`}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FieldLabel>Estimated hours</FieldLabel>
        <BottomSheetTextInput
          value={est}
          onChangeText={setEst}
          keyboardType="decimal-pad"
          placeholder="e.g. 2"
          placeholderTextColor="#737373"
          style={[styles.input, { width: 100 }]}
        />

        <FieldLabel>Notes</FieldLabel>
        <BottomSheetTextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional notes…"
          placeholderTextColor="#737373"
          style={styles.notesInput}
        />

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          className={`mt-2 items-center rounded-xl py-3.5 ${
            canSubmit ? 'bg-blue-500 active:opacity-80' : 'bg-neutral-800'
          }`}>
          <Text
            className={`text-base font-semibold ${
              canSubmit ? 'text-white' : 'text-neutral-500'
            }`}>
            {parent ? 'Add subtask' : 'Add task'}
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  background: { backgroundColor: '#171717' },
  handle: { backgroundColor: '#525252', width: 40 },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 36, gap: 10 },
  titleInput: {
    backgroundColor: '#0a0a0a',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  input: {
    backgroundColor: '#0a0a0a',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  notesInput: {
    backgroundColor: '#0a0a0a',
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
