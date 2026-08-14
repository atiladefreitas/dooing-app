import { CATEGORY_HUES, Palette, ThemeName } from '@/constants/theme';
import { Block, Recurrence, RecurrenceType } from '@/types/block';

import { dateKey, parseKey, weekdayOf } from './date';
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

export function occursOn(block: Block, date: string): boolean {
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

export function blocksForDate(all: Block[], date: string): Block[] {
  return all.filter((b) => occursOn(b, date)).sort((a, b) => a.start_min - b.start_min);
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
  return out;
}

export function isValidKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeBlock(raw: unknown): Block | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const title = typeof r.title === 'string' ? r.title.trim() : '';
  if (!title) return null;
  if (!isValidKey(r.date)) return null;

  const start_min = clampStart(toNumber(r.start_min, 0));
  return {
    id: r.id != null ? String(r.id) : generateBlockId(),
    title,
    date: r.date,
    start_min,
    duration_min: clampDuration(toNumber(r.duration_min, MIN_DURATION), start_min),
    notes: typeof r.notes === 'string' ? r.notes.trim() : '',
    recurrence: normalizeRecurrence(r.recurrence),
    created_at: toNumber(r.created_at, nowSeconds()),
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
  return {
    id: generateBlockId(),
    title: draft.title.trim(),
    date: draft.date,
    start_min,
    duration_min: clampDuration(draft.duration_min, start_min),
    notes: (draft.notes ?? '').trim(),
    recurrence: normalizeRecurrence(draft.recurrence),
    created_at: nowSeconds(),
  };
}

export function toWireBlock(block: Block): Block {
  const start_min = clampStart(block.start_min);
  return {
    id: block.id,
    title: block.title.trim(),
    date: block.date,
    start_min,
    duration_min: clampDuration(block.duration_min, start_min),
    notes: block.notes.trim(),
    recurrence: normalizeRecurrence(block.recurrence),
    created_at: block.created_at,
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
  /** Cascade depth in its overlap cluster. 0 = earliest, leftmost, furthest back. */
  depth: number;
  /** Blocks in this cluster past the depth cap. Non-zero only on the topmost block. */
  overflow: number;
  /** Blocks in the cluster; 1 means no conflict. */
  clusterSize: number;
}

/** Hard ceiling on cascade levels; the real cap is width-aware, see below. */
export const MAX_CASCADE_DEPTH = 3;

/** Frontmost block never shrinks below this fraction of its column. */
const MIN_FRONT_WIDTH_RATIO = 0.55;

/**
 * Horizontal indent per cascade level — DESIGN.md §4.5. Scales with column width
 * so a 7-day week stays legible without wasting space in a single-day view.
 */
export function cascadeStep(colWidth: number): number {
  return Math.min(Math.max(colWidth * 0.13, 8), 22);
}

/**
 * Deepest cascade level a column can actually afford.
 *
 * A fixed cap of 4 levels reproduces the very bug the cascade replaces: on a
 * 7-day week (colWidth ≈ 49pt) depth 3 leaves the FRONTMOST block just 19pt wide.
 * Since indent comes off the width, the cap has to shrink with the column so the
 * block on top always stays readable. Wide views still get all 4 levels.
 */
export function maxCascadeDepth(colWidth: number): number {
  const affordable = Math.floor((colWidth * (1 - MIN_FRONT_WIDTH_RATIO)) / cascadeStep(colWidth));
  return Math.max(1, Math.min(MAX_CASCADE_DEPTH, affordable));
}

/** `colWidth` decides how many cascade levels fit; see maxCascadeDepth. */
export function layoutOverlaps(blocks: Block[], colWidth: number): PositionedBlock[] {
  const maxDepth = maxCascadeDepth(colWidth);
  const sorted = blocks
    .slice()
    .sort((a, b) => a.start_min - b.start_min || b.duration_min - a.duration_min);

  const out: PositionedBlock[] = [];
  let cluster: Block[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    // Cascade, not column-packing: dividing the column by cluster size produced
    // ~15pt slivers at three conflicts on a 7-day week, where NO block was
    // readable. Stepping them right keeps the frontmost fully legible and the
    // rest identifiable. See DESIGN.md §4.5.
    const overflow = Math.max(0, cluster.length - (maxDepth + 1));
    cluster.forEach((block, i) => {
      out.push({
        block,
        depth: Math.min(i, maxDepth),
        clusterSize: cluster.length,
        // Only the frontmost block carries the "+n" badge for the whole cluster.
        overflow: i === cluster.length - 1 ? overflow : 0,
      });
    });
    cluster = [];
    clusterEnd = -1;
  };

  for (const block of sorted) {
    if (cluster.length && block.start_min >= clusterEnd) flush();
    cluster.push(block);
    clusterEnd = Math.max(clusterEnd, endMin(block));
  }
  flush();

  return out;
}

export function totalMinutes(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + b.duration_min, 0);
}
