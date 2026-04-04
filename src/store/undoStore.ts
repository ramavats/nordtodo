import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { UndoItem } from "@/types";

const MAX_UNDO_STACK = 10;
const UNDO_TIMEOUT_MS = 5000;

interface UndoState {
  stack: UndoItem[];
  push: (item: Omit<UndoItem, "id" | "timestamp">) => void;
  pop: () => UndoItem | undefined;
  remove: (id: string) => void;
  clear: () => void;
}

export const useUndoStore = create<UndoState>()(
  immer((set, get) => ({
    stack: [],

    push: (item) =>
      set((s) => {
        const newItem: UndoItem = {
          ...item,
          id: Math.random().toString(36).slice(2),
          timestamp: Date.now(),
        };
        s.stack.unshift(newItem);
        if (s.stack.length > MAX_UNDO_STACK) {
          s.stack.length = MAX_UNDO_STACK;
        }

        // Auto-remove after timeout
        setTimeout(() => {
          set((s2) => {
            const idx = s2.stack.findIndex((i) => i.id === newItem.id);
            if (idx !== -1) s2.stack.splice(idx, 1);
          });
        }, UNDO_TIMEOUT_MS);
      }),

    pop: () => {
      const top = get().stack[0];
      if (!top) return undefined;
      set((s) => { s.stack.shift(); });
      return top;
    },

    remove: (id) =>
      set((s) => {
        const idx = s.stack.findIndex((i) => i.id === id);
        if (idx !== -1) s.stack.splice(idx, 1);
      }),

    clear: () => set((s) => { s.stack = []; }),
  }))
);
