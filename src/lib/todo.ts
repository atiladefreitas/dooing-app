import { Todo, TodoStatus, WireTodo } from '@/types/todo';

/** Current time in UNIX SECONDS, matching the plugin's `os.time()`. */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** ID in the plugin's format: `<unix_seconds>_<rand4>` (see state.lua add_todo). */
export function generateId(): string {
  return `${nowSeconds()}_${randInt(1000, 9999)}`;
}

/** Derive category from the first inline `#tag` (mirrors text:match("#(%w+)")). */
export function extractCategory(text: string): string {
  return text.match(/#(\w+)/)?.[1] ?? '';
}

/** Coerce an unknown to a finite number, or null. */
function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function getStatus(todo: Todo): TodoStatus {
  if (todo.done) return 'done';
  if (todo.in_progress) return 'in_progress';
  return 'pending';
}

/**
 * The status patch for the next state in the plugin's 3-state cycle
 * (pending → in_progress → done → pending). Mirrors state.lua toggle_todo.
 */
export function nextStatusPatch(
  todo: Todo
): Pick<Todo, 'done' | 'in_progress' | 'completed_at'> {
  if (!todo.in_progress && !todo.done) {
    return { in_progress: true, done: false, completed_at: null };
  }
  if (todo.in_progress) {
    return { in_progress: false, done: true, completed_at: nowSeconds() };
  }
  return { done: false, in_progress: false, completed_at: null };
}

interface CreateOptions {
  priorities?: string[] | null;
  due_at?: number | null;
  estimated_hours?: number | null;
  notes?: string;
  parent_id?: string | null;
  depth?: number;
}

/** Create a new local todo with plugin-compatible fields. */
export function createTodo(
  text: string,
  {
    priorities = null,
    due_at = null,
    estimated_hours = null,
    notes = '',
    parent_id = null,
    depth = 0,
  }: CreateOptions = {},
  origin = 'local'
): Todo {
  return {
    id: generateId(),
    text,
    done: false,
    in_progress: false,
    category: extractCategory(text),
    created_at: nowSeconds(),
    completed_at: null,
    priorities,
    estimated_hours,
    due_at,
    notes,
    parent_id,
    depth,
    _origin: origin,
    _dirty: true,
  };
}

/**
 * Normalize a raw todo from the server (or persisted storage) into a complete
 * Todo, filling defaults for absent fields (mirrors state.migrate_todos).
 */
export function normalizeTodo(raw: unknown, origin = 'server'): Todo {
  const r = (raw ?? {}) as Record<string, unknown>;
  const text = typeof r.text === 'string' ? r.text : '';
  const category =
    typeof r.category === 'string' && r.category ? r.category : extractCategory(text);

  return {
    id: r.id != null ? String(r.id) : generateId(),
    text,
    done: Boolean(r.done),
    in_progress: Boolean(r.in_progress),
    category,
    created_at: toNumberOrNull(r.created_at) ?? nowSeconds(),
    completed_at: toNumberOrNull(r.completed_at),
    priorities: Array.isArray(r.priorities) ? r.priorities.map(String) : null,
    estimated_hours: toNumberOrNull(r.estimated_hours),
    due_at: toNumberOrNull(r.due_at),
    notes: typeof r.notes === 'string' ? r.notes : '',
    parent_id: r.parent_id != null ? String(r.parent_id) : null,
    depth: toNumberOrNull(r.depth) ?? 0,
    _origin: origin,
    _dirty: false,
  };
}

/** Strip local-only metadata so the object matches the plugin's on-wire shape. */
export function toWire(todo: Todo): WireTodo {
  const { _origin, _dirty, ...wire } = todo;
  return wire;
}

/**
 * Insert a nested todo directly after its parent and the parent's existing
 * children — mirrors state.lua add_nested_todo (lines 316-322).
 */
export function insertNested(todos: Todo[], parentId: string, child: Todo): Todo[] {
  const parentIndex = todos.findIndex((t) => t.id === parentId);
  if (parentIndex === -1) return todos;
  let insertAt = parentIndex + 1;
  while (insertAt < todos.length && todos[insertAt].parent_id === parentId) {
    insertAt += 1;
  }
  const copy = todos.slice();
  copy.splice(insertAt, 0, child);
  return copy;
}

/**
 * Remove a todo, reparenting its direct children to the removed node's parent
 * (grandparent) so the tree stays connected. Depth is recomputed on display by
 * orderForDisplay, so the stored `depth` here is best-effort.
 */
export function removeTodo(todos: Todo[], id: string): Todo[] {
  const target = todos.find((t) => t.id === id);
  if (!target) return todos;
  const newParent = target.parent_id ?? null;
  return todos
    .filter((t) => t.id !== id)
    .map((t) =>
      t.parent_id === id
        ? { ...t, parent_id: newParent, depth: Math.max(0, t.depth - 1) }
        : t
    );
}

/**
 * Sibling ordering: incomplete first, then earliest due date, then more
 * priorities, then oldest. A simplified version of state.lua sorting.
 */
export function compareTodos(a: Todo, b: Todo): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const ad = a.due_at ?? Number.POSITIVE_INFINITY;
  const bd = b.due_at ?? Number.POSITIVE_INFINITY;
  if (ad !== bd) return ad - bd;
  const ap = a.priorities?.length ?? 0;
  const bp = b.priorities?.length ?? 0;
  if (ap !== bp) return bp - ap;
  return (a.created_at ?? 0) - (b.created_at ?? 0);
}

/**
 * Produce a render-ready list: children follow their parent, siblings sorted by
 * compareTodos, and `depth` recomputed from the actual tree so it can never
 * drift. Orphans (parent_id points to a missing todo) are promoted to top-level.
 */
export function orderForDisplay(
  todos: Todo[],
  collapsed?: ReadonlySet<string>
): Todo[] {
  const ids = new Set(todos.map((t) => t.id));
  const byParent = new Map<string, Todo[]>();
  const roots: Todo[] = [];

  for (const t of todos) {
    // A root is top-level, or an orphan whose parent no longer exists.
    if (t.parent_id == null || !ids.has(t.parent_id)) {
      roots.push(t);
      continue;
    }
    const list = byParent.get(t.parent_id);
    if (list) list.push(t);
    else byParent.set(t.parent_id, [t]);
  }

  const result: Todo[] = [];
  const walk = (node: Todo, depth: number) => {
    result.push(node.depth === depth ? node : { ...node, depth });
    // Collapsed nodes hide their whole subtree.
    if (collapsed?.has(node.id)) return;
    const children = (byParent.get(node.id) ?? []).slice().sort(compareTodos);
    for (const child of children) walk(child, depth + 1);
  };
  for (const root of roots.slice().sort(compareTodos)) walk(root, 0);

  return result;
}
