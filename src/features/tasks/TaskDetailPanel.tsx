import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Calendar, Flag, Tag, Clock, RefreshCw, Bell,
  Archive, Trash2, Pin, Copy, Check
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTask, useUpdateTask, useDeleteTask, useDuplicateTask, useCompleteTask } from "@/hooks/useTasks";
import { useAppStore } from "@/store/appStore";
import { UpdateTaskSchema, type UpdateTaskInput, type Priority } from "@/types";
import {
  cn, formatDueDate, toDatetimeLocal, fromDatetimeLocal,
  priorityConfig, recurrenceLabel, sourceLabels
} from "@/lib/utils";
import { DateTimePicker } from "@/components/ui/DateTimePicker";

type RepeatPreset = "none" | "hourly" | "daily" | "weekly" | "monthly";

function rruleToRepeatPreset(rrule: string | null | undefined): RepeatPreset {
  if (!rrule) return "none";
  const freqMatch = rrule.match(/FREQ=(\w+)/);
  switch (freqMatch?.[1]) {
    case "HOURLY":
      return "hourly";
    case "DAILY":
      return "daily";
    case "WEEKLY":
      return "weekly";
    case "MONTHLY":
      return "monthly";
    default:
      return "none";
  }
}

function repeatPresetToRRule(preset: RepeatPreset): string | null {
  switch (preset) {
    case "hourly":
      return "FREQ=HOURLY;INTERVAL=1";
    case "daily":
      return "FREQ=DAILY;INTERVAL=1";
    case "weekly":
      return "FREQ=WEEKLY;INTERVAL=1";
    case "monthly":
      return "FREQ=MONTHLY;INTERVAL=1";
    default:
      return null;
  }
}

export function TaskDetailPanel() {
  const { activeTaskId, closeDetailPanel } = useAppStore();
  const { data: task, isLoading } = useTask(activeTaskId);
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const duplicateTask = useDuplicateTask();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
  } = useForm<UpdateTaskInput>({
    resolver: zodResolver(UpdateTaskSchema),
  });

  // Sync form when task loads
  useEffect(() => {
    if (task) {
      setTitleValue(task.title);
      reset({
        title: task.title,
        description: task.description ?? "",
        notes: task.notes ?? "",
        priority: task.priority,
        dueAt: toDatetimeLocal(task.dueAt) as any,
        estimateMinutes: task.estimateMinutes ?? undefined,
        recurrenceRule: task.recurrenceRule ?? "",
        tags: task.tags,
        isPinned: task.isPinned,
        isToday: task.isToday,
      });
    }
  }, [task?.id, reset]);

  const handleFieldBlur = useCallback(
    (field: keyof UpdateTaskInput, value: unknown) => {
      if (!task) return;
      const current = task[field as keyof typeof task];
      if (value !== current) {
        updateTask.mutate({
          id: task.id,
          input: { [field]: value } as UpdateTaskInput,
        });
      }
    },
    [task, updateTask]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-8 rounded" />
        ))}
      </div>
    );
  }

  if (!task) return null;

  const isCompleted = task.status === "completed";

  return (
    <div className="flex flex-col h-full bg-surface overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <span className="text-xs text-text-faint font-medium uppercase tracking-wider">
          Task Details
        </span>
        <div className="flex items-center gap-1">
          {/* Pin */}
          <button
            onClick={() => updateTask.mutate({ id: task.id, input: { isPinned: !task.isPinned } })}
            className={cn(
              "p-1.5 rounded transition-colors",
              task.isPinned
                ? "text-accent bg-accent/10"
                : "text-text-faint hover:text-text hover:bg-surface-2"
            )}
            title={task.isPinned ? "Unpin" : "Pin"}
          >
            <Pin size={13} fill={task.isPinned ? "currentColor" : "none"} />
          </button>
          {/* Duplicate */}
          <button
            onClick={() => duplicateTask.mutate(task.id)}
            className="p-1.5 rounded text-text-faint hover:text-text hover:bg-surface-2 transition-colors"
            title="Duplicate"
          >
            <Copy size={13} />
          </button>
          {/* Archive */}
          <button
            onClick={() => {
              updateTask.mutate({ id: task.id, input: { isArchived: true, status: "archived" } });
              closeDetailPanel();
            }}
            className="p-1.5 rounded text-text-faint hover:text-text hover:bg-surface-2 transition-colors"
            title="Archive"
          >
            <Archive size={13} />
          </button>
          {/* Delete */}
          <button
            onClick={() => {
              deleteTask.mutate({ id: task.id, taskTitle: task.title });
              closeDetailPanel();
            }}
            className="p-1.5 rounded text-text-faint hover:text-error hover:bg-error/10 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
          {/* Close */}
          <button
            onClick={closeDetailPanel}
            className="p-1.5 rounded text-text-faint hover:text-text hover:bg-surface-2 transition-colors"
            data-testid="detail-panel-close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5">
        {/* ── Title ── */}
        <div>
          <textarea
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={() => handleFieldBlur("title", titleValue)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
            }}
            rows={1}
            className={cn(
              "w-full bg-transparent text-base font-medium text-text",
              "resize-none border-none outline-none placeholder:text-text-faint",
              "leading-snug task-title-input",
              isCompleted && "line-through text-text-muted"
            )}
            placeholder="Task title"
            data-testid="detail-title-input"
          />
        </div>

        {/* ── Complete / Reopen ── */}
        <div>
          <button
            onClick={() => {
              if (isCompleted) {
                updateTask.mutate({ id: task.id, input: { status: "pending" } });
                return;
              }
              completeTask.mutate(task.id);
            }}
            className={cn(
              "flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-colors",
              isCompleted
                ? "bg-success/15 text-success hover:bg-success/25"
                : "bg-surface-2 text-text-muted hover:bg-surface-3"
            )}
            data-testid="detail-complete-btn"
          >
            <Check size={13} />
            {isCompleted ? "Completed — Click to reopen" : "Mark complete"}
          </button>
        </div>

        {/* ── Due date ── */}
        <DetailField icon={<Calendar size={13} />} label="Due date">
          <DateTimePicker
            value={task.dueAt ?? null}
            onChange={(iso) => handleFieldBlur("dueAt", iso as any)}
          />
        </DetailField>

        {/* ── Priority ── */}
        <DetailField icon={<Flag size={13} />} label="Priority">
          <PriorityPicker
            value={task.priority}
            onChange={(p) => updateTask.mutate({ id: task.id, input: { priority: p } })}
          />
        </DetailField>

        {/* ── Tags ── */}
        <DetailField icon={<Tag size={13} />} label="Tags">
          <TagInput
            value={task.tags}
            onChange={(tags) => updateTask.mutate({ id: task.id, input: { tags } })}
          />
        </DetailField>

        {/* ── Notes ── */}
        <DetailField icon={<Clock size={13} />} label="Notes">
          <textarea
            key={task.id}
            defaultValue={task.notes ?? ""}
            onBlur={(e) => handleFieldBlur("notes", e.target.value || null)}
            rows={4}
            placeholder="Add notes…"
            className={cn(
              "w-full text-sm bg-surface-2 text-text rounded px-2 py-1.5",
              "border border-border focus:border-accent outline-none transition-colors",
              "resize-none placeholder:text-text-faint"
            )}
            data-testid="detail-notes"
          />
        </DetailField>

        {/* ── Recurrence ── */}
        <DetailField icon={<RefreshCw size={13} />} label="Repeat">
          <div className="flex items-center gap-2">
            <select
              value={rruleToRepeatPreset(task.recurrenceRule)}
              onChange={(e) =>
                updateTask.mutate({
                  id: task.id,
                  input: { recurrenceRule: repeatPresetToRRule(e.target.value as RepeatPreset) },
                })
              }
              className="text-sm bg-surface-2 text-text border border-border rounded px-2 py-1 focus:border-accent outline-none"
            >
              <option value="none">No repeat</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            {task.recurrenceRule && (
              <span className="text-xs text-text-faint">{recurrenceLabel(task.recurrenceRule)}</span>
            )}
          </div>
        </DetailField>

        {/* ── Estimate ── */}
        <DetailField icon={<Clock size={13} />} label="Estimate (min)">
          <input
            type="number"
            min={1}
            max={9999}
            defaultValue={task.estimateMinutes ?? ""}
            onBlur={(e) =>
              handleFieldBlur("estimateMinutes", e.target.value ? parseInt(e.target.value) : null as any)
            }
            placeholder="—"
            className={cn(
              "w-24 text-sm bg-surface-2 text-text rounded px-2 py-1",
              "border border-border focus:border-accent outline-none transition-colors"
            )}
          />
        </DetailField>

        {/* ── Source ── */}
        {task.source !== "local" && (
          <DetailField icon={<Bell size={13} />} label="Source">
            <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded">
              {sourceLabels[task.source] ?? task.source}
            </span>
          </DetailField>
        )}

        {/* ── Metadata ── */}
        <div className="pt-2 border-t border-border space-y-1">
          <MetaRow label="Created" value={formatDueDate(task.createdAt)} />
          <MetaRow label="Updated" value={formatDueDate(task.updatedAt)} />
          {task.completedAt && (
            <MetaRow label="Completed" value={formatDueDate(task.completedAt)} />
          )}
          <MetaRow label="ID" value={task.id.slice(0, 8) + "…"} mono />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function DetailField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-text-faint">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-faint">{label}</span>
      <span className={cn("text-text-muted", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function PriorityPicker({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {(["urgent", "high", "medium", "none"] as Priority[]).map((p) => {
        const cfg = priorityConfig[p];
        const isActive = value === p;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              "px-2.5 py-1 rounded text-xs transition-colors",
              isActive
                ? `${cfg.color} ${cfg.bgColor} font-medium`
                : "text-text-muted bg-surface-2 hover:bg-surface-3"
            )}
          >
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

function TagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const tag = input.trim().toLowerCase();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {value.map((tag) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 px-2 py-0.5 bg-surface-2 border border-border rounded text-xs text-text-muted"
            >
              #{tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-error transition-colors"
              >
                <X size={10} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add tag…"
          className={cn(
            "flex-1 text-xs bg-surface-2 text-text rounded px-2 py-1",
            "border border-border focus:border-accent outline-none transition-colors",
            "placeholder:text-text-faint"
          )}
          data-testid="detail-tag-input"
        />
        <button
          onClick={addTag}
          className="px-2 py-1 text-xs rounded bg-surface-2 border border-border text-text-muted hover:text-text transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
