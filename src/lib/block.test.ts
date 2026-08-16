import { describe, expect, it, vi } from 'vitest';

import { Block } from '@/types/block';

import { blocksForDate, createBlock, normalizeBlock, occursOn, toWireBlock } from './block';

// block.ts also carries the palette code, whose import chain reaches
// react-native (Flow syntax node cannot parse). The logic under test never
// touches it, so give the module the minimal shape it builds palettes from.
// vi.mock is hoisted above the imports at transform time.
vi.mock('@/constants/theme', () => ({
  CATEGORY_HUES: [],
  Palette: {
    night: { canvas: '#1a1b26', fg: '#c0caf5', fgMuted: '#565f89' },
    day: { canvas: '#f5f5f8', fg: '#2a2c3d', fgMuted: '#767b91' },
  },
}));

/** A minimal valid wire block, bloocky 1.1.0-shaped. */
function wire(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '1755043200_4821',
    title: 'Deep work',
    date: '2026-08-17',
    start_min: 540,
    duration_min: 90,
    notes: '',
    created_at: 1755043200,
    ...extra,
  };
}

describe('normalizeBlock — the 1.1.0 wire contract', () => {
  it('keeps updated_at, source and all_day', () => {
    const block = normalizeBlock(
      wire({ updated_at: 1755999999, source: 'work', all_day: true, duration_min: 4320 })
    )!;
    expect(block.updated_at).toBe(1755999999);
    expect(block.source).toBe('work');
    expect(block.all_day).toBe(true);
  });

  it('leaves the optional fields ABSENT when absent — not null, not defaulted', () => {
    const block = normalizeBlock(wire())!;
    expect('updated_at' in block).toBe(false);
    expect('source' in block).toBe(false);
    expect('all_day' in block).toBe(false);
  });

  it('passes unknown keys through — bloocky may grow fields we do not know', () => {
    const block = normalizeBlock(wire({ some_future_field: { a: 1 } }))!;
    expect((block as unknown as Record<string, unknown>).some_future_field).toEqual({ a: 1 });
  });

  it('keeps recurrence exdates', () => {
    const block = normalizeBlock(
      wire({ recurrence: { type: 'weekly', exdates: ['2026-08-24', 'garbage'] } })
    )!;
    expect(block.recurrence?.exdates).toEqual(['2026-08-24']);
  });

  it('does NOT clamp an all-day span to one day', () => {
    const holiday = normalizeBlock(wire({ all_day: true, duration_min: 3 * 1440 }))!;
    expect(holiday.duration_min).toBe(3 * 1440);
  });

  it('still clamps timed blocks to the day', () => {
    const block = normalizeBlock(wire({ start_min: 1400, duration_min: 500 }))!;
    expect(block.start_min + block.duration_min).toBeLessThanOrEqual(1440);
  });
});

describe('toWireBlock', () => {
  it('is not a whitelist: unknown keys and source survive an edit', () => {
    const block = normalizeBlock(wire({ source: 'work', custom_key: 'kept' }))!;
    const out = toWireBlock({ ...block, title: 'Edited' });
    expect(out.source).toBe('work');
    expect((out as unknown as Record<string, unknown>).custom_key).toBe('kept');
  });

  it('bumps updated_at on edit', () => {
    const block = normalizeBlock(wire({ updated_at: 1000 }))!;
    const out = toWireBlock(block);
    expect(out.updated_at).toBeGreaterThan(1000);
  });

  it('never rewrites an all-day block’s timing', () => {
    const holiday = normalizeBlock(wire({ all_day: true, start_min: 0, duration_min: 4320 }))!;
    const out = toWireBlock({ ...holiday, title: 'Renamed holiday' });
    expect(out.duration_min).toBe(4320);
    expect(out.all_day).toBe(true);
  });
});

describe('createBlock', () => {
  it('stamps source: "local" — "belongs here", not "not yet pushed"', () => {
    const block = createBlock({ title: 'Gym', date: '2026-08-17', start_min: 600, duration_min: 60 });
    expect(block.source).toBe('local');
    expect(block.updated_at).toBe(block.created_at);
  });
});

describe('occursOn — exdates and all-day spans', () => {
  const weekly: Block = {
    id: 'w',
    title: 'Standup',
    date: '2026-08-17', // a Monday
    start_min: 600,
    duration_min: 30,
    notes: '',
    recurrence: { type: 'weekly', exdates: ['2026-08-24'] },
    created_at: 0,
  };

  it('recurs weekly on the start weekday', () => {
    expect(occursOn(weekly, '2026-08-17')).toBe(true);
    expect(occursOn(weekly, '2026-08-31')).toBe(true);
    expect(occursOn(weekly, '2026-08-18')).toBe(false);
  });

  it('skips an exdate — the fixed weekly meeting with a skipped week', () => {
    expect(occursOn(weekly, '2026-08-24')).toBe(false);
  });

  const holiday: Block = {
    id: 'h',
    title: 'Trip',
    date: '2026-08-20',
    start_min: 0,
    duration_min: 3 * 1440, // three days
    notes: '',
    recurrence: null,
    created_at: 0,
    all_day: true,
  };

  it('covers every day of a multi-day all-day block', () => {
    expect(occursOn(holiday, '2026-08-20')).toBe(true);
    expect(occursOn(holiday, '2026-08-21')).toBe(true);
    expect(occursOn(holiday, '2026-08-22')).toBe(true);
    expect(occursOn(holiday, '2026-08-23')).toBe(false);
  });

  it('a timed block never spans, whatever its duration says', () => {
    const timed: Block = { ...holiday, all_day: undefined, duration_min: 1440 };
    expect(occursOn(timed, '2026-08-21')).toBe(false);
  });

  it('sorts all-day blocks first for a date', () => {
    const timed = createBlock({ title: 'Gym', date: '2026-08-21', start_min: 60, duration_min: 60 });
    const list = blocksForDate([timed, holiday], '2026-08-21');
    expect(list[0].id).toBe('h');
    expect(list[1].id).toBe(timed.id);
  });
});
