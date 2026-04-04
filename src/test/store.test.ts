import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/store/appStore";
import { useUndoStore } from "@/store/undoStore";
import { applyOptimisticToList } from "@/store/taskStore";
import type { Task } from "@/types";

// Helper to reset store between tests
function resetStore() {
  useAppStore.setState({
    activeView: "today",
    activeTaskId: null,
    isDetailPanelOpen: false,
    isSearchOpen: false,
    searchQuery: "",
    isPaletteOpen: false,
    isQuickAddFocused: false,
    quickAddValue: "",
    filters: {
      tags: [], priority: null, search: "", sortBy: "due_at", sortDir: "asc", showCompleted: false
    },
    isSettingsOpen: false,
    showOnboarding: false,
    selectedTaskIds: new Set(),
  });
}

describe("AppStore", () => {
  beforeEach(() => resetStore());

  it("setActiveView updates view and clears task", () => {
    useAppStore.getState().openDetailPanel("task-1");
    useAppStore.getState().setActiveView("today");
    const state = useAppStore.getState();
    expect(state.activeView).toBe("today");
    expect(state.activeTaskId).toBeNull();
    expect(state.isDetailPanelOpen).toBe(false);
  });

  it("openDetailPanel sets task and opens panel", () => {
    useAppStore.getState().openDetailPanel("task-42");
    const state = useAppStore.getState();
    expect(state.activeTaskId).toBe("task-42");
    expect(state.isDetailPanelOpen).toBe(true);
  });

  it("closeDetailPanel clears task and closes panel", () => {
    useAppStore.getState().openDetailPanel("task-1");
    useAppStore.getState().closeDetailPanel();
    const state = useAppStore.getState();
    expect(state.activeTaskId).toBeNull();
    expect(state.isDetailPanelOpen).toBe(false);
  });

  it("toggleTaskSelection adds and removes", () => {
    useAppStore.getState().toggleTaskSelection("a");
    expect(useAppStore.getState().selectedTaskIds.has("a")).toBe(true);
    useAppStore.getState().toggleTaskSelection("a");
    expect(useAppStore.getState().selectedTaskIds.has("a")).toBe(false);
  });

  it("setFilters merges partial filters", () => {
    useAppStore.getState().setFilters({ priority: "high" });
    expect(useAppStore.getState().filters.priority).toBe("high");
    // Other filters unchanged
    expect(useAppStore.getState().filters.sortBy).toBe("due_at");
  });
});

describe("UndoStore", () => {
  beforeEach(() => useUndoStore.setState({ stack: [] }));

  it("push adds item to stack", () => {
    useUndoStore.getState().push({ label: "Deleted task", undo: async () => {} });
    expect(useUndoStore.getState().stack).toHaveLength(1);
    expect(useUndoStore.getState().stack[0].label).toBe("Deleted task");
  });

  it("remove removes item by id", () => {
    useUndoStore.getState().push({ label: "Test", undo: async () => {} });
    const id = useUndoStore.getState().stack[0].id;
    useUndoStore.getState().remove(id);
    expect(useUndoStore.getState().stack).toHaveLength(0);
  });
});

describe("applyOptimisticToList", () => {
  const makeTask = (id: string, title: string): Task => ({
    id, title, description: null, status: "pending", priority: "none",
    source: "local", sourceMetadata: null, dueAt: null, startAt: null,
    completedAt: null, reminderAt: null, snoozedUntil: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    isArchived: false, isPinned: false, isToday: false, sortOrder: 0,
    parentTaskId: null, estimateMinutes: null, notes: null, recurrenceRule: null, tags: [],
  });

  it("applies optimistic update to matching task", () => {
    const tasks = [makeTask("1", "Original"), makeTask("2", "Other")];
    const result = applyOptimisticToList(tasks, { "1": { title: "Updated" } });
    expect(result[0].title).toBe("Updated");
    expect(result[1].title).toBe("Other");
  });

  it("leaves tasks without updates unchanged", () => {
    const tasks = [makeTask("1", "Original")];
    const result = applyOptimisticToList(tasks, {});
    expect(result[0]).toBe(tasks[0]); // reference equality
  });
});
