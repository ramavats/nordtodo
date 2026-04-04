import { useEffect, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { useSidebarStore } from "@/store/sidebarStore";

/**
 * Global keyboard shortcut handler.
 * Registered once at the App root.
 */
export function useGlobalKeyboard() {
  const {
    togglePalette,
    setSearchOpen,
    setSettingsOpen,
    isSearchOpen,
    isPaletteOpen,
    isDetailPanelOpen,
    closeDetailPanel,
    isQuickAddFocused,
  } = useAppStore();
  const { toggle: toggleSidebar } = useSidebarStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;

      // ── Global shortcuts (always fire) ──────────────────────
      
      // Cmd/Ctrl+K — Command palette
      if (isMod && e.key === "k") {
        e.preventDefault();
        togglePalette();
        return;
      }

      // Cmd/Ctrl+F — Search
      if (isMod && e.key === "f") {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
        return;
      }

      // Cmd/Ctrl+, — Settings
      if (isMod && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
        return;
      }

      // Cmd/Ctrl+\ — Toggle sidebar
      if (isMod && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // ── Non-input shortcuts ──────────────────────────────────
      if (!isInput) {
        // Escape — close open panels/palettes
        if (e.key === "Escape") {
          if (isPaletteOpen) { togglePalette(); return; }
          if (isSearchOpen) { setSearchOpen(false); return; }
          if (isDetailPanelOpen) { closeDetailPanel(); return; }
        }

        // Cmd/Ctrl+N — New task (focus quick-add via custom event)
        if (isMod && e.key === "n") {
          e.preventDefault();
          document.dispatchEvent(new CustomEvent("nordtodo:focus-quickadd"));
          return;
        }
      }
    },
    [
      togglePalette, setSearchOpen, setSettingsOpen, toggleSidebar,
      isSearchOpen, isPaletteOpen, isDetailPanelOpen, closeDetailPanel,
    ]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for handling keyboard navigation within a task list.
 * Returns a keydown handler to attach to the list container.
 */
export function useTaskListKeyboard(
  taskIds: string[],
  focusedId: string | null,
  onFocus: (id: string) => void,
  onActivate: (id: string) => void,
  onComplete: (id: string) => void
) {
  return useCallback(
    (e: React.KeyboardEvent) => {
      const idx = focusedId ? taskIds.indexOf(focusedId) : -1;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = taskIds[idx + 1];
          if (next) onFocus(next);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = taskIds[idx - 1];
          if (prev) onFocus(prev);
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (focusedId) onActivate(focusedId);
          break;
        }
        case " ": {
          e.preventDefault();
          if (focusedId) onComplete(focusedId);
          break;
        }
      }
    },
    [taskIds, focusedId, onFocus, onActivate, onComplete]
  );
}
