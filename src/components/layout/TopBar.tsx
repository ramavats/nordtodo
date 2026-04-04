import { Search, Command, Settings, PanelLeftOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useTaskCounts } from "@/hooks/useTasks";
import { cn, modKey } from "@/lib/utils";

const SMART_VIEW_LABELS: Record<string, string> = {
  inbox: "Inbox",
  today: "Today",
  upcoming: "Upcoming",
  overdue: "Overdue",
  completed: "Completed",
  archived: "Archived",
  no_date: "No Date",
  flagged: "Flagged",
  all: "All Tasks",
};

export function TopBar() {
  const { activeView, setPaletteOpen, setSearchOpen, setSettingsOpen } = useAppStore();
  const { toggle: toggleSidebar, expanded } = useSidebarStore();
  const { data: counts } = useTaskCounts();

  const viewLabel = SMART_VIEW_LABELS[activeView] ?? activeView;

  return (
    <header
      className={cn(
        "flex items-center h-12 px-4 gap-3",
        "border-b border-border",
        "bg-surface flex-shrink-0 select-none"
      )}
      data-testid="topbar"
    >
      {/* Sidebar toggle (visible only when sidebar collapsed) */}
      {!expanded && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          title="Open sidebar"
          aria-label="Open sidebar"
          data-testid="topbar-sidebar-toggle"
        >
          <PanelLeftOpen size={15} />
        </motion.button>
      )}

      {/* View title */}
      <h1 className="text-sm font-semibold text-text-secondary flex-1 min-w-0 truncate">
        {viewLabel}
        {counts && activeView in counts && (
          <span className="ml-2 text-text-faint font-normal text-xs">
            {(counts as unknown as Record<string, number>)[activeView]}
          </span>
        )}
      </h1>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-md",
            "text-text-muted hover:text-text hover:bg-surface-2",
            "text-xs transition-colors"
          )}
          title={`Search (${modKey()}+F)`}
          data-testid="topbar-search-btn"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline">{modKey()}F</kbd>
        </button>

        {/* Command palette */}
        <button
          onClick={() => setPaletteOpen(true)}
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-md",
            "text-text-muted hover:text-text hover:bg-surface-2",
            "text-xs transition-colors"
          )}
          title={`Command palette (${modKey()}+K)`}
          data-testid="topbar-palette-btn"
        >
          <Command size={14} />
          <kbd className="hidden sm:inline">{modKey()}K</kbd>
        </button>

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className={cn(
            "p-1.5 rounded-md",
            "text-text-muted hover:text-text hover:bg-surface-2",
            "transition-colors"
          )}
          title={`Settings (${modKey()}+,)`}
          data-testid="topbar-settings-btn"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
}
