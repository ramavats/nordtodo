/**
 * SlimModeBar — the narrow top strip shown when the window is in slim/docked mode.
 *
 * Contains:
 *   • Nord Todo logo (compact)
 *   • Current view selector (dropdown or pill row)
 *   • "Expand to full window" button
 *   • "Hide window" button
 *
 * Design: very compact (~40px tall), Nord surface-2 bg, no border-b clutter.
 */

import { motion } from "framer-motion";
import {
  Maximize2,
  EyeOff,
  Inbox,
  Sun,
  Calendar,
  Flag,
  CheckCircle,
} from "lucide-react";
import { useWindowStore } from "@/store/windowStore";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";
import type { SmartView } from "@/types";

const QUICK_VIEWS: { id: SmartView; icon: React.ElementType; label: string }[] = [
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "today", icon: Sun, label: "Today" },
  { id: "upcoming", icon: Calendar, label: "Upcoming" },
  { id: "flagged", icon: Flag, label: "Flagged" },
  { id: "completed", icon: CheckCircle, label: "Completed" },
];

export function SlimModeBar() {
  const { exitSlimMode, hideWindow } = useWindowStore();
  const { activeView, setActiveView } = useAppStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="flex flex-col flex-shrink-0 bg-surface border-b border-border select-none"
      data-testid="slim-mode-bar"
    >
      {/* ── Row 1: Logo + actions ── */}
      <div className="flex items-center justify-between px-3 py-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <NordLogoSmall />
          <span className="text-xs font-semibold text-text tracking-wide">Nord Todo</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {/* Expand to normal */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={exitSlimMode}
            className={cn(
              "p-1.5 rounded-md",
              "text-text-muted hover:text-accent hover:bg-accent/10",
              "transition-colors"
            )}
            title="Expand to full window (Ctrl+Shift+S)"
            aria-label="Expand to full window"
          >
            <Maximize2 size={13} />
          </motion.button>

          {/* Hide window */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={hideWindow}
            className={cn(
              "p-1.5 rounded-md",
              "text-text-muted hover:text-text-secondary hover:bg-surface-2",
              "transition-colors"
            )}
            title="Hide to system tray (Ctrl+Shift+H)"
            aria-label="Hide to system tray"
          >
            <EyeOff size={13} />
          </motion.button>
        </div>
      </div>

      {/* ── Row 2: Quick view pills ── */}
      <div className="flex items-center gap-0.5 px-2 pb-1.5 overflow-x-auto scrollbar-none">
        {QUICK_VIEWS.map(({ id, icon: Icon, label }) => {
          const isActive = activeView === id;
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveView(id)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs whitespace-nowrap flex-shrink-0",
                "transition-colors duration-100",
                isActive
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-text-muted hover:text-text hover:bg-surface-2"
              )}
              title={label}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={11} />
              <span>{label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function NordLogoSmall() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Nord Todo"
      role="img"
    >
      <rect x="2" y="2" width="16" height="16" rx="4" fill="#3B4252" stroke="#88C0D0" strokeWidth="1.5" />
      <path d="M6 10L8.5 12.5L14 7" stroke="#88C0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
