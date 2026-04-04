import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/features/sidebar/Sidebar";
import { TaskView } from "@/features/tasks/TaskView";
import { TaskDetailPanel } from "@/features/tasks/TaskDetailPanel";
import { CommandPalette } from "@/features/command-palette/CommandPalette";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { OnboardingOverlay } from "@/components/ui/OnboardingOverlay";
import { UndoToast } from "@/components/ui/UndoToast";
import { TopBar } from "@/components/layout/TopBar";
import { SlimModeBar } from "@/components/layout/SlimModeBar";
import { useAppStore } from "@/store/appStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useWindowStore } from "@/store/windowStore";
import { useGlobalKeyboard } from "@/hooks/useKeyboard";
import { usePreferences } from "@/hooks/usePreferences";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { isDetailPanelOpen, isPaletteOpen, isSettingsOpen, showOnboarding } = useAppStore();
  const { setExpanded: setSidebarExpanded } = useSidebarStore();
  const { mode: windowMode } = useWindowStore();
  const { data: prefs } = usePreferences();
  const isSlim = windowMode === "slim";

  // Register global keyboard shortcuts
  useGlobalKeyboard();

  // In slim mode, force the internal sidebar collapsed
  useEffect(() => {
    if (isSlim) {
      setSidebarExpanded(false);
    }
  }, [isSlim]);

  return (
    <div
      className={cn(
        "flex h-screen w-screen overflow-hidden",
        "bg-background text-text",
        prefs?.reduceMotion ? "reduce-motion" : "",
        isSlim ? "slim-mode" : ""
      )}
      data-testid="app-shell"
      data-window-mode={windowMode}
    >
      {/* ── Sidebar (hidden in slim mode) ── */}
      <AnimatePresence initial={false}>
        {!isSlim && (
          <motion.div
            key="sidebar-wrapper"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Slim mode bar replaces TopBar when docked */}
        <AnimatePresence mode="wait" initial={false}>
          {isSlim ? (
            <SlimModeBar key="slim-bar" />
          ) : (
            <motion.div
              key="topbar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <TopBar />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 overflow-hidden">
          {/* Task list */}
          <main
            className="flex-1 overflow-hidden"
            role="main"
            aria-label="Task list"
          >
            <TaskView />
          </main>

          {/* Detail panel — hidden in slim mode, slides in from right in normal mode */}
          <AnimatePresence mode="wait">
            {isDetailPanelOpen && !isSlim && (
              <motion.aside
                key="detail-panel"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 360, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 250 }}
                className="border-l border-border overflow-hidden flex-shrink-0"
                aria-label="Task details"
              >
                <TaskDetailPanel />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Overlays ── */}
      <AnimatePresence>
        {isPaletteOpen && <CommandPalette key="palette" />}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && <SettingsPanel key="settings" />}
      </AnimatePresence>

      <AnimatePresence>
        {showOnboarding && <OnboardingOverlay key="onboarding" />}
      </AnimatePresence>

      {/* Undo toast stack */}
      <UndoToast />
    </div>
  );
}
