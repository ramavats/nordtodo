import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { SmartView, FilterState, SortField, SortDir } from "@/types";

interface AppState {
  // Navigation
  activeView: SmartView | string;
  activeTaskId: string | null;
  isDetailPanelOpen: boolean;

  // Search
  isSearchOpen: boolean;
  searchQuery: string;

  // Command palette
  isPaletteOpen: boolean;

  // Quick-add
  isQuickAddFocused: boolean;
  quickAddValue: string;

  // Filters
  filters: FilterState;

  // Settings
  isSettingsOpen: boolean;

  // Onboarding
  showOnboarding: boolean;

  // Bulk selection
  selectedTaskIds: Set<string>;

  // Actions
  setActiveView: (view: SmartView | string) => void;
  setActiveTask: (id: string | null) => void;
  toggleDetailPanel: () => void;
  openDetailPanel: (taskId: string) => void;
  closeDetailPanel: () => void;

  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;

  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;

  setQuickAddFocused: (focused: boolean) => void;
  setQuickAddValue: (val: string) => void;

  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  setSettingsOpen: (open: boolean) => void;
  setShowOnboarding: (show: boolean) => void;

  toggleTaskSelection: (id: string) => void;
  selectAllTasks: (ids: string[]) => void;
  clearSelection: () => void;
}

const DEFAULT_FILTERS: FilterState = {
  tags: [],
  priority: null,
  search: "",
  sortBy: "sort_order",
  sortDir: "asc",
  showCompleted: false,
};

export const useAppStore = create<AppState>()(
  immer((set) => ({
    activeView: "inbox",
    activeTaskId: null,
    isDetailPanelOpen: false,
    isSearchOpen: false,
    searchQuery: "",
    isPaletteOpen: false,
    isQuickAddFocused: false,
    quickAddValue: "",
    filters: DEFAULT_FILTERS,
    isSettingsOpen: false,
    showOnboarding: false,
    selectedTaskIds: new Set(),

    setActiveView: (view) =>
      set((s) => {
        s.activeView = view;
        s.activeTaskId = null;
        s.isDetailPanelOpen = false;
        s.selectedTaskIds = new Set();
      }),

    setActiveTask: (id) =>
      set((s) => {
        s.activeTaskId = id;
      }),

    toggleDetailPanel: () =>
      set((s) => {
        s.isDetailPanelOpen = !s.isDetailPanelOpen;
      }),

    openDetailPanel: (taskId) =>
      set((s) => {
        s.activeTaskId = taskId;
        s.isDetailPanelOpen = true;
      }),

    closeDetailPanel: () =>
      set((s) => {
        s.isDetailPanelOpen = false;
        s.activeTaskId = null;
      }),

    setSearchOpen: (open) =>
      set((s) => {
        s.isSearchOpen = open;
        if (!open) s.searchQuery = "";
      }),

    setSearchQuery: (q) =>
      set((s) => {
        s.searchQuery = q;
        s.filters.search = q;
      }),

    setPaletteOpen: (open) =>
      set((s) => {
        s.isPaletteOpen = open;
      }),

    togglePalette: () =>
      set((s) => {
        s.isPaletteOpen = !s.isPaletteOpen;
      }),

    setQuickAddFocused: (focused) =>
      set((s) => {
        s.isQuickAddFocused = focused;
      }),

    setQuickAddValue: (val) =>
      set((s) => {
        s.quickAddValue = val;
      }),

    setFilters: (filters) =>
      set((s) => {
        s.filters = { ...s.filters, ...filters };
      }),

    resetFilters: () =>
      set((s) => {
        s.filters = DEFAULT_FILTERS;
      }),

    setSettingsOpen: (open) =>
      set((s) => {
        s.isSettingsOpen = open;
      }),

    setShowOnboarding: (show) =>
      set((s) => {
        s.showOnboarding = show;
      }),

    toggleTaskSelection: (id) =>
      set((s) => {
        if (s.selectedTaskIds.has(id)) {
          s.selectedTaskIds.delete(id);
        } else {
          s.selectedTaskIds.add(id);
        }
      }),

    selectAllTasks: (ids) =>
      set((s) => {
        s.selectedTaskIds = new Set(ids);
      }),

    clearSelection: () =>
      set((s) => {
        s.selectedTaskIds = new Set();
      }),
  }))
);
