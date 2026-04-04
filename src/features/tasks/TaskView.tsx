import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { useTaskList, useTaskCounts } from "@/hooks/useTasks";
import { useDebounce } from "@/hooks/useDebounce";
import { QuickAdd } from "./QuickAdd";
import { TaskCard } from "./TaskCard";
import { TaskListHeader } from "./TaskListHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskSkeleton } from "@/components/ui/TaskSkeleton";
import { cn } from "@/lib/utils";
import type { TaskQuery } from "@/types";

export function TaskView() {
  const { activeView, filters, openDetailPanel } = useAppStore();
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(filters.search, 300);

  // Build query from active view + filters
  const query: Partial<TaskQuery> = {
    smartView: activeView.startsWith("tag:") ? undefined : activeView,
    tag: activeView.startsWith("tag:") ? activeView.replace("tag:", "") : undefined,
    search: debouncedSearch || undefined,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    includeArchived: activeView === "archived",
    limit: 500,
  };

  const { data: tasks, isLoading, isError, error } = useTaskList(query);

  const taskIds = tasks?.map((t) => t.id) ?? [];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = focusedId ? taskIds.indexOf(focusedId) : -1;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedId(taskIds[Math.min(idx + 1, taskIds.length - 1)] ?? null);
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedId(taskIds[Math.max(idx - 1, 0)] ?? null);
          break;
        case "Enter":
          e.preventDefault();
          if (focusedId) openDetailPanel(focusedId);
          break;
      }
    },
    [taskIds, focusedId, openDetailPanel]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Quick-add (always visible at top) */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <QuickAdd />
      </div>

      {/* Filter / sort header */}
      <TaskListHeader />

      {/* Task list */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-4"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="list"
        aria-label="Tasks"
        data-testid="task-list"
      >
        {isLoading ? (
          <TaskSkeleton count={6} />
        ) : isError ? (
          <ErrorState message={String(error)} />
        ) : !tasks || tasks.length === 0 ? (
          <EmptyStateForView view={activeView} />
        ) : (
          <LayoutGroup>
            <motion.div
              className="space-y-1"
              variants={{
                show: { transition: { staggerChildren: 0.03 } },
              }}
              initial="show"
              animate="show"
            >
              <AnimatePresence mode="popLayout">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isFocused={focusedId === task.id}
                    onFocus={setFocusedId}
                    onOpenDetail={() => openDetailPanel(task.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        )}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-error mb-1">Something went wrong</p>
      <p className="text-xs text-text-faint max-w-xs">{message}</p>
    </div>
  );
}

function EmptyStateForView({ view }: { view: string }) {
  const config: Record<string, { title: string; description: string }> = {
    inbox: {
      title: "All clear",
      description: "No tasks yet. Add your first task with Ctrl+N.",
    },
    today: {
      title: "Free day ahead",
      description: "No tasks scheduled for today. Enjoy the clarity.",
    },
    upcoming: {
      title: "Nothing upcoming",
      description: "No tasks due in the next 7 days.",
    },
    overdue: {
      title: "You're on track",
      description: "No overdue tasks. Keep it up.",
    },
    completed: {
      title: "No completed tasks",
      description: "Complete a task and it will appear here.",
    },
    flagged: {
      title: "Nothing flagged",
      description: "Pin important tasks to surface them here.",
    },
  };

  const c = config[view] ?? {
    title: "No tasks",
    description: "This view is empty.",
  };

  return <EmptyState title={c.title} description={c.description} />;
}
