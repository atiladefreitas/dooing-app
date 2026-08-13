import { ChevronDown, ChevronRight, Clock } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { daysBetween, formatMinutes, shortDateLabel, todayKey, weekdayShort } from "@/lib/date";
import { ScheduledAt } from "@/lib/schedule";
import { getStatus } from "@/lib/todo";
import { Todo } from "@/types/todo";

import { StatusCheckbox } from "./status-checkbox";

function scheduleLabel({ block, date }: ScheduledAt): string {
  const today = todayKey();
  const time = formatMinutes(block.start_min);
  if (date === today) return `Today ${time}`;
  const ahead = daysBetween(today, date);
  if (ahead === 1) return `Tomorrow ${time}`;
  if (ahead > 1 && ahead < 7) return `${weekdayShort(date)} ${time}`;
  return `${shortDateLabel(date)} ${time}`;
}

const PRIORITY_BG: Record<string, string> = {
  important: "bg-priority-important",
  urgent: "bg-priority-urgent",
};

function formatDue(dueSeconds: number): { label: string; overdue: boolean } {
  const date = new Date(dueSeconds * 1000);
  return {
    label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    overdue: dueSeconds * 1000 < Date.now(),
  };
}

/** Render todo text, highlighting inline #tags. */
function TodoText({ text, done }: { text: string; done: boolean }) {
  const parts = text.split(/(#\w+)/g);
  return (
    <Text className={`text-base ${done ? "text-neutral-500 line-through" : "text-neutral-100"}`}>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <Text
            key={i}
            className={done ? "text-neutral-500" : "text-blue-400"}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

interface Props {
  todo: Todo;
  onToggle: () => void;
  onLongPress?: () => void;
  hasChildren?: boolean;
  childCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  scheduled?: ScheduledAt;
  onPressScheduled?: () => void;
}

export function TodoItem({
  todo,
  onToggle,
  onLongPress,
  hasChildren = false,
  childCount = 0,
  collapsed = false,
  onToggleCollapse,
  scheduled,
  onPressScheduled,
}: Props) {
  const status = getStatus(todo);
  const due = todo.due_at ? formatDue(todo.due_at) : null;
  const priorities = todo.priorities ?? [];
  const hasMeta = due || priorities.length > 0 || todo.estimated_hours || scheduled;

  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={{ marginLeft: todo.depth * 20 }}
      className="flex-row gap-2 items-start py-2 rounded-lg active:bg-neutral-900">
      <View
        className="justify-center"
        style={{ height: 24 }}>
        <StatusCheckbox
          status={status}
          onPress={onToggle}
        />
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row gap-2 items-center">
          <View className="flex-1">
            <TodoText
              text={todo.text}
              done={todo.done}
            />
          </View>
          {hasChildren && childCount > 0 ? (
            <Pressable
              hitSlop={8}
              onPress={onToggleCollapse}
              accessibilityRole="button"
              accessibilityLabel={collapsed ? "Expand subtasks" : "Collapse subtasks"}
              className="flex-row gap-1 items-center py-0.5 px-2 rounded-full bg-neutral-800 active:opacity-60">
              <Text className="text-xs text-neutral-400">{childCount}</Text>
              {collapsed ? (
                <ChevronRight
                  size={13}
                  color="#a3a3a3"
                  strokeWidth={2.5}
                />
              ) : (
                <ChevronDown
                  size={13}
                  color="#a3a3a3"
                  strokeWidth={2.5}
                />
              )}
            </Pressable>
          ) : null}
        </View>
        {hasMeta ? (
          <View className={`flex-row flex-wrap items-center gap-1.5 ${todo.done ? "opacity-40" : ""}`}>
            {priorities.map((p) => (
              <View
                key={p}
                className={`rounded-full px-2 py-0.5 ${PRIORITY_BG[p] ?? "bg-priority-info"}`}>
                <Text className="text-xs font-medium text-neutral-950">{p}</Text>
              </View>
            ))}
            {due ? (
              <View
                className={`rounded-full px-2 py-0.5 ${
                  due.overdue && !todo.done ? "bg-red-500/20" : "bg-neutral-800"
                }`}>
                <Text className={`text-xs ${due.overdue && !todo.done ? "text-red-400" : "text-neutral-400"}`}>
                  {due.label}
                </Text>
              </View>
            ) : null}
            {todo.estimated_hours ? (
              <View className="py-0.5 px-2 rounded-full bg-neutral-800">
                <Text className="text-xs text-neutral-400">{todo.estimated_hours}h</Text>
              </View>
            ) : null}
            {scheduled ? (
              <Pressable
                hitSlop={6}
                onPress={onPressScheduled}
                accessibilityRole="button"
                accessibilityLabel={`Scheduled ${scheduleLabel(scheduled)}`}
                style={{ backgroundColor: "#111c2d" }}
                className="flex-row gap-1 items-center py-0.5 px-2 rounded-full active:opacity-60">
                <Clock
                  size={11}
                  color="#60a5fa"
                  strokeWidth={2.5}
                />
                <Text className="text-xs text-blue-400">{scheduleLabel(scheduled)}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
