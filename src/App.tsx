import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/appStore";
import { usePreferences } from "@/hooks/usePreferences";

export default function App() {
  const { setShowOnboarding, setActiveView } = useAppStore();
  const { data: prefs } = usePreferences();

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

  return <AppShell />;
}
