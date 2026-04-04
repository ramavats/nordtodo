import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Inbox, Sun, Calendar, Flag, CheckCircle, Archive,
  Settings, Plus, Download, Upload, X, AlignLeft, Hash
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import type { PaletteCommand, SmartView } from "@/types";

export function CommandPalette() {
  const { setPaletteOpen, setActiveView, setSearchOpen, setSettingsOpen, openDetailPanel } = useAppStore();
  const { toggle: toggleSidebar } = useSidebarStore();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 100);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commands: PaletteCommand[] = useMemo(() => [
    // Navigation
    {
      id: "nav-inbox", label: "Go to Inbox", icon: "Inbox", section: "Navigate",
      action: () => { setActiveView("inbox"); setPaletteOpen(false); },
      keywords: ["inbox", "all tasks"],
    },
    {
      id: "nav-today", label: "Go to Today", icon: "Sun", section: "Navigate",
      action: () => { setActiveView("today"); setPaletteOpen(false); },
      keywords: ["today", "due"],
    },
    {
      id: "nav-upcoming", label: "Go to Upcoming", icon: "Calendar", section: "Navigate",
      action: () => { setActiveView("upcoming"); setPaletteOpen(false); },
    },
    {
      id: "nav-overdue", label: "Go to Overdue", icon: "Calendar", section: "Navigate",
      action: () => { setActiveView("overdue"); setPaletteOpen(false); },
    },
    {
      id: "nav-flagged", label: "Go to Flagged", icon: "Flag", section: "Navigate",
      action: () => { setActiveView("flagged"); setPaletteOpen(false); },
    },
    {
      id: "nav-completed", label: "Go to Completed", icon: "CheckCircle", section: "Navigate",
      action: () => { setActiveView("completed"); setPaletteOpen(false); },
    },
    {
      id: "nav-archived", label: "Go to Archived", icon: "Archive", section: "Navigate",
      action: () => { setActiveView("archived"); setPaletteOpen(false); },
    },
    // Actions
    {
      id: "new-task", label: "New task", icon: "Plus", section: "Actions",
      action: () => {
        setPaletteOpen(false);
        setTimeout(() => document.dispatchEvent(new CustomEvent("nordtodo:focus-quickadd")), 100);
      },
      keywords: ["add", "create", "new"],
      kbd: ["Ctrl", "N"],
    },
    {
      id: "toggle-sidebar", label: "Toggle sidebar", icon: "AlignLeft", section: "Actions",
      action: () => { toggleSidebar(); setPaletteOpen(false); },
      kbd: ["Ctrl", "\\"],
    },
    {
      id: "open-settings", label: "Open settings", icon: "Settings", section: "Actions",
      action: () => { setSettingsOpen(true); setPaletteOpen(false); },
      kbd: ["Ctrl", ","],
    },
    {
      id: "open-search", label: "Search tasks", icon: "Search", section: "Actions",
      action: () => { setPaletteOpen(false); setSearchOpen(true); },
      kbd: ["Ctrl", "F"],
    },
  ], [setActiveView, setPaletteOpen, setSettingsOpen, setSearchOpen, toggleSidebar]);

  const filtered = useMemo(() => {
    if (!debouncedQuery.trim()) return commands;
    const q = debouncedQuery.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords?.some((k) => k.toLowerCase().includes(q)) ||
        c.section?.toLowerCase().includes(q)
    );
  }, [commands, debouncedQuery]);

  const groups = useMemo(() => {
    const g: Record<string, PaletteCommand[]> = {};
    for (const cmd of filtered) {
      const section = cmd.section ?? "Other";
      if (!g[section]) g[section] = [];
      g[section].push(cmd);
    }
    return Object.entries(g);
  }, [filtered]);

  const flatFiltered = filtered;

  useEffect(() => {
    setSelectedIdx(0);
  }, [debouncedQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIdx((i) => Math.min(i + 1, flatFiltered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIdx((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          flatFiltered[selectedIdx]?.action();
          break;
        case "Escape":
          e.preventDefault();
          setPaletteOpen(false);
          break;
      }
    },
    [flatFiltered, selectedIdx, setPaletteOpen]
  );

  const iconMap: Record<string, React.ElementType> = {
    Inbox, Sun, Calendar, Flag, CheckCircle, Archive, Settings, Plus, AlignLeft, Search, Hash,
  };

  return (
    <motion.div
      className="fixed inset-0 z-palette flex items-start justify-center pt-24 palette-backdrop bg-background/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={() => setPaletteOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className={cn(
          "w-full max-w-lg mx-4",
          "bg-surface border border-border rounded-xl overflow-hidden",
          "shadow-palette"
        )}
        onClick={(e) => e.stopPropagation()}
        data-testid="command-palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={15} className="text-text-faint flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-faint outline-none"
            data-testid="palette-input"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-text-faint hover:text-text transition-colors"
            >
              <X size={13} />
            </button>
          )}
          <kbd>Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1.5" role="listbox">
          {groups.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-text-faint">
              No commands found
            </div>
          ) : (
            groups.map(([section, cmds]) => {
              let flatIdx = flatFiltered.findIndex((c) => c.id === cmds[0]?.id);
              return (
                <div key={section}>
                  <div className="px-4 py-1.5 text-xs font-semibold text-text-faint uppercase tracking-wider">
                    {section}
                  </div>
                  {cmds.map((cmd, i) => {
                    const idx = flatFiltered.findIndex((c) => c.id === cmd.id);
                    const Icon = cmd.icon ? iconMap[cmd.icon] : undefined;
                    return (
                      <motion.button
                        key={cmd.id}
                        whileHover={{ x: 2 }}
                        onClick={cmd.action}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-left text-sm",
                          "transition-colors",
                          idx === selectedIdx
                            ? "bg-accent/15 text-text"
                            : "text-text-secondary hover:bg-surface-2"
                        )}
                        role="option"
                        aria-selected={idx === selectedIdx}
                        data-testid={`palette-cmd-${cmd.id}`}
                      >
                        {Icon && (
                          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-text-faint">
                            <Icon size={14} />
                          </span>
                        )}
                        <span className="flex-1">{cmd.label}</span>
                        {cmd.kbd && (
                          <div className="flex gap-0.5">
                            {cmd.kbd.map((k) => (
                              <kbd key={k}>{k}</kbd>
                            ))}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border bg-background/30">
          <span className="text-xs text-text-faint flex items-center gap-1.5">
            <kbd>↑↓</kbd> navigate
          </span>
          <span className="text-xs text-text-faint flex items-center gap-1.5">
            <kbd>↵</kbd> select
          </span>
          <span className="text-xs text-text-faint flex items-center gap-1.5">
            <kbd>Esc</kbd> close
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
