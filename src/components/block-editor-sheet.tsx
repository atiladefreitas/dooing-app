import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { ChevronLeft, ChevronRight, Link2, Trash2 } from 'lucide-react-native';
import { forwardRef, ReactNode, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { GRANULARITY, MIN_DURATION, isValidKey } from '@/lib/block';
import {
  addDays,
  addMonths,
  formatDuration,
  formatMinutes,
  longDateLabel,
  todayKey,
} from '@/lib/date';
import { useBlocks } from '@/store/blocks';
import { Block, Recurrence, RecurrenceType } from '@/types/block';

import { BottomSheetKeyboardAwareScrollView } from './bottom-sheet-keyboard-aware-scroll-view';

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceType | 'none' }[] = [
  { label: 'None', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Custom', value: 'custom' },
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const UNTIL_PRESETS: { label: string; months: number | null }[] = [
  { label: 'Forever', months: null },
  { label: '1 month', months: 1 },
  { label: '3 months', months: 3 },
  { label: '1 year', months: 12 },
];

export type BlockEditorTarget =
  | { mode: 'create'; date: string; start_min: number; duration_min: number; todoId?: string | null; title?: string }
  | { mode: 'edit'; block: Block };

export type BlockEditorSheetRef = {
  present: (target: BlockEditorTarget) => void;
};

interface Props {
  onSaved?: (date: string) => void;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
      {children}
    </Text>
  );
}

function Stepper({
  value,
  onDown,
  onUp,
  sub,
}: {
  value: string;
  onDown: () => void;
  onUp: () => void;
  sub?: string;
}) {
  return (
    <View className="flex-row items-center gap-1 rounded-xl bg-neutral-950 p-1">
      <Pressable
        onPress={onDown}
        hitSlop={6}
        className="h-9 w-9 items-center justify-center rounded-lg active:bg-neutral-800">
        <ChevronLeft size={18} color="#a3a3a3" />
      </Pressable>
      <View className="min-w-[92px] items-center">
        <Text className="text-base font-semibold tabular-nums text-white">{value}</Text>
        {sub ? <Text className="text-[10px] text-neutral-500">{sub}</Text> : null}
      </View>
      <Pressable
        onPress={onUp}
        hitSlop={6}
        className="h-9 w-9 items-center justify-center rounded-lg active:bg-neutral-800">
        <ChevronRight size={18} color="#a3a3a3" />
      </Pressable>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3.5 py-2 ${active ? 'bg-blue-500' : 'bg-neutral-800'}`}>
      <Text
        className={`text-[13px] ${active ? 'font-semibold text-white' : 'text-neutral-300'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export const BlockEditorSheet = forwardRef<BlockEditorSheetRef, Props>(function BlockEditorSheet(
  { onSaved },
  ref
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const addBlock = useBlocks((s) => s.add);
  const updateBlock = useBlocks((s) => s.update);
  const removeBlock = useBlocks((s) => s.remove);

  const [editing, setEditing] = useState<Block | null>(null);
  const [todoId, setTodoId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayKey());
  const [startMin, setStartMin] = useState(540);
  const [durationMin, setDurationMin] = useState(60);
  const [notes, setNotes] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | 'none'>('none');
  const [days, setDays] = useState<number[]>([]);
  const [until, setUntil] = useState('');

  useImperativeHandle(
    ref,
    () => ({
      present: (target) => {
        if (target.mode === 'edit') {
          const b = target.block;
          setEditing(b);
          setTodoId(useBlocks.getState().links[b.id] ?? null);
          setTitle(b.title);
          setDate(b.date);
          setStartMin(b.start_min);
          setDurationMin(b.duration_min);
          setNotes(b.notes);
          setRecurrenceType(b.recurrence?.type ?? 'none');
          setDays(b.recurrence?.days ?? []);
          setUntil(b.recurrence?.until_date ?? '');
        } else {
          setEditing(null);
          setTodoId(target.todoId ?? null);
          setTitle(target.title ?? '');
          setDate(target.date);
          setStartMin(target.start_min);
          setDurationMin(target.duration_min);
          setNotes('');
          setRecurrenceType('none');
          setDays([]);
          setUntil('');
        }
        sheetRef.current?.present();
      },
    }),
    []
  );

  const buildRecurrence = (): Recurrence | null => {
    if (recurrenceType === 'none') return null;
    const out: Recurrence = { type: recurrenceType };
    if (recurrenceType === 'custom') out.days = days.slice().sort();
    if (isValidKey(until)) out.until_date = until;
    return out;
  };

  const submit = () => {
    const value = title.trim();
    if (!value) return;
    if (recurrenceType === 'custom' && !days.length) {
      Alert.alert('Pick at least one day', 'A custom repeat needs one or more weekdays.');
      return;
    }
    const payload = {
      title: value,
      date,
      start_min: startMin,
      duration_min: durationMin,
      notes,
      recurrence: buildRecurrence(),
    };
    if (editing) updateBlock(editing.id, payload);
    else addBlock(payload, todoId);
    onSaved?.(date);
    sheetRef.current?.dismiss();
  };

  const confirmDelete = () => {
    if (!editing) return;
    const target = editing;
    const message = target.recurrence
      ? 'This deletes every occurrence in the series.'
      : target.title;
    sheetRef.current?.dismiss();
    Alert.alert('Delete block?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeBlock(target.id) },
    ]);
  };

  const toggleDay = (day: number) =>
    setDays((cur) => (cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day]));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} />
    ),
    []
  );

  const canSubmit = title.trim().length > 0;
  const endLabel = formatMinutes(startMin + durationMin);
  const untilValid = !until || isValidKey(until);

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}>
      <BottomSheetKeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}>
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-white">
            {editing ? 'Edit block' : 'New block'}
          </Text>
          {editing ? (
            <Pressable onPress={confirmDelete} hitSlop={8} className="active:opacity-60">
              <Trash2 size={18} color="#f87171" strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {todoId ? (
          <View className="flex-row items-center gap-1.5">
            <Link2 size={13} color="#60a5fa" />
            <Text className="text-xs text-blue-400">Linked to a to-do</Text>
          </View>
        ) : null}

        <BottomSheetTextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What are you working on?  (use #tags)"
          placeholderTextColor="#737373"
          style={styles.titleInput}
          returnKeyType="done"
        />

        <FieldLabel>Date</FieldLabel>
        <View className="flex-row items-center gap-2">
          <Stepper
            value={longDateLabel(date)}
            onDown={() => setDate((d) => addDays(d, -1))}
            onUp={() => setDate((d) => addDays(d, 1))}
          />
          {date !== todayKey() ? (
            <Pressable
              onPress={() => setDate(todayKey())}
              className="rounded-full bg-neutral-800 px-3 py-2 active:opacity-70">
              <Text className="text-[13px] text-neutral-300">Today</Text>
            </Pressable>
          ) : null}
        </View>

        <FieldLabel>Time</FieldLabel>
        <View className="flex-row flex-wrap items-center gap-2">
          <Stepper
            value={formatMinutes(startMin)}
            sub="start"
            onDown={() => setStartMin((m) => Math.max(0, m - GRANULARITY))}
            onUp={() => setStartMin((m) => Math.min(1440 - durationMin, m + GRANULARITY))}
          />
          <Stepper
            value={formatDuration(durationMin)}
            sub={`ends ${endLabel}`}
            onDown={() => setDurationMin((m) => Math.max(MIN_DURATION, m - GRANULARITY))}
            onUp={() => setDurationMin((m) => Math.min(1440 - startMin, m + GRANULARITY))}
          />
        </View>

        <FieldLabel>Repeats</FieldLabel>
        <View className="flex-row flex-wrap gap-2">
          {RECURRENCE_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              active={recurrenceType === o.value}
              onPress={() => setRecurrenceType(o.value)}
            />
          ))}
        </View>

        {recurrenceType === 'custom' ? (
          <View className="flex-row gap-2">
            {DAY_LABELS.map((label, i) => {
              const day = i + 1;
              const on = days.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
                  className={`h-10 flex-1 items-center justify-center rounded-full ${
                    on ? 'bg-blue-500' : 'bg-neutral-800'
                  }`}>
                  <Text
                    className={`text-[13px] ${on ? 'font-bold text-white' : 'text-neutral-400'}`}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {recurrenceType !== 'none' ? (
          <>
            <FieldLabel>Until</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {UNTIL_PRESETS.map((p) => (
                <Chip
                  key={p.label}
                  label={p.label}
                  active={p.months === null ? !until : until === addMonths(date, p.months)}
                  onPress={() => setUntil(p.months === null ? '' : addMonths(date, p.months))}
                />
              ))}
            </View>
            <BottomSheetTextInput
              value={until}
              onChangeText={setUntil}
              placeholder="YYYY-MM-DD  (empty = forever)"
              placeholderTextColor="#737373"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, !untilValid && styles.inputInvalid]}
            />
          </>
        ) : null}

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
            className={`text-base font-semibold ${canSubmit ? 'text-white' : 'text-neutral-500'}`}>
            {editing ? 'Save block' : 'Add block'}
          </Text>
        </Pressable>
      </BottomSheetKeyboardAwareScrollView>
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
  inputInvalid: { borderWidth: 1, borderColor: '#ef4444' },
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
