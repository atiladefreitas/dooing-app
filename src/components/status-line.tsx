import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Type } from "@/constants/theme";
import { useTodos } from "@/store/todos";

/**
 * Status line — DESIGN.md §4.6. Sits directly above the tab bar and reports live
 * state the way a vim mode-line does. Informational only; navigation stays in the
 * tab bar below it.
 */

/**
 * A ticking clock, so "synced 2m" and the overdue count stay true without an
 * unrelated re-render. Also keeps `Date.now()` out of the render path, which is
 * impure and flagged as such.
 */
function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function sinceLabel(seconds: number, now: number): string {
  const delta = Math.max(0, Math.floor(now / 1000 - seconds));
  if (delta < 60) return "now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h`;
  return `${Math.floor(delta / 86400)}d`;
}

function Separator() {
  return (
    <Text
      style={Type.status}
      className="px-2 text-fg-faint">
      ·
    </Text>
  );
}

export function StatusLine() {
  const todos = useTodos((s) => s.todos);
  const lastSync = useTodos((s) => s.lastSync);

  const now = useNow();
  const open = todos.filter((t) => !t.done).length;
  const overdue = todos.filter(
    (t) => !t.done && t.due_at != null && t.due_at * 1000 < now,
  ).length;

  return (
    <View
      className="flex-row items-center border-t border-line bg-surface"
      style={{ height: 24, paddingHorizontal: 16 }}>
      <Text
        style={Type.status}
        className="text-fg-muted">
        {open} open
      </Text>

      {overdue > 0 ? (
        <>
          <Separator />
          <Text
            style={Type.status}
            className="text-danger">
            {overdue} overdue
          </Text>
        </>
      ) : null}

      <Separator />
      <Text
        style={Type.status}
        className="text-fg-muted">
        {lastSync ? `synced ${sinceLabel(lastSync.at, now)}` : "never synced"}
      </Text>
    </View>
  );
}
