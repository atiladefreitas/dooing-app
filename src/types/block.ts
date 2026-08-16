/**
 * Block shape — must stay byte-compatible with bloocky.nvim's block objects
 * (v1.1.0). Source of truth: ../bloocky.nvim/docs/block-structure.md.
 *
 * Two rules from that contract:
 *  - `updated_at`, `source` and `all_day` are OPTIONAL: blocks written before
 *    sync existed have none. Absent `source` means "local"; absent
 *    `updated_at` falls back to `created_at`.
 *  - Unknown keys must be PRESERVED by anything that writes the shape back —
 *    bloocky's sync sidecar depends on the file round-tripping. normalizeBlock
 *    and toWireBlock carry them through at runtime.
 */
export type RecurrenceType = 'daily' | 'weekly' | 'weekdays' | 'custom';

export interface Recurrence {
  type: RecurrenceType;
  /** Weekday convention is C, not ISO: 1 = Sunday … 7 = Saturday. */
  days?: number[];
  until_date?: string;
  /** "YYYY-MM-DD" dates on which the whole occurrence is skipped (EXDATE). */
  exdates?: string[];
}

export interface Block {
  id: string;
  title: string;
  date: string;
  start_min: number;
  /** For an all-day block this carries the span in WHOLE DAYS × 1440. */
  duration_min: number;
  notes: string;
  recurrence?: Recurrence | null;
  created_at: number;
  /** Unix seconds, bumped on every edit. Absent on pre-sync blocks. */
  updated_at?: number;
  /** "local", or the sync account the block came from. Absent means "local". */
  source?: string;
  /** A date, not a time — rendered above the hour grid, never in it. */
  all_day?: boolean;
}

export type CalendarView = 'day' | 'week' | 'month';
