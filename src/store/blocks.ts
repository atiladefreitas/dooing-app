import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createBlock, normalizeBlock, toWireBlock } from '@/lib/block';
import { Block, CalendarView } from '@/types/block';

interface BlockDraft {
  title: string;
  date: string;
  start_min: number;
  duration_min: number;
  notes?: string;
  recurrence?: Block['recurrence'];
}

interface BlocksState {
  blocks: Block[];
  links: Record<string, string>;
  local: Record<string, true>;
  view: CalendarView;
  hydrated: boolean;

  add: (draft: BlockDraft, todoId?: string | null) => Block;
  update: (id: string, patch: Partial<BlockDraft>) => void;
  move: (id: string, date: string, startMin: number) => void;
  resize: (id: string, durationMin: number) => void;
  remove: (id: string) => void;
  linkTodo: (blockId: string, todoId: string | null) => void;
  setView: (view: CalendarView) => void;
  mergeServerBlocks: (raw: unknown[]) => { imported: number; updated: number };
  reset: () => void;
}

export const useBlocks = create<BlocksState>()(
  persist(
    (set, get) => ({
      blocks: [],
      links: {},
      local: {},
      view: 'day',
      hydrated: false,

      add: (draft, todoId) => {
        const block = createBlock(draft);
        set((s) => ({
          blocks: [...s.blocks, block],
          local: { ...s.local, [block.id]: true },
          links: todoId ? { ...s.links, [block.id]: todoId } : s.links,
        }));
        return block;
      },

      update: (id, patch) => {
        set((s) => ({
          blocks: s.blocks.map((b) => (b.id === id ? toWireBlock({ ...b, ...patch }) : b)),
        }));
      },

      move: (id, date, startMin) => {
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === id ? toWireBlock({ ...b, date, start_min: startMin }) : b
          ),
        }));
      },

      resize: (id, durationMin) => {
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === id ? toWireBlock({ ...b, duration_min: durationMin }) : b
          ),
        }));
      },

      remove: (id) => {
        set((s) => {
          const links = { ...s.links };
          const local = { ...s.local };
          delete links[id];
          delete local[id];
          return { blocks: s.blocks.filter((b) => b.id !== id), links, local };
        });
      },

      linkTodo: (blockId, todoId) => {
        set((s) => {
          const links = { ...s.links };
          if (todoId) links[blockId] = todoId;
          else delete links[blockId];
          return { links };
        });
      },

      setView: (view) => set({ view }),

      mergeServerBlocks: (raw) => {
        const incoming = (Array.isArray(raw) ? raw : [])
          .map((r) => normalizeBlock(r))
          .filter((b): b is Block => b !== null);

        const incomingIds = new Set(incoming.map((b) => b.id));
        const existingIds = new Set(get().blocks.map((b) => b.id));

        let imported = 0;
        let updated = 0;
        for (const b of incoming) {
          if (existingIds.has(b.id)) updated += 1;
          else imported += 1;
        }

        const localOnly = get().blocks.filter(
          (b) => !incomingIds.has(b.id) && get().local[b.id]
        );

        const kept = new Set([...incomingIds, ...localOnly.map((b) => b.id)]);
        const links = Object.fromEntries(
          Object.entries(get().links).filter(([blockId]) => kept.has(blockId))
        );

        set({ blocks: [...incoming, ...localOnly], links });
        return { imported, updated };
      },

      reset: () => set({ blocks: [], links: {}, local: {} }),
    }),
    {
      name: 'dooing-blocks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        blocks: s.blocks,
        links: s.links,
        local: s.local,
        view: s.view,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
