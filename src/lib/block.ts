import { Block, Recurrence, RecurrenceType } from '@/types/block';

import { dateKey, parseKey, weekdayOf } from './date';

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

export const SURFACE = '#0a0a0a';

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

function makePalette(bar: string): BlockPalette {
  return {
    bar,
    fill: mix(bar, SURFACE, 0.24),
    border: mix(bar, SURFACE, 0.46),
    text: mix(bar, '#ffffff', 0.18),
    dim: mix(bar, SURFACE, 0.78),
    muted: mix(bar, SURFACE, 0.5),
  };
}

const PALETTE: BlockPalette[] = [
  '#60a5fa',
  '#4ade80',
  '#f472b6',
  '#fbbf24',
  '#a78bfa',
  '#22d3ee',
  '#fb923c',
  '#f87171',
  '#2dd4bf',
  '#818cf8',
  '#a3e635',
  '#e879f9',
].map(makePalette);

const NEUTRAL: BlockPalette = makePalette('#a3a3a3');

export function paletteForTag(tag: string): BlockPalette {
  if (!tag) return NEUTRAL;
  let hash = 2166136261;
  for (let i = 0; i < tag.length; i += 1) {
    hash = Math.imul(hash ^ tag.charCodeAt(i), 16777619);
  }
  hash = (hash ^ (hash >>> 15)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function paletteForBlock(block: Block): BlockPalette {
  return paletteForTag(extractTag(block.title));
}

export interface PositionedBlock {
  block: Block;
  column: number;
  columns: number;
}

export function layoutOverlaps(blocks: Block[]): PositionedBlock[] {
  const sorted = blocks
    .slice()
    .sort((a, b) => a.start_min - b.start_min || b.duration_min - a.duration_min);

  const out: PositionedBlock[] = [];
  let cluster: Block[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const assigned = cluster.map((block) => {
      let column = columnEnds.findIndex((end) => end <= block.start_min);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(0);
      }
      columnEnds[column] = endMin(block);
      return { block, column };
    });
    for (const item of assigned) {
      out.push({ ...item, columns: columnEnds.length });
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

  return out;
}

export function totalMinutes(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + b.duration_min, 0);
}
