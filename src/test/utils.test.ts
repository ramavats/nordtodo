import { describe, it, expect } from "vitest";
import {
  formatDueDate, isOverdue, isDueToday, recurrenceLabel, cn
} from "@/lib/utils";
import type { Task } from "@/types";

describe("formatDueDate", () => {
  it("returns empty string for nullish input", () => {
    expect(formatDueDate(null)).toBe("");
    expect(formatDueDate(undefined)).toBe("");
  });

  it("returns 'Today' for today's date", () => {
    const today = new Date().toISOString();
    expect(formatDueDate(today)).toBe("Today");
  });

  it("returns 'Tomorrow' for tomorrow's date", () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    expect(formatDueDate(tomorrow)).toBe("Tomorrow");
  });
});

describe("isOverdue", () => {
  const baseTask: Task = {
    id: "test-id",
    title: "Test",
    description: null,
    status: "pending",
    priority: "none",
    source: "local",
    sourceMetadata: null,
    dueAt: null,
    startAt: null,
    completedAt: null,
    reminderAt: null,
    snoozedUntil: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isArchived: false,
    isPinned: false,
    isToday: false,
    sortOrder: 0,
    parentTaskId: null,
    estimateMinutes: null,
    notes: null,
    recurrenceRule: null,
    tags: [],
  };

  it("returns false if no due date", () => {
    expect(isOverdue({ ...baseTask, dueAt: null })).toBe(false);
  });

  it("returns false if task is completed", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isOverdue({ ...baseTask, status: "completed", dueAt: past })).toBe(false);
  });

  it("returns true if pending and due date is in the past", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isOverdue({ ...baseTask, dueAt: past })).toBe(true);
  });

  it("returns false if due date is in the future", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isOverdue({ ...baseTask, dueAt: future })).toBe(false);
  });
});

describe("recurrenceLabel", () => {
  it("returns empty string for null", () => {
    expect(recurrenceLabel(null)).toBe("");
  });

  it("returns 'Daily' for FREQ=DAILY;INTERVAL=1", () => {
    expect(recurrenceLabel("FREQ=DAILY;INTERVAL=1")).toBe("Daily");
  });

  it("returns 'Hourly' for FREQ=HOURLY;INTERVAL=1", () => {
    expect(recurrenceLabel("FREQ=HOURLY;INTERVAL=1")).toBe("Hourly");
  });

  it("returns 'Every 2 days' for FREQ=DAILY;INTERVAL=2", () => {
    expect(recurrenceLabel("FREQ=DAILY;INTERVAL=2")).toBe("Every 2 days");
  });

  it("returns 'Weekly on Mon, Wed, Fri'", () => {
    const label = recurrenceLabel("FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR");
    expect(label).toContain("Mon");
    expect(label).toContain("Wed");
    expect(label).toContain("Fri");
  });
});

describe("cn", () => {
  it("merges class names correctly", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("a", false && "b", "c")).toBe("a c");
    expect(cn("bg-red", "bg-blue")).toBe("bg-blue"); // tailwind-merge deduplication
  });
});
