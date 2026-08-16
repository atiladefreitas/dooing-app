import { CATEGORY_HUES, Palette, ThemeName } from '@/constants/theme';
import { Block, Recurrence, RecurrenceType } from '@/types/block';

import { addDays, dateKey, parseKey, weekdayOf } from './date';
import { hashTag } from './palette';

export const GRANULARITY = 30;
export const MIN_DURATION = GRANULARITY;
export const DAY_MINUTES = 1440;

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function generateBlockId(): string {
  return `${nowSeconds()}_${Math.floor(Math.random() * 9000) + 1000}`;
}

export function snap(min: number, g = GRANULARITY): number {
  return Math.floor(min / g + 0.5) * g;
}

export function clampStart(min: number): number {
  return Math.min(Math.max(snap(min), 0), DAY_MINUTES - MIN_DURATION);
}

export function clampDuration(min: number, startMin = 0): number {
  const snapped = Math.max(snap(min), MIN_DURATION);
  return Math.min(snapped, DAY_MINUTES - startMin);
}

export function endMin(block: Block): number {
  return block.start_min + block.duration_min;
}

/**
 * Occurrence logic — a port of bloocky's state.lua (span_days / excluded /
 * starts_on / occurs_on), which is the reference implementation. Three rules
 * it gets right that the previous version here did not:
 *  - an exdate removes the WHOLE occurrence, span included;
 *  - only all-day blocks span days (duration ÷ 1440, capped at 366 so a
 *    malformed duration cannot turn a render into a long loop);
 *  - a multi-day all-day block covers every day it runs over, found by
 *    looking back from the queried date to a start.
 */

function spanDays(block: Block): number {
  if (!block.all_day) return 1;
  return Math.max(1, Math.min(366, Math.ceil((block.duration_min || DAY_MINUTES) / DAY_MINUTES)));
}

function excluded(block: Block, date: string): boolean {
  return (block.recurrence?.exdates ?? []).includes(date);
}

/** Whether an occurrence *begins* on the given day. */
function startsOn(block: Block, date: string): boolean {
  if (excluded(block, date)) return false;
  const r = block.recurrence;
  if (!r || typeof r !== 'object') return block.date === date;
  if (date < block.date) return false;
  if (r.until_date && date > r.until_date) return false;
  const wd = weekdayOf(date);
  switch (r.type) {
    case 'daily':
      return true;
    case 'weekly':
      return wd === weekdayOf(block.date);
    case 'weekdays':
      return wd >= 2 && wd <= 6;
    case 'custom':
      return (r.days ?? []).includes(wd);
    default:
      return false;
  }
}

/** Whether a block covers the given day (spans count every day they run over). */
export function occursOn(block: Block, date: string): boolean {
  if (startsOn(block, date)) return true;
  const span = spanDays(block);
  for (let back = 1; back < span; back += 1) {
    if (startsOn(block, addDays(date, -back))) return true;
  }
  return false;
}

/**
 * All blocks covering a date. All-day blocks come first — they are drawn above
 * the hour grid, not in it — and the rest sort by start time (same rule as
 * bloocky's blocks_for_date).
 */
export function blocksForDate(all: Block[], date: string): Block[] {
  return all
    .filter((b) => occursOn(b, date))
    .sort((a, b) => {
      if (!a.all_day !== !b.all_day) return a.all_day ? -1 : 1;
      return a.start_min - b.start_min;
    });
}

export function blocksByDate(all: Block[], dates: string[]): Record<string, Block[]> {
  const out: Record<string, Block[]> = {};
  for (const date of dates) out[date] = blocksForDate(all, date);
  return out;
}

export function nextOccurrence(block: Block, from: string): string | null {
  if (!block.recurrence) return block.date >= from ? block.date : null;
  const start = block.date > from ? block.date : from;
  const until = block.recurrence.until_date || null;
  const cursor = parseKey(start);
  for (let i = 0; i < 366; i += 1) {
    const key = dateKey(cursor);
    if (until && key > until) return null;
    if (occursOn(block, key)) return key;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

const RECURRENCE_TYPES: RecurrenceType[] = ['daily', 'weekly', 'weekdays', 'custom'];

export function isValidKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeRecurrence(raw: unknown): Recurrence | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const type = RECURRENCE_TYPES.find((t) => t === r.type);
  if (!type) return null;

  const out: Recurrence = { type };
  if (type === 'custom') {
    const days = Array.isArray(r.days)
      ? Array.from(new Set(r.days.map((d) => toNumber(d, 0)).filter((d) => d >= 1 && d <= 7))).sort()
      : [];
    out.days = days;
  }
  if (typeof r.until_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.until_date)) {
    out.until_date = r.until_date;
  }
  const exdates = Array.isArray(r.exdates) ? r.exdates.filter(isValidKey) : [];
  if (exdates.length) out.exdates = exdates;
  return out;
}

/**
 * Wire-contract fields beyond the validated core, carried through verbatim.
 * `updated_at`, `source` and `all_day` are OPTIONAL in bloocky 1.1.0 — absent
 * stays absent (a Lua reader distinguishes absent from null).
 */
function optionalWireFields(r: Record<string, unknown>): Partial<Block> {
  const out: Partial<Block> = {};
  const updated = toNumber(r.updated_at, 0);
  if (updated > 0) out.updated_at = updated;
  if (typeof r.source === 'string' && r.source !== '') out.source = r.source;
  if (r.all_day === true) out.all_day = true;
  return out;
}

export function normalizeBlock(raw: unknown): Block | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const title = typeof r.title === 'string' ? r.title.trim() : '';
  if (!title) return null;
  if (!isValidKey(r.date)) return null;

  const all_day = r.all_day === true;
  const start_min = all_day ? 0 : clampStart(toNumber(r.start_min, 0));
  return {
    // Spread the raw object FIRST: keys this app does not know about (written
    // by bloocky, or by a future bloocky) must survive the round trip.
    // Validated fields then overwrite their raw counterparts.
    ...(r as object),
    id: r.id != null ? String(r.id) : generateBlockId(),
    title,
    date: r.date,
    start_min,
    // An all-day block's duration carries its span in whole days — clamping
    // it to the end of one day would truncate every multi-day holiday.
    duration_min: all_day
      ? Math.max(DAY_MINUTES, toNumber(r.duration_min, DAY_MINUTES))
      : clampDuration(toNumber(r.duration_min, MIN_DURATION), start_min),
    notes: typeof r.notes === 'string' ? r.notes.trim() : '',
    recurrence: normalizeRecurrence(r.recurrence),
    created_at: toNumber(r.created_at, nowSeconds()),
    ...optionalWireFields(r),
  };
}

interface BlockDraft {
  title: string;
  date: string;
  start_min: number;
  duration_min: number;
  notes?: string;
  recurrence?: Recurrence | null;
}

export function createBlock(draft: BlockDraft): Block {
  const start_min = clampStart(draft.start_min);
  const created = nowSeconds();
  return {
    id: generateBlockId(),
    title: draft.title.trim(),
    date: draft.date,
    start_min,
    duration_min: clampDuration(draft.duration_min, start_min),
    notes: (draft.notes ?? '').trim(),
    recurrence: normalizeRecurrence(draft.recurrence),
    created_at: created,
    updated_at: created,
    // "Belongs here", not "not yet pushed": a block with no calendar and no
    // paired device travels no road at all, and that is a correct end state.
    source: 'local',
  };
}

/**
 * Re-validate a block after an edit. NOT a whitelist: unknown keys ride
 * through (the spread), `updated_at` is bumped, and `source`/`all_day` are
 * preserved. An all-day block's timing is not touched at all — the app has no
 * way to express "a date, not a time", so it must not rewrite one.
 */
export function toWireBlock(block: Block): Block {
  if (block.all_day) {
    return { ...block, title: block.title.trim(), notes: block.notes.trim(), updated_at: nowSeconds() };
  }
  const start_min = clampStart(block.start_min);
  return {
    ...block,
    title: block.title.trim(),
    date: block.date,
    start_min,
    duration_min: clampDuration(block.duration_min, start_min),
    notes: block.notes.trim(),
    recurrence: normalizeRecurrence(block.recurrence),
    updated_at: nowSeconds(),
  };
}

export function extractTag(title: string): string {
  return title.match(/#(\w+)/)?.[1]?.toLowerCase() ?? '';
}

export function stripTags(title: string): string {
  return title.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
}

export interface BlockPalette {
  bar: string;
  fill: string;
  border: string;
  text: string;
  dim: string;
  muted: string;
}

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex: string, base: string, amount: number): string {
  const [r1, g1, b1] = channels(hex);
  const [r2, g2, b2] = channels(base);
  const blend = (a: number, b: number) => Math.round(a * amount + b * (1 - amount));
  const value = (blend(r1, r2) << 16) | (blend(g1, g2) << 8) | blend(b1, b2);
  return `#${value.toString(16).padStart(6, '0')}`;
}

/**
 * How a category hue becomes a block's surface, per theme.
 *
 * `mix(hue, base, n)` is n parts hue to (1-n) parts background, so the same
 * formula yields a dark tint on Night and a pale one on Day. Text is the one
 * asymmetry: Night lightens the hue toward white, Day darkens it toward the
 * foreground, since it sits on a pale fill.
 */
const RECIPE = {
  night: { fill: 0.24, border: 0.46, dim: 0.78, muted: 0.5, textToward: '#ffffff', text: 0.18 },
  day: { fill: 0.14, border: 0.4, dim: 0.85, muted: 0.55, textToward: Palette.day.fg, text: 0.55 },
} as const;

function makePalette(bar: string, theme: ThemeName): BlockPalette {
  const r = RECIPE[theme];
  const base = Palette[theme].canvas;
  return {
    bar,
    fill: mix(bar, base, r.fill),
    border: mix(bar, base, r.border),
    text: mix(bar, r.textToward, r.text),
    dim: mix(bar, base, r.dim),
    muted: mix(bar, base, r.muted),
  };
}

/**
 * Built from the SAME hue pool and hash the todo list uses (lib/palette.ts), so a
 * tag reads the same colour in both places. Blue and red are absent by design.
 */
const PALETTES: Record<ThemeName, BlockPalette[]> = {
  night: CATEGORY_HUES.map((hue) => makePalette(Palette.night[hue], 'night')),
  day: CATEGORY_HUES.map((hue) => makePalette(Palette.day[hue], 'day')),
};

const NEUTRALS: Record<ThemeName, BlockPalette> = {
  night: makePalette(Palette.night.fgMuted, 'night'),
  day: makePalette(Palette.day.fgMuted, 'day'),
};

export function paletteForTag(tag: string, theme: ThemeName): BlockPalette {
  if (!tag) return NEUTRALS[theme];
  return PALETTES[theme][hashTag(tag) % PALETTES[theme].length];
}

export function paletteForBlock(block: Block, theme: ThemeName): BlockPalette {
  return paletteForTag(extractTag(block.title), theme);
}

export interface PositionedBlock {
  block: Block;
  /** Lane within its overlap cluster. Lanes never overlap, so hit areas never do. */
  column: number;
  /** Lanes the cluster occupies, for width. 1 means no conflict — full width. */
  columns: number;
}

/** Blocks a cluster could not fit on screen, surfaced as a tappable `+n`. */
export interface OverflowMarker {
  key: string;
  startMin: number;
  count: number;
}

export interface DayLayout {
  positioned: PositionedBlock[];
  overflow: OverflowMarker[];
}

/** Narrowest lane we will render. Below this a block stops being a usable target. */
const MIN_BLOCK_WIDTH = 36;
const MAX_COLUMNS = 4;

/** Inset on each side of a day column, and the gap between adjacent lanes. */
export const COLUMN_PAD = 2;
export const BLOCK_GAP = 2;

/**
 * Lanes a column can afford.
 *
 * The gap between lanes has to be part of this sum: dividing only by
 * MIN_BLOCK_WIDTH allowed 3 lanes in a 113pt week column, which after the gap
 * left 34pt each — under the very floor this is meant to enforce.
 *
 * At least 2, so a conflict always renders as a conflict rather than
 * immediately collapsing into a `+n`.
 */
export function maxBlockColumns(colWidth: number): number {
  const usable = colWidth - COLUMN_PAD * 2;
  return Math.max(
    2,
    Math.min(MAX_COLUMNS, Math.floor(usable / (MIN_BLOCK_WIDTH + BLOCK_GAP)))
  );
}

/**
 * Lay out a day's blocks into non-overlapping lanes — DESIGN.md §4.5.
 *
 * Lanes, NOT a cascade. A cascade (blocks stepped right, sharing a right edge,
 * later ones drawn on top) looked fine but was unusable: the block underneath
 * was only touchable in the 12–22pt strip its neighbour did not cover, far below
 * the 44pt minimum, and identical time ranges hid it completely. Lanes cannot
 * overlap by construction, so every block on screen is fully tappable.
 *
 * Greedy interval packing: a lane is reused as soon as its previous block ends,
 * so three blocks that merely chain (9–10, 10–11, 11–12) still share one lane
 * and stay full width.
 */
export function layoutOverlaps(blocks: Block[], colWidth: number): DayLayout {
  const maxCols = maxBlockColumns(colWidth);
  const sorted = blocks
    .slice()
    .sort((a, b) => a.start_min - b.start_min || b.duration_min - a.duration_min);

  const positioned: PositionedBlock[] = [];
  const overflow: OverflowMarker[] = [];
  let cluster: Block[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;

    const laneEnds: number[] = [];
    const assigned = cluster.map((block) => {
      let column = laneEnds.findIndex((end) => end <= block.start_min);
      if (column === -1) {
        column = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[column] = endMin(block);
      return { block, column };
    });

    const columns = Math.min(laneEnds.length, maxCols);
    const hidden = assigned.filter((a) => a.column >= maxCols);

    for (const a of assigned) {
      if (a.column < maxCols) positioned.push({ ...a, columns });
    }

    // Never drop blocks silently — say how many and let the user open the day.
    if (hidden.length) {
      overflow.push({
        key: `overflow-${cluster[0].id}`,
        startMin: Math.min(...hidden.map((h) => h.block.start_min)),
        count: hidden.length,
      });
    }

    cluster = [];
    clusterEnd = -1;
  };

  for (const block of sorted) {
    if (cluster.length && block.start_min >= clusterEnd) flush();
    cluster.push(block);
    clusterEnd = Math.max(clusterEnd, endMin(block));
  }
  flush();

  return { positioned, overflow };
}

export function totalMinutes(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + b.duration_min, 0);
}
