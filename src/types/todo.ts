/**
 * Todo shape — must stay byte-compatible with the Neovim plugin's todo objects.
 * Source of truth: ../dooing/lua/dooing/state.lua (add_todo / add_nested_todo).
 *
 * Lua's JSON encoder omits `nil` fields, so `completed_at`, `due_at`,
 * `priorities`, `estimated_hours` and `parent_id` may be ABSENT (not null) in
 * the served JSON. Treat them as optional and normalize on import.
 *
 * All timestamps are UNIX SECONDS (Lua `os.time()`), NOT milliseconds.
 */
export interface Todo {
  id: string; // "<unix_seconds>_<rand4>", e.g. "1719849600_4823"
  text: string; // may contain inline "#tags"
  done: boolean;
  in_progress: boolean; // 3-state cycle: pending → in_progress → done
  category: string; // first "#tag" in text, or ""
  created_at: number; // unix seconds
  completed_at?: number | null; // present only once done
  priorities?: string[] | null; // e.g. ["important","urgent"]
  estimated_hours?: number | null;
  due_at?: number | null; // unix seconds, end of day
  notes: string;
  parent_id?: string | null; // null/absent = top-level
  depth: number; // 0 = top-level; nesting simulated via parent_id + depth

  // --- Local-only metadata (underscore-prefixed) ---
  // Stripped via toWire() before any future push to Neovim, so the on-wire
  // object stays identical to the plugin's.
  _origin?: string; // 'local' | the host string it was imported from
  _dirty?: boolean; // has unsynced local changes (for two-way-later)
}

/** The exact on-wire shape (no local metadata) for future phone → Neovim push. */
export type WireTodo = Omit<Todo, '_origin' | '_dirty'>;

export type TodoStatus = 'pending' | 'in_progress' | 'done';
