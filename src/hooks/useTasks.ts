import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import toast from "react-hot-toast";
import * as api from "@/lib/tauriApi";
import type { CreateTaskInput, UpdateTaskInput, TaskQuery, Task } from "@/types";
import { useTaskStore, useUndoStore } from "@/store";

// Query key factory — ensures consistent cache keys
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (query?: Partial<TaskQuery>) => [...taskKeys.lists(), query] as const,
  detail: (id: string) => [...taskKeys.all, "detail", id] as const,
  counts: () => [...taskKeys.all, "counts"] as const,
  search: (q: string) => [...taskKeys.all, "search", q] as const,
  tags: () => ["tags"] as const,
};

// ============================================================
// QUERY HOOKS
// ============================================================

export function useTaskList(query?: Partial<TaskQuery>) {
  const { optimisticUpdates } = useTaskStore();
  const result = useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => api.getTasks(query),
    select: (tasks) => {
      // Apply optimistic updates
      return tasks.map((t) => {
        const patch = optimisticUpdates[t.id];
        return patch ? { ...t, ...patch } : t;
      });
    },
  });
  return result;
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? ""),
    queryFn: () => api.getTask(id!),
    enabled: !!id,
  });
}

export function useTaskCounts() {
  return useQuery({
    queryKey: taskKeys.counts(),
    queryFn: api.getTaskCounts,
    refetchInterval: 30_000, // refresh counts every 30s
  });
}

export function useTags() {
  return useQuery({
    queryKey: taskKeys.tags(),
    queryFn: api.getTags,
  });
}

// ============================================================
// MUTATION HOOKS
// ============================================================

export function useCreateTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.createTask(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.counts() });
    },
    onError: (err: Error) => {
      toast.error(`Failed to create task: ${err.message}`);
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  const { applyOptimistic, clearOptimistic } = useTaskStore();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      api.updateTask(id, input),

    // Optimistic update — instant UI response
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: taskKeys.lists() });
      applyOptimistic(id, input as Partial<Task>);
      return { id };
    },

    onSuccess: (updatedTask, { id }) => {
      clearOptimistic(id);
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.detail(id) });
      qc.invalidateQueries({ queryKey: taskKeys.counts() });
    },

    onError: (err: Error, { id }) => {
      clearOptimistic(id);
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.error(`Failed to update task: ${err.message}`);
    },
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  const { applyOptimistic, clearOptimistic } = useTaskStore();
  const { push: pushUndo } = useUndoStore();

  return useMutation({
    mutationFn: (id: string) => api.completeTask(id),

    onMutate: async (id) => {
      applyOptimistic(id, { status: "completed", completedAt: new Date().toISOString() });
    },

    onSuccess: (task) => {
      clearOptimistic(task.id);
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.counts() });

      // Push undo action
      pushUndo({
        label: `Completed "${task.title}"`,
        undo: async () => {
          await api.reopenTask(task.id);
          qc.invalidateQueries({ queryKey: taskKeys.lists() });
          qc.invalidateQueries({ queryKey: taskKeys.counts() });
        },
      });
    },

    onError: (err: Error, id) => {
      clearOptimistic(id);
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.error(`Failed to complete task: ${err.message}`);
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const { push: pushUndo } = useUndoStore();

  return useMutation({
    mutationFn: async ({ id, taskTitle }: { id: string; taskTitle: string }) => {
      await api.deleteTask(id);
      return { id, taskTitle };
    },
    onSuccess: ({ id, taskTitle }) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.counts() });

      pushUndo({
        label: `Deleted "${taskTitle}"`,
        undo: async () => {
          await api.updateTask(id, { status: "pending" });
          qc.invalidateQueries({ queryKey: taskKeys.lists() });
          qc.invalidateQueries({ queryKey: taskKeys.counts() });
        },
      });
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete task: ${err.message}`);
    },
  });
}

export function useDuplicateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.duplicateTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.counts() });
      toast.success("Task duplicated");
    },
    onError: (err: Error) => {
      toast.error(`Failed to duplicate: ${err.message}`);
    },
  });
}
