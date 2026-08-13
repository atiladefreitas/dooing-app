import { useBlocks } from '@/store/blocks';
import { useTodos } from '@/store/todos';
import { Block, Recurrence } from '@/types/block';
import { Todo } from '@/types/todo';

import { nowSeconds, toWireBlock } from './block';
import { addDays, endOfDaySeconds, todayKey } from './date';
import { extractCategory } from './todo';

const used = new Set<string>();

function uid(): string {
  let id = '';
  do {
    id = `${nowSeconds()}_${1000 + Math.floor(Math.random() * 9000)}`;
  } while (used.has(id));
  used.add(id);
  return id;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(p: number): boolean {
  return Math.random() < p;
}

const NOTE_POOL = [
  '',
  '',
  'Blocked on the staging deploy.',
  'Ask Rafa for the credentials first.',
  'Ship behind a feature flag.',
  'Remember: 25 min focus, 5 min break.',
  'Bring the receipts folder.',
];

const TAGS = ['#work', '#health', '#home', '#learn', '#admin'];

const FILLER_TITLES = [
  'Inbox triage',
  'Refactor the parser',
  'Sketch onboarding flow',
  'Review dependency bumps',
  'Write changelog',
  'Coffee with Ana',
  'Stretch + mobility',
  'Plan the week',
  'Backup the NAS',
  'Read release notes',
];

interface TodoSpec {
  text: string;
  done?: boolean;
  in_progress?: boolean;
  priorities?: string[] | null;
  dueOffset?: number | null;
  estimated_hours?: number | null;
  notes?: string;
  children?: TodoSpec[];
}

const TODO_SPECS: TodoSpec[] = [
  {
    text: 'Ship v1 of the API #work',
    in_progress: true,
    priorities: ['important', 'urgent'],
    dueOffset: 0,
    estimated_hours: 4,
    notes: 'Cut the release once migrations are green.',
    children: [
      { text: 'Write the migration script', done: true, estimated_hours: 1 },
      {
        text: 'Update the OpenAPI spec #work',
        dueOffset: 1,
        priorities: ['important'],
        children: [{ text: 'Review the diff with Rafa', in_progress: true, estimated_hours: 0.5 }],
      },
      { text: 'Tag the release', dueOffset: 2 },
    ],
  },
  {
    text: 'Fix the login redirect bug #work',
    priorities: ['urgent'],
    dueOffset: -2,
    estimated_hours: 1.5,
    notes: 'Repro: log out from /settings, land on a blank page.',
  },
  { text: 'Gym — leg day #health', dueOffset: 0 },
  { text: 'Read 30 pages of DDD #learn', estimated_hours: 0.5 },
  {
    text: 'Renew the passport #admin',
    priorities: ['important'],
    dueOffset: 14,
    notes: 'Photo booth on Rua Augusta. Bring the old passport and proof of address.',
  },
  { text: 'Call the dentist #health', done: true },
  {
    text: 'Grocery run #home',
    dueOffset: 1,
    children: [
      { text: 'Oat milk' },
      { text: 'Coffee beans', done: true },
      { text: 'Something green' },
    ],
  },
  {
    text: 'Plan the Q4 roadmap #work',
    in_progress: true,
    priorities: ['important'],
    dueOffset: 7,
    estimated_hours: 8,
  },
  { text: 'Deep clean the kitchen #home', estimated_hours: 3 },
  { text: 'Watch the Reanimated 4 talk #learn' },
  { text: 'Reply to the investor email #work', priorities: ['urgent'], dueOffset: -1 },
  { text: 'Meditate 10 min #health', done: true },
  {
    text: 'Sort out the taxes #admin',
    priorities: ['important', 'urgent'],
    dueOffset: 30,
    estimated_hours: 6,
    notes: 'Export invoices from the bank first.',
  },
  { text: 'A plain task with nothing set' },
  { text: 'Book flights to Lisbon', dueOffset: 21 },
];

function buildTodos(): { todos: Todo[]; byText: Map<string, string> } {
  const todos: Todo[] = [];
  const byText = new Map<string, string>();
  const created = nowSeconds();

  const walk = (spec: TodoSpec, parentId: string | null, depth: number, index: number) => {
    const id = uid();
    const done = spec.done ?? false;
    const todo: Todo = {
      id,
      text: spec.text,
      done,
      in_progress: !done && (spec.in_progress ?? false),
      category: extractCategory(spec.text),
      created_at: created - (todos.length + index) * 3600,
      completed_at: done ? created - randInt(1, 72) * 3600 : null,
      priorities: spec.priorities ?? null,
      estimated_hours: spec.estimated_hours ?? null,
      due_at:
        spec.dueOffset === undefined || spec.dueOffset === null
          ? null
          : endOfDaySeconds(addDays(todayKey(), spec.dueOffset)),
      notes: spec.notes ?? '',
      parent_id: parentId,
      depth,
      _origin: 'local',
      _dirty: true,
    };
    todos.push(todo);
    byText.set(spec.text, id);
    spec.children?.forEach((child, i) => walk(child, id, depth + 1, i));
  };

  TODO_SPECS.forEach((spec, i) => walk(spec, null, 0, i));
  return { todos, byText };
}

interface BlockSpec {
  title: string;
  dayOffset: number;
  start_min: number;
  duration_min: number;
  notes?: string;
  recurrence?: Recurrence | null;
  linkTo?: string;
}

const BLOCK_SPECS: BlockSpec[] = [
  { title: 'Journal', dayOffset: 0, start_min: 0, duration_min: 30 },
  { title: 'Morning routine #health', dayOffset: 0, start_min: 390, duration_min: 60 },
  {
    title: 'Deep work: API #work',
    dayOffset: 0,
    start_min: 540,
    duration_min: 120,
    notes: 'Phones off. Slack closed.',
    linkTo: 'Ship v1 of the API #work',
  },
  { title: 'Standup #work', dayOffset: 0, start_min: 600, duration_min: 30 },
  { title: 'Quick sync', dayOffset: 0, start_min: 600, duration_min: 30 },
  { title: 'Lunch', dayOffset: 0, start_min: 750, duration_min: 60 },
  {
    title: 'Fix login redirect #work',
    dayOffset: 0,
    start_min: 840,
    duration_min: 90,
    linkTo: 'Fix the login redirect bug #work',
  },
  { title: 'Gym — leg day #health', dayOffset: 0, start_min: 1110, duration_min: 60, linkTo: 'Gym — leg day #health' },
  { title: 'Read DDD #learn', dayOffset: 0, start_min: 1320, duration_min: 30, linkTo: 'Read 30 pages of DDD #learn' },
  { title: 'Wind down', dayOffset: 0, start_min: 1410, duration_min: 30 },

  { title: 'Retro #work', dayOffset: -1, start_min: 960, duration_min: 60 },
  { title: 'Dentist #health', dayOffset: -3, start_min: 660, duration_min: 60, linkTo: 'Call the dentist #health' },

  { title: 'Grocery run #home', dayOffset: 1, start_min: 1020, duration_min: 60, linkTo: 'Grocery run #home' },
  { title: 'Overlap A #work', dayOffset: 1, start_min: 540, duration_min: 120 },
  { title: 'Overlap B #learn', dayOffset: 1, start_min: 570, duration_min: 60 },
  { title: 'Overlap C #admin', dayOffset: 1, start_min: 600, duration_min: 90 },

  {
    title: 'Q4 roadmap workshop #work',
    dayOffset: 2,
    start_min: 780,
    duration_min: 180,
    notes: 'Whiteboard room booked.',
    linkTo: 'Plan the Q4 roadmap #work',
  },
  { title: 'Deep clean the kitchen #home', dayOffset: 5, start_min: 600, duration_min: 180, linkTo: 'Deep clean the kitchen #home' },
  { title: 'Taxes session #admin', dayOffset: 9, start_min: 540, duration_min: 240, linkTo: 'Sort out the taxes #admin' },

  {
    title: 'Daily standup #work',
    dayOffset: 0,
    start_min: 570,
    duration_min: 30,
    recurrence: { type: 'daily', until_date: addDays(todayKey(), 60) },
  },
  {
    title: 'Weekly 1:1 with Rafa #work',
    dayOffset: 0,
    start_min: 900,
    duration_min: 60,
    recurrence: { type: 'weekly' },
    notes: 'Rolling agenda in Notion.',
  },
  {
    title: 'Inbox zero #admin',
    dayOffset: 0,
    start_min: 480,
    duration_min: 30,
    recurrence: { type: 'weekdays', until_date: addDays(todayKey(), 90) },
  },
  {
    title: 'Strength training #health',
    dayOffset: 0,
    start_min: 390,
    duration_min: 60,
    recurrence: { type: 'custom', days: [2, 4, 6] },
  },
  {
    title: 'Weekly planning #admin',
    dayOffset: 0,
    start_min: 1140,
    duration_min: 90,
    recurrence: { type: 'custom', days: [1] },
    notes: 'Review the week, refill the calendar.',
  },
];

function buildBlocks(byText: Map<string, string>): {
  blocks: Block[];
  links: Record<string, string>;
} {
  const blocks: Block[] = [];
  const links: Record<string, string> = {};
  const today = todayKey();

  const push = (spec: BlockSpec) => {
    const id = uid();
    blocks.push(
      toWireBlock({
        id,
        title: spec.title,
        date: addDays(today, spec.dayOffset),
        start_min: spec.start_min,
        duration_min: spec.duration_min,
        notes: spec.notes ?? '',
        recurrence: spec.recurrence ?? null,
        created_at: nowSeconds() - randInt(0, 500_000),
      })
    );
    const todoId = spec.linkTo ? byText.get(spec.linkTo) : undefined;
    if (todoId) links[id] = todoId;
  };

  BLOCK_SPECS.forEach(push);

  for (let i = 0; i < 8; i += 1) {
    push({
      title: `${pick(FILLER_TITLES)} ${chance(0.7) ? pick(TAGS) : ''}`.trim(),
      dayOffset: randInt(-4, 13),
      start_min: randInt(14, 40) * 30,
      duration_min: randInt(1, 4) * 30,
      notes: pick(NOTE_POOL),
    });
  }

  return { blocks, links };
}

export interface DemoData {
  todos: Todo[];
  blocks: Block[];
  links: Record<string, string>;
}

export function buildDemoData(): DemoData {
  used.clear();
  const { todos, byText } = buildTodos();
  const { blocks, links } = buildBlocks(byText);
  return { todos, blocks, links };
}

export function loadDemoData(): { todos: number; blocks: number } {
  const { todos, blocks, links } = buildDemoData();

  useTodos.setState((s) => ({ todos: [...s.todos, ...todos] }));
  useBlocks.setState((s) => ({
    blocks: [...s.blocks, ...blocks],
    links: { ...s.links, ...links },
    local: { ...s.local, ...Object.fromEntries(blocks.map((b) => [b.id, true as const])) },
  }));

  return { todos: todos.length, blocks: blocks.length };
}
