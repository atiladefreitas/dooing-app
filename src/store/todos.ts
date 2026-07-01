import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Todo } from '@/types/todo';
import {
  createTodo,
  extractCategory,
  insertNested,
  nextStatusPatch,
  normalizeTodo,
  nowSeconds,
  removeTodo,
} from '@/lib/todo';

export interface SyncInfo {
  host: string; // e.g. "http://192.168.1.20:7283"
  at: number; // unix seconds of last successful sync
}

interface CreateOpts {
  priorities?: string[] | null;
  due_at?: number | null;
  estimated_hours?: number | null;
  notes?: string;
}

interface TodosState {
  todos: Todo[];
  lastSync: SyncInfo | null;
  hydrated: boolean;
  /** UI-only: ids of parent todos whose subtree is collapsed in the list. */
  collapsed: Record<string, boolean>;

  /** Add a top-level todo. Returns the created todo. */
  add: (text: string, opts?: CreateOpts) => Todo;
  /** Add a nested todo under `parentId`. Returns null if the parent is gone. */
  addNested: (parentId: string, text: string, opts?: CreateOpts) => Todo | null;
  /** Patch a todo's fields (re-derives `category` when `text` changes). */
  update: (id: string, patch: Partial<Todo>) => void;
  /** Advance the 3-state status cycle (pending → in_progress → done → pending). */
  toggleStatus: (id: string) => void;
  /** Remove a todo, reparenting its children to the grandparent. */
  remove: (id: string) => void;
  /** Remove all completed todos. */
  clearCompleted: () => void;
  /**
   * Merge a raw payload from the Neovim server (GET /todos), keyed by id.
   * Server todos win for their ids; locally-created todos are preserved.
   * Returns how many were newly imported vs updated.
   */
  mergeServerTodos: (
    raw: unknown[],
    host: string
  ) => { imported: number; updated: number };
  /** Toggle whether a todo's subtree is collapsed in the list. */
  toggleCollapsed: (id: string) => void;
  /** Clear all local data. */
  reset: () => void;
}

export const useTodos = create<TodosState>()(
  persist(
    (set, get) => ({
      todos: [],
      lastSync: null,
      hydrated: false,
      collapsed: {},

      add: (text, opts) => {
        const todo = createTodo(text, {
          priorities: opts?.priorities ?? null,
          due_at: opts?.due_at ?? null,
          estimated_hours: opts?.estimated_hours ?? null,
          notes: opts?.notes ?? '',
        });
        set((s) => ({ todos: [...s.todos, todo] }));
        return todo;
      },

      addNested: (parentId, text, opts) => {
        const parent = get().todos.find((t) => t.id === parentId);
        if (!parent) return null;
        const child = createTodo(text, {
          priorities: opts?.priorities ?? null,
          due_at: opts?.due_at ?? null,
          estimated_hours: opts?.estimated_hours ?? null,
          notes: opts?.notes ?? '',
          parent_id: parentId,
          depth: parent.depth + 1,
        });
        set((s) => ({ todos: insertNested(s.todos, parentId, child) }));
        return child;
      },

      update: (id, patch) => {
        set((s) => ({
          todos: s.todos.map((t) => {
            if (t.id !== id) return t;
            const next: Todo = { ...t, ...patch, _dirty: true };
            // Keep category in sync with text unless caller set it explicitly.
            if (patch.text !== undefined && patch.category === undefined) {
              next.category = extractCategory(next.text);
            }
            return next;
          }),
        }));
      },

      toggleStatus: (id) => {
        set((s) => ({
          todos: s.todos.map((t) =>
            t.id === id ? { ...t, ...nextStatusPatch(t), _dirty: true } : t
          ),
        }));
      },

      remove: (id) => {
        set((s) => ({ todos: removeTodo(s.todos, id) }));
      },

      clearCompleted: () => {
        set((s) => {
          let next = s.todos;
          for (const t of s.todos) {
            if (t.done) next = removeTodo(next, t.id);
          }
          return { todos: next };
        });
      },

      mergeServerTodos: (raw, host) => {
        const incoming = (Array.isArray(raw) ? raw : []).map((r) =>
          normalizeTodo(r, host)
        );
        const incomingIds = new Set(incoming.map((t) => t.id));
        const existingIds = new Set(get().todos.map((t) => t.id));

        let imported = 0;
        let updated = 0;
        for (const t of incoming) {
          if (existingIds.has(t.id)) updated += 1;
          else imported += 1;
        }

        // Preserve locally-created todos not present in the server payload.
        const localOnly = get().todos.filter(
          (t) => !incomingIds.has(t.id) && t._origin === 'local'
        );

        set({
          todos: [...incoming, ...localOnly],
          lastSync: { host, at: nowSeconds() },
        });
        return { imported, updated };
      },

      toggleCollapsed: (id) => {
        set((s) => ({ collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } }));
      },

      reset: () => set({ todos: [], lastSync: null, collapsed: {} }),
    }),
    {
      name: 'dooing-todos',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        todos: s.todos,
        lastSync: s.lastSync,
        collapsed: s.collapsed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
