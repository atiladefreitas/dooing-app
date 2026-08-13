import { Block } from '@/types/block';
import { Todo } from '@/types/todo';

import { nextOccurrence } from './block';
import { keyFromSeconds } from './date';

export type LinkMap = Record<string, string>;

export function todoIdForBlock(links: LinkMap, blockId: string): string | null {
  return links[blockId] ?? null;
}

export function blockIdsByTodo(links: LinkMap): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [blockId, todoId] of Object.entries(links)) {
    (out[todoId] ??= []).push(blockId);
  }
  return out;
}

export interface ScheduledAt {
  block: Block;
  date: string;
}

export function nextScheduleFor(
  todoId: string,
  blocks: Block[],
  links: LinkMap,
  from: string
): ScheduledAt | null {
  const ids = new Set(
    Object.entries(links)
      .filter(([, id]) => id === todoId)
      .map(([blockId]) => blockId)
  );
  if (!ids.size) return null;

  let best: ScheduledAt | null = null;
  for (const block of blocks) {
    if (!ids.has(block.id)) continue;
    const date = nextOccurrence(block, from);
    if (!date) continue;
    if (
      !best ||
      date < best.date ||
      (date === best.date && block.start_min < best.block.start_min)
    ) {
      best = { block, date };
    }
  }
  return best;
}

export function scheduleMap(
  todos: Todo[],
  blocks: Block[],
  links: LinkMap,
  from: string
): Record<string, ScheduledAt> {
  const byTodo = blockIdsByTodo(links);
  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const out: Record<string, ScheduledAt> = {};

  for (const todo of todos) {
    const ids = byTodo[todo.id];
    if (!ids?.length) continue;
    let best: ScheduledAt | null = null;
    for (const id of ids) {
      const block = blockById.get(id);
      if (!block) continue;
      const date = nextOccurrence(block, from);
      if (!date) continue;
      if (
        !best ||
        date < best.date ||
        (date === best.date && block.start_min < best.block.start_min)
      ) {
        best = { block, date };
      }
    }
    if (best) out[todo.id] = best;
  }
  return out;
}

export function dueTodosOn(todos: Todo[], date: string): Todo[] {
  return todos.filter((t) => t.due_at != null && keyFromSeconds(t.due_at) === date);
}

export function unscheduledTodos(todos: Todo[], links: LinkMap): Todo[] {
  const scheduled = new Set(Object.values(links));
  return todos.filter((t) => !t.done && !scheduled.has(t.id));
}
