import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Tauri API for tests
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Suppress console errors in tests
beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});
