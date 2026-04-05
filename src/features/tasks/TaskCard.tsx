import { memo, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Circle, CheckCircle2, Pin, Calendar,
  MoreHorizontal, RefreshCw, Clock
} from "lucide-react";
import { useCompleteTask, useDeleteTask, useDuplicateTask, useUpdateTask } from "@/hooks/useTasks";
import { useAppStore } from "@/store/appStore";
import { cn, formatDueDate, priorityConfig, isOverdue, sourceLabels } from "@/lib/utils";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  isFocused?: boolean;
  onFocus?: (id: string) => void;
  onOpenDetail?: () => void;
}

export const TaskCard = memo(function TaskCard({
  task,
  isFocused,
  onFocus,
  onOpenDetail,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [completing, setCompleting] = useState(false);

  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const duplicateTask = useDuplicateTask();
  const updateTask = useUpdateTask();
  const { selectedTaskIds } = useAppStore();

  const isSelected = selectedTaskIds.has(task.id);
  const isCompleted = task.status === "completed";
  const overdue = isOverdue(task);
  const pCfg = priorityConfig[task.priority];

  useEffect(() => {
    const handler = (e: Event) => {
      const currentId = (e as CustomEvent<string>).detail;
      if (currentId !== task.id) {
        setShowMenu(false);
      }
    };
    document.addEventListener("nordtodo:task-menu-open", handler as EventListener);
    return () => document.removeEventListener("nordtodo:task-menu-open", handler as EventListener);
  }, [task.id]);

  const handleComplete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCompleted) {
        await updateTask.mutateAsync({ id: task.id, input: { status: "pending" } });
        return;
      }
      setCompleting(true);
      await completeTask.mutateAsync(task.id);
      setTimeout(() => setCompleting(false), 400);
    },
    [task.id, isCompleted, completeTask, updateTask]
  );

  return (
    <motion.div
      layout
      layoutId={task.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      whileHover={{ backgroundColor: "rgba(68, 79, 103, 0.22)" }}
      className={cn(
        "group relative flex items-start gap-3 px-1 py-4 overflow-visible",
        "cursor-pointer select-none",
        "border-b border-border/60 transition-all duration-150",
        showMenu ? "z-40" : "z-0",
        isFocused
          ? "bg-surface-2/50"
          : isSelected
          ? "bg-accent/10"
          : "bg-transparent",
        isCompleted && "opacity-60"
      )}
      onClick={() => {
        setShowMenu(false);
        onFocus?.(task.id);
        onOpenDetail?.();
      }}
      role="listitem"
      tabIndex={0}
      onFocus={() => onFocus?.(task.id)}
      aria-label={`Task: ${task.title}`}
      data-testid={`task-card-${task.id}`}
    >
      {/* Priority indicator — left edge */}
      {task.priority !== "none" && !isCompleted && (
        <div
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full",
            `${pCfg.dotClass}`
          )}
          style={{
            background:
              task.priority === "urgent" ? "#BF616A"
              : task.priority === "high" ? "#D08770"
              : "#EBCB8B",
          }}
        />
      )}

      {/* Completion checkbox */}
      <motion.button
        onClick={handleComplete}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className={cn(
          "flex-shrink-0 mt-0.5 transition-colors",
          isCompleted
            ? "text-success"
            : "text-text-faint hover:text-accent"
        )}
        aria-label={isCompleted ? "Reopen task" : "Complete task"}
        data-testid={`task-complete-${task.id}`}
      >
        <motion.div
          animate={completing ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.35 }}
        >
          {isCompleted ? (
            <CheckCircle2 size={16} />
          ) : (
            <Circle size={16} />
          )}
        </motion.div>
      </motion.button>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <div className="flex items-start gap-1.5">
          <span
              className={cn(
              "text-base leading-snug",
              isCompleted
                ? "line-through text-text-muted"
                : "text-text"
            )}
          >
            {task.title}
          </span>
          {task.isPinned && (
            <Pin size={11} className="flex-shrink-0 text-accent mt-0.5" fill="currentColor" />
          )}
          {task.recurrenceRule && (
            <RefreshCw size={11} className="flex-shrink-0 text-text-faint mt-0.5" />
          )}
        </div>

        {/* Meta row */}
        {(task.dueAt || task.tags.length > 0 || task.estimateMinutes) && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Due date */}
            {task.dueAt && (
              <span
                className={cn(
                  "flex items-center gap-1 text-sm",
                  overdue && !isCompleted ? "text-error" : "text-text-faint"
                )}
              >
                <Calendar size={10} />
                {formatDueDate(task.dueAt)}
              </span>
            )}

            {/* Estimate */}
            {task.estimateMinutes && (
              <span className="flex items-center gap-1 text-sm text-text-faint">
                <Clock size={10} />
                {task.estimateMinutes}m
              </span>
            )}

            {/* Tags */}
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0 rounded bg-surface-3 text-text-faint"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-xs text-text-faint">+{task.tags.length - 3}</span>
            )}

            {/* Source badge (non-local) */}
            {task.source !== "local" && (
              <span className="text-xs px-1.5 py-0 rounded bg-accent/10 text-accent">
                {sourceLabels[task.source] ?? task.source}
              </span>
            )}
          </div>
        )}

        {/* Notes preview */}
        {task.notes && !isCompleted && (
          <p className="text-xs text-text-faint mt-1 truncate">{task.notes}</p>
        )}
      </div>

      {/* Context menu trigger */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((prev) => {
              const next = !prev;
              if (next) {
                document.dispatchEvent(new CustomEvent("nordtodo:task-menu-open", { detail: task.id }));
              }
              return next;
            });
          }}
          className="p-1 rounded text-text-faint hover:text-text hover:bg-surface-3 transition-colors"
          aria-label="Task options"
          data-testid={`task-menu-${task.id}`}
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

      {/* Inline context menu */}
      {showMenu && (
        <TaskContextMenu
          task={task}
          onClose={() => setShowMenu(false)}
          onDelete={() => {
            deleteTask.mutate({ id: task.id, taskTitle: task.title });
            setShowMenu(false);
          }}
          onDuplicate={() => {
            duplicateTask.mutate(task.id);
            setShowMenu(false);
          }}
          onTogglePin={() => {
            updateTask.mutate({ id: task.id, input: { isPinned: !task.isPinned } });
            setShowMenu(false);
          }}
          onToggleToday={() => {
            updateTask.mutate({ id: task.id, input: { isToday: !task.isToday } });
            setShowMenu(false);
          }}
          onArchive={() => {
            updateTask.mutate({ id: task.id, input: { isArchived: true, status: "archived" } });
            setShowMenu(false);
          }}
        />
      )}
    </motion.div>
  );
});

// ── Context Menu ────────────────────────────────────────────

interface MenuProps {
  task: Task;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onTogglePin: () => void;
  onToggleToday: () => void;
  onArchive: () => void;
}

function TaskContextMenu({ task, onClose, onDelete, onDuplicate, onTogglePin, onToggleToday, onArchive }: MenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ type: "spring", damping: 30, stiffness: 400 }}
      className={cn(
        "absolute right-8 top-0 z-50 w-44",
        "bg-surface-2 border border-border rounded-lg py-1",
        "shadow-lg text-sm",
      )}
      onBlur={onClose}
    >
      {[
        { label: task.isToday ? "Remove from Today" : "Mark for Today", action: onToggleToday },
        { label: task.isPinned ? "Unpin" : "Pin", action: onTogglePin },
        { label: "Duplicate", action: onDuplicate },
        { label: "Archive", action: onArchive },
        { label: "Delete", action: onDelete, danger: true },
      ].map((item) => (
        <button
          key={item.label}
          onClick={(e) => { e.stopPropagation(); item.action(); }}
          className={cn(
            "w-full text-left px-3 py-1.5 hover:bg-surface-3 transition-colors",
            item.danger ? "text-error" : "text-text-secondary"
          )}
        >
          {item.label}
        </button>
      ))}
    </motion.div>
  );
}
