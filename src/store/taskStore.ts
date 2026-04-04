/**
 * Task store — manages optimistic state for fast interactions.
 * The actual source of truth is SQLite (via Tauri commands).
 * This store holds optimistic updates while mutations are in-flight.
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Task } from "@/types";

interface TaskStoreState {
  // Optimistic overrides: taskId → partial Task
  // Applied on top of server state for instant feedback
  optimisticUpdates: Record<string, Partial<Task>>;

  // Track which tasks are currently being mutated
  pendingIds: Set<string>;

  // Editing state
  editingTaskId: string | null;

  applyOptimistic: (id: string, patch: Partial<Task>) => void;
  clearOptimistic: (id: string) => void;
  addPending: (id: string) => void;
  removePending: (id: string) => void;
  setEditing: (id: string | null) => void;
}

export const useTaskStore = create<TaskStoreState>()(
  immer((set) => ({
    optimisticUpdates: {},
    pendingIds: new Set(),
    editingTaskId: null,

    applyOptimistic: (id, patch) =>
      set((s) => {
        s.optimisticUpdates[id] = { ...(s.optimisticUpdates[id] ?? {}), ...patch };
      }),

    clearOptimistic: (id) =>
      set((s) => {
        delete s.optimisticUpdates[id];
      }),

    addPending: (id) =>
      set((s) => {
        s.pendingIds.add(id);
      }),

    removePending: (id) =>
      set((s) => {
        s.pendingIds.delete(id);
      }),

    setEditing: (id) =>
      set((s) => {
        s.editingTaskId = id;
      }),
  }))
);

/** Merge optimistic updates into a task list for display */
export function applyOptimisticToList(
  tasks: Task[],
  updates: Record<string, Partial<Task>>
): Task[] {
  return tasks.map((task) => {
    const patch = updates[task.id];
    if (!patch) return task;
    return { ...task, ...patch };
  });
}
