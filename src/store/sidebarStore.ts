import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  expanded: boolean;
  toggle: () => void;
  setExpanded: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      expanded: true,
      toggle: () => set((s) => ({ expanded: !s.expanded })),
      setExpanded: (v) => set({ expanded: v }),
    }),
    {
      name: "nordtodo-sidebar",
      // Use localStorage-like storage via window.localStorage
      // For Tauri this is the WebView's localStorage
    }
  )
);
