import { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useWindowStore } from "@/store/windowStore";
import { usePreferences } from "@/hooks/usePreferences";
import * as api from "@/lib/tauriApi";
import toast from "react-hot-toast";

/**
 * Global keyboard shortcut handler.
 * Registered once at the App root.
 */
export function useGlobalKeyboard() {
  const syncInFlightRef = useRef(false);
  const syncStartedAtRef = useRef<number | null>(null);
  const {
    togglePalette,
    setSearchOpen,
    setSettingsOpen,
    setProductiveMode,
    productiveMode,
    isSearchOpen,
    isPaletteOpen,
    isDetailPanelOpen,
    closeDetailPanel,
    isQuickAddFocused,
  } = useAppStore();
  const { data: prefs } = usePreferences();
  const { toggle: toggleSidebar } = useSidebarStore();
  const { toggleMode: toggleWindowMode, hideWindow } = useWindowStore();

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

      // Cmd/Ctrl+Shift+S — Toggle slim/docked mode
      if (isMod && e.shiftKey && e.key === "S") {
        e.preventDefault();
        void toggleWindowMode();
        return;
      }

      // Cmd/Ctrl+Shift+H - Hide to system tray
      if (isMod && e.shiftKey && e.key === "H") {
        e.preventDefault();
        void hideWindow();
        return;
      }

      // Cmd/Ctrl+Shift+P - Toggle Productive Mode
      if (isMod && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        const next = !productiveMode;
        setProductiveMode(next);
        void api.updatePreferences({ productiveMode: next })
          .catch(() => {
            toast.error("Failed to save Productive Mode preference");
          });
        toast(next ? "Productive Mode on" : "Productive Mode off", { id: "productive-mode" });
        return;
      }

      // Cmd/Ctrl+Shift+G - Sync integrations (Google Tasks)
      if (isMod && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (prefs?.localOnlyMode) {
          toast.error("Turn off Local only mode in Settings to sync integrations", { id: "integration-sync" });
          return;
        }
        // Recover if a previous sync flag got stuck for too long.
        if (
          syncInFlightRef.current &&
          syncStartedAtRef.current &&
          Date.now() - syncStartedAtRef.current > 90_000
        ) {
          syncInFlightRef.current = false;
          syncStartedAtRef.current = null;
        }

        if (syncInFlightRef.current) {
          toast("Sync already in progress", { id: "integration-sync" });
          return;
        }

        syncInFlightRef.current = true;
        syncStartedAtRef.current = Date.now();
        toast.loading("Syncing integrations...", { id: "integration-sync" });
        void (async () => {
          try {
            const result = await api.syncGoogleTasks();
            toast.success(
              `Sync complete - ${result.imported} imported, ${result.updated} updated, ${result.pushed} pushed`,
              { id: "integration-sync" }
            );
          } catch (err: unknown) {
            const msg =
              typeof err === "string"
                ? err
                : (err as { message?: string })?.message ?? "Integration sync failed";
            toast.error(`Sync failed: ${msg}`, { id: "integration-sync" });
          } finally {
            syncInFlightRef.current = false;
            syncStartedAtRef.current = null;
          }
        })();
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
      toggleWindowMode, hideWindow, productiveMode, setProductiveMode, prefs?.localOnlyMode,
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
