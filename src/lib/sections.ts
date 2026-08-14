import { DisplayRow, getStatus } from './todo';
import { TodoStatus } from '@/types/todo';

/**
 * Status sections for the todo list — DESIGN.md §4.4.
 *
 * Mirrors the Neovim plugin's modern style (`ui/modern.lua`): IN PROGRESS →
 * PENDING → DONE, in that order, empty sections omitted. Date buckets
 * (overdue/today/this week/…) were tried first and read as confusing — a todo's
 * date is already on its meta line, and the status line reports overdue counts,
 * so bucketing by date said nothing the row didn't already say.
 *
 * `SectionKey` IS `TodoStatus`, so the two can never drift apart.
 */

export type SectionKey = TodoStatus;

export const SECTION_ORDER: readonly SectionKey[] = ['in_progress', 'pending', 'done'] as const;

/** Rendered uppercase by Type.section. */
export const SECTION_LABEL: Record<SectionKey, string> = {
  in_progress: 'in progress',
  pending: 'pending',
  done: 'done',
};

export interface Section {
  key: SectionKey;
  rows: DisplayRow[];
  /** Top-level todos in this section, matching the plugin's per-group count. */
  count: number;
}

export type ListItem =
  | { kind: 'section'; key: SectionKey; count: number; first: boolean }
  | { kind: 'row'; row: DisplayRow };

/**
 * Bucket display rows by status, preserving tree order within each section.
 *
 * Only a ROOT's status decides where its subtree lands — an in-progress parent
 * keeps its pending children with it. Sectioning each todo independently would
 * scatter one tree across three sections and destroy the guides.
 */
export function buildSections(rows: DisplayRow[]): Section[] {
  const sections = new Map<SectionKey, Section>();

  let current: Section | null = null;

  for (const row of rows) {
    // Rows arrive in tree order, so a depth-0 row starts a new subtree and every
    // row after it belongs to that root until the next depth-0 row.
    if (row.guides.length === 0) {
      const key = getStatus(row.todo);
      const section = sections.get(key) ?? { key, rows: [], count: 0 };
      section.count += 1;
      sections.set(key, section);
      current = section;
    }
    current?.rows.push(row);
  }

  // Empty sections are omitted entirely, as in the plugin.
  return SECTION_ORDER.map((key) => sections.get(key)).filter(
    (s): s is Section => s != null && s.rows.length > 0
  );
}

/** Flatten sections into a single FlatList feed of headers and rows. */
export function toListItems(sections: Section[]): ListItem[] {
  return sections.flatMap((section, i) => [
    { kind: 'section' as const, key: section.key, count: section.count, first: i === 0 },
    ...section.rows.map((row) => ({ kind: 'row' as const, row })),
  ]);
}
