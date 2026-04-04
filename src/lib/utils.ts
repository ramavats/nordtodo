import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow, isPast, isThisWeek } from "date-fns";
import type { Priority, Task } from "@/types";

// ============================================================
// CLASSNAME UTILITY
// ============================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// DATE UTILITIES
// ============================================================

/** Format a due date as a human-friendly relative string */
export function formatDueDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isPast(date)) return `${formatDistanceToNow(date)} ago`;
  if (isThisWeek(date)) return format(date, "EEE");
  return format(date, "MMM d");
}

/** Format ISO date string to input-compatible datetime-local value */
export function toDatetimeLocal(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  // datetime-local expects YYYY-MM-DDTHH:MM
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

/** Parse datetime-local input value to ISO string */
export function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

/** Check if a task is overdue */
export function isOverdue(task: Task): boolean {
  if (task.status !== "pending") return false;
  if (!task.dueAt) return false;
  return isPast(new Date(task.dueAt));
}

/** Check if a task is due today */
export function isDueToday(task: Task): boolean {
  if (!task.dueAt) return false;
  return isToday(new Date(task.dueAt));
}

// ============================================================
// PRIORITY UTILITIES
// ============================================================

export const priorityConfig: Record<
  Priority,
  { label: string; color: string; bgColor: string; dotClass: string; sortValue: number }
> = {
  urgent: {
    label: "Urgent",
    color: "text-error",
    bgColor: "bg-error/10",
    dotClass: "priority-dot-urgent",
    sortValue: 0,
  },
  high: {
    label: "High",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    dotClass: "priority-dot-high",
    sortValue: 1,
  },
  medium: {
    label: "Medium",
    color: "text-warning",
    bgColor: "bg-warning/10",
    dotClass: "priority-dot-medium",
    sortValue: 2,
  },
  none: {
    label: "None",
    color: "text-text-faint",
    bgColor: "bg-surface-3",
    dotClass: "priority-dot-none",
    sortValue: 3,
  },
};

// ============================================================
// RECURRENCE UTILITIES
// ============================================================

export function recurrenceLabel(rrule: string | null | undefined): string {
  if (!rrule) return "";
  const freqMatch = rrule.match(/FREQ=(\w+)/);
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
  const byDayMatch = rrule.match(/BYDAY=([^;]+)/);

  const freq = freqMatch?.[1] ?? "";
  const interval = parseInt(intervalMatch?.[1] ?? "1");

  const freqLabel: Record<string, string> = {
    DAILY: interval === 1 ? "Daily" : `Every ${interval} days`,
    WEEKLY: interval === 1 ? "Weekly" : `Every ${interval} weeks`,
    MONTHLY: interval === 1 ? "Monthly" : `Every ${interval} months`,
    YEARLY: interval === 1 ? "Yearly" : `Every ${interval} years`,
  };

  let label = freqLabel[freq] ?? "Recurring";

  if (byDayMatch && freq === "WEEKLY") {
    const dayMap: Record<string, string> = {
      MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu",
      FR: "Fri", SA: "Sat", SU: "Sun",
    };
    const days = byDayMatch[1]
      .split(",")
      .map((d) => dayMap[d] ?? d)
      .join(", ");
    label += ` on ${days}`;
  }

  return label;
}

// ============================================================
// KEYBOARD UTILITIES
// ============================================================

export function isMac(): boolean {
  return navigator.platform.toUpperCase().includes("MAC");
}

export function modKey(): string {
  return isMac() ? "⌘" : "Ctrl";
}

export function formatKbd(keys: string[]): string {
  return keys.join("+").replace("Mod", modKey());
}

// ============================================================
// DEBOUNCE
// ============================================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// ============================================================
// UNIQUE ID (client-side only, before DB assignment)
// ============================================================

export function tempId(): string {
  return `temp_${Math.random().toString(36).slice(2, 11)}`;
}

// ============================================================
// TASK SOURCE DISPLAY
// ============================================================

export const sourceLabels: Record<string, string> = {
  local: "Local",
  google_calendar: "Google",
  microsoft_todo: "Microsoft",
  outlook_calendar: "Outlook",
  notion: "Notion",
  imported: "Imported",
};
