import { z } from "zod";

// ============================================================
// ENUMS
// ============================================================

export const Priority = {
  Urgent: "urgent",
  High: "high",
  Medium: "medium",
  None: "none",
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const TaskStatus = {
  Pending: "pending",
  Completed: "completed",
  Archived: "archived",
  Deleted: "deleted",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskSource = {
  Local: "local",
  GoogleCalendar: "google_calendar",
  MicrosoftTodo: "microsoft_todo",
  OutlookCalendar: "outlook_calendar",
  Notion: "notion",
  Imported: "imported",
} as const;
export type TaskSource = (typeof TaskSource)[keyof typeof TaskSource];

export const SmartView = {
  Inbox: "inbox",
  Today: "today",
  Upcoming: "upcoming",
  Overdue: "overdue",
  Completed: "completed",
  Archived: "archived",
  NoDate: "no_date",
  Flagged: "flagged",
  All: "all",
} as const;
export type SmartView = (typeof SmartView)[keyof typeof SmartView];

// ============================================================
// ZOD SCHEMAS (runtime validation)
// ============================================================

export const PrioritySchema = z.enum(["urgent", "high", "medium", "none"]);
export const TaskStatusSchema = z.enum(["pending", "completed", "archived", "deleted"]);
export const TaskSourceSchema = z.enum([
  "local", "google_calendar", "microsoft_todo",
  "outlook_calendar", "notion", "imported",
]);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().nullish(),
  status: TaskStatusSchema,
  priority: PrioritySchema,
  source: TaskSourceSchema,
  sourceMetadata: z.string().nullish(),
  dueAt: z.string().nullish(),
  startAt: z.string().nullish(),
  completedAt: z.string().nullish(),
  reminderAt: z.string().nullish(),
  snoozedUntil: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isArchived: z.boolean(),
  isPinned: z.boolean(),
  isToday: z.boolean(),
  sortOrder: z.number(),
  parentTaskId: z.string().nullish(),
  estimateMinutes: z.number().nullish(),
  notes: z.string().nullish(),
  recurrenceRule: z.string().nullish(),
  tags: z.array(z.string()),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional(),
  priority: PrioritySchema.optional(),
  dueAt: z.string().optional(),
  startAt: z.string().optional(),
  reminderAt: z.string().optional(),
  parentTaskId: z.string().optional(),
  estimateMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
  recurrenceRule: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isToday: z.boolean().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional().nullable(),
  status: TaskStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  dueAt: z.string().optional().nullable(),
  startAt: z.string().optional().nullable(),
  reminderAt: z.string().optional().nullable(),
  snoozedUntil: z.string().optional().nullable(),
  isArchived: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  isToday: z.boolean().optional(),
  estimateMinutes: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  recurrenceRule: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const TaskQuerySchema = z.object({
  smartView: z.string().optional(),
  status: TaskStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  search: z.string().optional(),
  tag: z.string().optional(),
  parentTaskId: z.string().optional(),
  includeArchived: z.boolean().optional(),
  sortBy: z.enum(["sort_order", "due_at", "priority", "created_at", "title"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type TaskQuery = z.infer<typeof TaskQuerySchema>;

// ============================================================
// TAG
// ============================================================

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullish(),
  createdAt: z.string(),
  taskCount: z.number().nullish(),
});
export type Tag = z.infer<typeof TagSchema>;

// ============================================================
// PREFERENCES
// ============================================================

export const UserPreferencesSchema = z.object({
  defaultSmartView: z.string(),
  sidebarExpanded: z.boolean(),
  sidebarWidth: z.number(),
  reduceMotion: z.boolean(),
  startupView: z.string(),
  theme: z.string(),
  localOnlyMode: z.boolean(),
  firstRunComplete: z.boolean(),
  sortBy: z.string(),
  sortDir: z.string(),
  showCompleted: z.boolean(),
  compactMode: z.boolean(),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// ============================================================
// SMART VIEW METADATA
// ============================================================

export interface SmartViewMeta {
  id: SmartView;
  label: string;
  icon: string;       // Lucide icon name
  count?: number;
  isSystem: boolean;  // system views can't be deleted
}

// ============================================================
// COMMAND PALETTE
// ============================================================

export interface PaletteCommand {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  keywords?: string[];
  action: () => void;
  section?: string;
  kbd?: string[];
}

// ============================================================
// SORT / FILTER STATE
// ============================================================

export type SortField = "sort_order" | "due_at" | "priority" | "created_at" | "title";
export type SortDir = "asc" | "desc";

export interface FilterState {
  tags: string[];
  priority: Priority | null;
  search: string;
  sortBy: SortField;
  sortDir: SortDir;
  showCompleted: boolean;
}

// ============================================================
// TASK COUNTS (sidebar badges)
// ============================================================

export interface TaskCounts {
  inbox: number;
  today: number;
  upcoming: number;
  overdue: number;
  completed: number;
  flagged: number;
}

// ============================================================
// UNDO STACK
// ============================================================

export interface UndoItem {
  id: string;
  label: string;
  undo: () => void | Promise<void>;
  timestamp: number;
}
