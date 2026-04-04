import { useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/appStore";
import { usePreferences } from "@/hooks/usePreferences";
import { useWindowStore } from "@/store/windowStore";
import { useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "@/hooks/useTasks";
import * as api from "@/lib/tauriApi";

export default function App() {
  const { setShowOnboarding, setActiveView, setProductiveMode } = useAppStore();
  const { data: prefs } = usePreferences();
  const { mode: windowMode, enterSlimMode } = useWindowStore();
  const qc = useQueryClient();
  const syncingRef = useRef(false);

  // Check if first run — show onboarding
  useEffect(() => {
    if (prefs && !prefs.firstRunComplete) {
      setShowOnboarding(true);
    }
  }, [prefs?.firstRunComplete]);

  // Set startup view from preferences
  useEffect(() => {
    if (prefs?.startupView) {
      setActiveView(prefs.startupView);
    }
  }, [prefs?.startupView]);

  useEffect(() => {
    setProductiveMode(prefs?.productiveMode ?? false);
  }, [prefs?.productiveMode, setProductiveMode]);

  // Restore window mode on launch — if user had slim mode active last session,
  // re-apply the OS-level positioning (size + always-on-top) on startup.
  useEffect(() => {
    if (windowMode === "slim") {
      // Small delay so Tauri's window is fully ready before we resize it
      const t = setTimeout(() => { void enterSlimMode(); }, 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Auto sync Google Tasks on user-defined interval (seconds).
  useEffect(() => {
    const seconds = prefs?.autoSyncSeconds ?? 0;
    if (seconds <= 0) return;

    const intervalMs = Math.max(1, seconds) * 1000;
    const tick = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        await api.syncGoogleTasks();
        await Promise.all([
          qc.invalidateQueries({ queryKey: taskKeys.lists() }),
          qc.invalidateQueries({ queryKey: taskKeys.counts() }),
        ]);
      } catch {
        // Silent: avoid noisy toasts on background auto-sync failures.
      } finally {
        syncingRef.current = false;
      }
    };

    const id = window.setInterval(() => { void tick(); }, intervalMs);
    return () => window.clearInterval(id);
  }, [prefs?.autoSyncSeconds, qc]);

  return <AppShell />;
}
