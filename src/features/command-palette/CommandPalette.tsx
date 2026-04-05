import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Inbox, Sun, Calendar, Flag, CheckCircle, Archive,
  Settings, Plus, X, AlignLeft, Hash
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import type { PaletteCommand } from "@/types";

export function CommandPalette() {
  const { setPaletteOpen, setActiveView, setSearchOpen, setSettingsOpen } = useAppStore();
  const { toggle: toggleSidebar } = useSidebarStore();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 100);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const closeModal = useCallback(() => {
    setPaletteOpen(false);
    setSearchOpen(false);
  }, [setPaletteOpen, setSearchOpen]);

  const commands: PaletteCommand[] = useMemo(() => [
    // Navigation
    {
      id: "nav-inbox", label: "Go to Inbox", icon: "Inbox", section: "Navigate",
      action: () => { setActiveView("inbox"); closeModal(); },
      keywords: ["inbox", "all tasks"],
    },
    {
      id: "nav-today", label: "Go to Today", icon: "Sun", section: "Navigate",
      action: () => { setActiveView("today"); closeModal(); },
      keywords: ["today", "due"],
    },
    {
      id: "nav-upcoming", label: "Go to Upcoming", icon: "Calendar", section: "Navigate",
      action: () => { setActiveView("upcoming"); closeModal(); },
    },
    {
      id: "nav-overdue", label: "Go to Overdue", icon: "Calendar", section: "Navigate",
      action: () => { setActiveView("overdue"); closeModal(); },
    },
    {
      id: "nav-flagged", label: "Go to Flagged", icon: "Flag", section: "Navigate",
      action: () => { setActiveView("flagged"); closeModal(); },
    },
    {
      id: "nav-completed", label: "Go to Completed", icon: "CheckCircle", section: "Navigate",
      action: () => { setActiveView("completed"); closeModal(); },
    },
    {
      id: "nav-archived", label: "Go to Archived", icon: "Archive", section: "Navigate",
      action: () => { setActiveView("archived"); closeModal(); },
    },
    // Actions
    {
      id: "new-task", label: "New task", icon: "Plus", section: "Actions",
      action: () => {
        closeModal();
        setTimeout(() => document.dispatchEvent(new CustomEvent("nordtodo:focus-quickadd")), 100);
      },
      keywords: ["add", "create", "new"],
      kbd: ["Ctrl", "N"],
    },
    {
      id: "toggle-sidebar", label: "Toggle sidebar", icon: "AlignLeft", section: "Actions",
      action: () => { toggleSidebar(); closeModal(); },
      kbd: ["Ctrl", "\\"],
    },
    {
      id: "open-settings", label: "Open settings", icon: "Settings", section: "Actions",
      action: () => { setSettingsOpen(true); closeModal(); },
      kbd: ["Ctrl", ","],
    },
    {
      id: "open-search", label: "Search tasks", icon: "Search", section: "Actions",
      action: () => { setSearchOpen(true); inputRef.current?.focus(); },
      kbd: ["Ctrl", "F"],
    },
  ], [setActiveView, closeModal, setSettingsOpen, setSearchOpen, toggleSidebar]);

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
          closeModal();
          break;
      }
    },
    [flatFiltered, selectedIdx, closeModal]
  );

  const iconMap: Record<string, React.ElementType> = {
    Inbox, Sun, Calendar, Flag, CheckCircle, Archive, Settings, Plus, AlignLeft, Search, Hash,
  };

  return (
    <motion.div
      className="fixed inset-0 z-palette flex items-start justify-center pt-16 palette-backdrop bg-background/45"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={closeModal}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className={cn(
          "w-full max-w-[560px] mx-4",
          "bg-surface/95 border border-border/90 rounded-2xl overflow-hidden",
          "shadow-[0_24px_60px_rgba(8,12,24,0.45)]"
        )}
        onClick={(e) => e.stopPropagation()}
        data-testid="command-palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/80">
          <Search size={16} className="text-text-faint flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className="flex-1 bg-surface-2/75 text-sm text-text placeholder:text-text-faint outline-none border border-border rounded-lg px-2.5 py-1.5"
            data-testid="palette-input"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-text-faint hover:text-text transition-colors p-1 rounded hover:bg-surface-2"
            >
              <X size={13} />
            </button>
          )}
          <kbd>Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[430px] overflow-y-auto overflow-x-hidden py-2" role="listbox">
          {groups.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-faint">
              No commands found
            </div>
          ) : (
            groups.map(([section, cmds]) => {
              return (
                <div key={section}>
                  <div className="px-4 pt-2 pb-1 text-[11px] font-semibold text-text-faint uppercase tracking-wider">
                    {section}
                  </div>
                  {cmds.map((cmd) => {
                    const idx = flatFiltered.findIndex((c) => c.id === cmd.id);
                    const Icon = cmd.icon ? iconMap[cmd.icon] : undefined;
                    return (
                      <motion.button
                        key={cmd.id}
                        onClick={cmd.action}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm",
                          "transition-colors",
                          idx === selectedIdx
                            ? "bg-surface-2/90 text-text"
                            : "text-text-secondary hover:bg-surface-2/70"
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
                          <div className="flex gap-1">
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
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border/80 bg-background/20 overflow-x-hidden">
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
