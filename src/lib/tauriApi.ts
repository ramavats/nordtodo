/**
 * Tauri command bridge.
 * All frontend-backend communication passes through here.
 * This is the ONLY file that imports from @tauri-apps/api.
 * Centralizing here makes testing and future changes trivial.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskQuery,
  Tag,
  UserPreferences,
  TaskCounts,
} from "@/types";

// ============================================================
// TASK COMMANDS
// ============================================================

export async function getTasks(query?: Partial<TaskQuery>): Promise<Task[]> {
  return invoke<Task[]>("get_tasks", { query: query ?? {} });
}

export async function getTask(id: string): Promise<Task> {
  return invoke<Task>("get_task", { id });
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return invoke<Task>("create_task", { input });
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return invoke<Task>("update_task", { id, input });
}

export async function completeTask(id: string): Promise<Task> {
  return invoke<Task>("complete_task", { id });
}

export async function reopenTask(id: string): Promise<Task> {
  return invoke<Task>("reopen_task", { id });
}

export async function deleteTask(id: string): Promise<void> {
  return invoke<void>("delete_task", { id });
}

export async function duplicateTask(id: string): Promise<Task> {
  return invoke<Task>("duplicate_task", { id });
}

export async function getTaskCounts(): Promise<TaskCounts> {
  return invoke<TaskCounts>("get_task_counts");
}

export async function bulkAction(input: {
  taskIds: string[];
  action:
    | { type: "complete" }
    | { type: "archive" }
    | { type: "delete" }
    | { type: "setPriority"; priority: string }
    | { type: "setToday"; value: boolean };
}): Promise<number> {
  // Map frontend action to Rust BulkAction enum
  let action: unknown;
  switch (input.action.type) {
    case "complete":
      action = "complete";
      break;
    case "archive":
      action = "archive";
      break;
    case "delete":
      action = "delete";
      break;
    case "setPriority":
      action = { SetPriority: input.action.priority };
      break;
    case "setToday":
      action = { SetToday: input.action.value };
      break;
  }
  return invoke<number>("bulk_action", {
    input: { taskIds: input.taskIds, action },
  });
}

// ============================================================
// TAG COMMANDS
// ============================================================

export async function getTags(): Promise<Tag[]> {
  return invoke<Tag[]>("get_tags");
}

export async function createTag(name: string, color?: string): Promise<Tag> {
  return invoke<Tag>("create_tag", { input: { name, color } });
}

export async function updateTag(id: string, input: { name?: string; color?: string }): Promise<Tag> {
  return invoke<Tag>("update_tag", { id, input });
}

export async function deleteTag(id: string): Promise<void> {
  return invoke<void>("delete_tag", { id });
}

// ============================================================
// PREFERENCES COMMANDS
// ============================================================

export async function getPreferences(): Promise<UserPreferences> {
  return invoke<UserPreferences>("get_preferences");
}

export async function setPreferences(prefs: UserPreferences): Promise<UserPreferences> {
  return invoke<UserPreferences>("set_preferences", { prefs });
}

export async function updatePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences> {
  return invoke<UserPreferences>("update_preferences", { patch });
}

// ============================================================
// SEARCH COMMANDS
// ============================================================

export async function searchTasks(query: string, limit?: number): Promise<Task[]> {
  return invoke<Task[]>("search_tasks", { query, limit });
}

// ============================================================
// EXPORT / IMPORT COMMANDS
// ============================================================

export async function exportTasksJson(): Promise<string> {
  return invoke<string>("export_tasks_json");
}

export async function importTasksJson(json: string): Promise<number> {
  return invoke<number>("import_tasks_json", { json });
}

// ============================================================
// GOOGLE TASKS INTEGRATION
// ============================================================

export interface AuthUrlResponse {
  url: string;
  state: string;
}

export interface IntegrationStatus {
  connected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
}

export interface SyncResult {
  imported: number;
  updated: number;
  pushed: number;
}

/** Step 1: Get the OAuth2 URL to open in the browser */
export async function googleAuthUrl(): Promise<AuthUrlResponse> {
  return invoke<AuthUrlResponse>("google_auth_url");
}

/** Step 2: Exchange the auth code after the redirect */
export async function googleExchangeCode(code: string): Promise<IntegrationStatus> {
  return invoke<IntegrationStatus>("google_exchange_code", { code });
}

/** Get current connection status */
export async function googleStatus(): Promise<IntegrationStatus> {
  return invoke<IntegrationStatus>("google_status");
}

/** Disconnect Google Tasks */
export async function googleDisconnect(): Promise<void> {
  return invoke<void>("google_disconnect");
}

/** Run a full two-way sync */
export async function syncGoogleTasks(): Promise<SyncResult> {
  return invoke<SyncResult>("sync_google_tasks");
}

// ============================================================
// WINDOW MANAGEMENT COMMANDS
// ============================================================

export type WindowMode = "normal" | "slim";

/** Resize + reposition the OS window for slim or normal mode. */
export async function setWindowMode(mode: WindowMode): Promise<void> {
  return invoke<void>("set_window_mode", { mode });
}

/** Hide the OS window (app keeps running in background). */
export async function hideWindow(): Promise<void> {
  return invoke<void>("hide_window");
}

/** Show and focus the OS window. */
export async function showWindow(): Promise<void> {
  return invoke<void>("show_window");
}
