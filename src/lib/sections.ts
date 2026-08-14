import { daysBetween, keyFromSeconds } from './date';
import { ScheduledAt } from './schedule';
import { DisplayRow } from './todo';
import { Todo } from '@/types/todo';

/**
 * Date sections for the todo list — DESIGN.md §4.4.
 *
 * Grouping is by ROOT, never per todo: a root carries its whole subtree into
 * whichever section it lands in. Bucketing each todo independently would scatter
 * a tree across several sections and destroy the guides.
 */

export type SectionKey = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'someday';

export const SECTION_ORDER: readonly SectionKey[] = [
  'overdue',
  'today',
  'tomorrow',
  'week',
  'later',
  'someday',
] as const;

/** Rendered uppercase by Type.section. */
export const SECTION_LABEL: Record<SectionKey, string> = {
  overdue: 'overdue',
  today: 'today',
  tomorrow: 'tomorrow',
  week: 'this week',
  later: 'later',
  someday: 'someday',
};

const RANK: Record<SectionKey, number> = SECTION_ORDER.reduce(
  (acc, key, i) => ({ ...acc, [key]: i }),
  {} as Record<SectionKey, number>
);

function bucketForDate(date: string, today: string): SectionKey {
  if (date < today) return 'overdue';
  if (date === today) return 'today';
  const ahead = daysBetween(today, date);
  if (ahead === 1) return 'tomorrow';
  if (ahead <= 7) return 'week';
  return 'later';
}

/**
 * A todo's own bucket: due date first, then its next scheduled block, else undated.
 *
 * A completed todo is never "overdue" — it is history, not a problem — so a done
 * todo with a past date settles into `today` instead.
 */
function bucketForTodo(
  todo: Todo,
  scheduled: Record<string, ScheduledAt>,
  today: string
): SectionKey {
  const date =
    todo.due_at != null ? keyFromSeconds(todo.due_at) : scheduled[todo.id]?.date;
  if (!date) return 'someday';

  const bucket = bucketForDate(date, today);
  return bucket === 'overdue' && todo.done ? 'today' : bucket;
}

export interface Section {
  key: SectionKey;
  rows: DisplayRow[];
  done: number;
  total: number;
}

export type ListItem =
  | { kind: 'section'; key: SectionKey; done: number; total: number; first: boolean }
  | { kind: 'row'; row: DisplayRow };

/**
 * Bucket display rows into sections, preserving tree order within each.
 *
 * A root takes the EARLIEST bucket found anywhere in its subtree, so a project
 * surfaces under TODAY when one of its subtasks is due today. Subtree stats come
 * from the full todo list rather than the visible rows, so collapsing a branch
 * never moves its parent to a different section.
 */
export function buildSections(
  rows: DisplayRow[],
  todos: Todo[],
  scheduled: Record<string, ScheduledAt>,
  today: string
): Section[] {
  const ids = new Set(todos.map((t) => t.id));
  const byParent = new Map<string, Todo[]>();
  for (const t of todos) {
    if (t.parent_id == null || !ids.has(t.parent_id)) continue;
    const list = byParent.get(t.parent_id);
    if (list) list.push(t);
    else byParent.set(t.parent_id, [t]);
  }

  const subtreeOf = (root: Todo): Todo[] => {
    const out = [root];
    const stack = [root.id];
    while (stack.length) {
      for (const child of byParent.get(stack.pop()!) ?? []) {
        out.push(child);
        stack.push(child.id);
      }
    }
    return out;
  };

  const sections = new Map<SectionKey, Section>();
  const push = (key: SectionKey, group: DisplayRow[], subtree: Todo[]) => {
    const section =
      sections.get(key) ?? { key, rows: [], done: 0, total: 0 };
    section.rows.push(...group);
    section.total += subtree.length;
    section.done += subtree.filter((t) => t.done).length;
    sections.set(key, section);
  };

  // Rows arrive in tree order, so a root (depth 0) starts a new group and every
  // row after it belongs to that root until the next depth-0 row.
  let group: DisplayRow[] = [];
  let root: Todo | null = null;

  const flush = () => {
    if (!root) return;
    const subtree = subtreeOf(root);
    const key = subtree
      .map((t) => bucketForTodo(t, scheduled, today))
      .reduce((best, k) => (RANK[k] < RANK[best] ? k : best), 'someday' as SectionKey);
    push(key, group, subtree);
    group = [];
    root = null;
  };

  for (const row of rows) {
    if (row.guides.length === 0) {
      flush();
      root = row.todo;
    }
    group.push(row);
  }
  flush();

  // TODAY is the anchor and always shows, even when empty.
  return SECTION_ORDER.map(
    (key) => sections.get(key) ?? { key, rows: [], done: 0, total: 0 }
  ).filter((s) => s.rows.length > 0 || s.key === 'today');
}

/** Flatten sections into a single FlatList feed of headers and rows. */
export function toListItems(sections: Section[]): ListItem[] {
  return sections.flatMap((section, i) => [
    {
      kind: 'section' as const,
      key: section.key,
      done: section.done,
      total: section.total,
      first: i === 0,
    },
    ...section.rows.map((row) => ({ kind: 'row' as const, row })),
  ]);
}
