import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/appStore";
import { usePreferences } from "@/hooks/usePreferences";
import { useWindowStore } from "@/store/windowStore";

export default function App() {
  const { setShowOnboarding, setActiveView } = useAppStore();
  const { data: prefs } = usePreferences();
  const { mode: windowMode, enterSlimMode } = useWindowStore();

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

  return <AppShell />;
}
