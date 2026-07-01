import { router } from "expo-router";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { getStatus } from "@/lib/todo";
import { Todo } from "@/types/todo";

import { StatusCheckbox } from "./status-checkbox";

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
}

export function TodoItem({
  todo,
  onToggle,
  onLongPress,
  hasChildren = false,
  childCount = 0,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const status = getStatus(todo);
  const due = todo.due_at ? formatDue(todo.due_at) : null;
  const priorities = todo.priorities ?? [];
  const hasMeta = due || priorities.length > 0 || todo.estimated_hours;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/todo/[id]", params: { id: todo.id } })}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={{ marginLeft: todo.depth * 20 }}
      className="flex-row gap-2 items-start py-2 rounded-lg active:bg-neutral-900">
      {hasChildren ? (
        <Pressable
          hitSlop={10}
          onPress={onToggleCollapse}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? "Expand subtasks" : "Collapse subtasks"}
          className="pt-0.5 active:opacity-60">
          {collapsed ? (
            <ChevronRight
              size={18}
              color="#a3a3a3"
              strokeWidth={2.5}
            />
          ) : (
            <ChevronDown
              size={18}
              color="#a3a3a3"
              strokeWidth={2.5}
            />
          )}
        </Pressable>
      ) : (
        <View className="w-[18px]" />
      )}
      <StatusCheckbox
        status={status}
        onPress={onToggle}
      />
      <View className="flex-1 gap-1">
        <View className="flex-row gap-2 items-center">
          <View className="flex-1">
            <TodoText
              text={todo.text}
              done={todo.done}
            />
          </View>
          {collapsed && childCount > 0 ? (
            <View className="py-0.5 px-2 rounded-full bg-neutral-800">
              <Text className="text-xs text-neutral-400">{childCount}</Text>
            </View>
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
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
