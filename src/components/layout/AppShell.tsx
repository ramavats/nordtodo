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
import { useAppStore } from "@/store/appStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useGlobalKeyboard } from "@/hooks/useKeyboard";
import { usePreferences } from "@/hooks/usePreferences";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { isDetailPanelOpen, isPaletteOpen, isSettingsOpen, showOnboarding } = useAppStore();
  const { expanded: sidebarExpanded } = useSidebarStore();
  const { data: prefs } = usePreferences();

  // Register global keyboard shortcuts
  useGlobalKeyboard();

  return (
    <div
      className={cn(
        "flex h-screen w-screen overflow-hidden",
        "bg-background text-text",
        prefs?.reduceMotion ? "reduce-motion" : ""
      )}
      data-testid="app-shell"
    >
      {/* ── Sidebar ── */}
      <Sidebar />

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar />

        <div className="flex flex-1 overflow-hidden">
          {/* Task list */}
          <main
            className="flex-1 overflow-hidden"
            role="main"
            aria-label="Task list"
          >
            <TaskView />
          </main>

          {/* Detail panel — slides in from right */}
          <AnimatePresence mode="wait">
            {isDetailPanelOpen && (
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
