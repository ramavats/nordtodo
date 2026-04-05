import {
  Search,
  Settings,
  PanelLeftOpen,
  PanelRight,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useWindowStore } from "@/store/windowStore";
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
  const { activeView, setSearchOpen, setSettingsOpen } = useAppStore();
  const { toggle: toggleSidebar, expanded } = useSidebarStore();
  const { enterSlimMode } = useWindowStore();
  const { data: counts } = useTaskCounts();

  const viewLabel = SMART_VIEW_LABELS[activeView] ?? activeView;

  return (
    <header
      className={cn(
        "flex items-center h-16 px-6 gap-3",
        "border-b border-border",
        "bg-surface/70 flex-shrink-0 select-none",
      )}
      data-testid="topbar"
    >
      {/* Sidebar toggle (visible only when sidebar collapsed) */}
      {!expanded && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={toggleSidebar}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-accent bg-accent/12 hover:bg-accent/18 hover:text-accent transition-colors"
          title="Open sidebar"
          aria-label="Open sidebar"
          data-testid="topbar-sidebar-toggle"
        >
          <PanelLeftOpen size={16} />
        </motion.button>
      )}

      {/* View title */}
      <h1 className="text-2xl font-bold text-text-secondary flex-1 min-w-0 truncate tracking-tight align-middle">
        {viewLabel}
        {counts && activeView in counts && (
          <span className="ml-2 text-nord-nord3 font-normal text-xl align-middle">
            {(counts as unknown as Record<string, number>)[activeView]}
          </span>
        )}
      </h1>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg min-w-0 sm:min-w-[150px] justify-start",
            "text-text-muted hover:text-text hover:bg-surface-2/80",
            "text-sm transition-colors",
          )}
          title={`Search (${modKey()}+F)`}
          data-testid="topbar-search-btn"
        >
          <Search size={16} />
          <span className="text-sm hidden sm:inline">Search</span>
        </button>

        {/* New task */}
        <button
          onClick={() =>
            document.dispatchEvent(new CustomEvent("nordtodo:focus-quickadd"))
          }
          className={cn(
            "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg whitespace-nowrap",
            "bg-accent/90 text-background hover:bg-accent",
            "text-sm font-medium transition-colors",
          )}
          title={`New task (${modKey()}+N)`}
          data-testid="topbar-new-task-btn"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Task</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className={cn(
            "p-2 rounded-lg",
            "text-text-muted hover:text-text hover:bg-surface-2/80",
            "transition-colors",
          )}
          title={`Settings (${modKey()}+,)`}
          data-testid="topbar-settings-btn"
        >
          <Settings size={16} />
        </button>

        {/* Dock to side */}
        <button
          onClick={enterSlimMode}
          className={cn(
            "p-2 rounded-lg",
            "text-text-muted hover:text-accent hover:bg-accent/10",
            "transition-colors",
          )}
          title={`Dock to side (${modKey()}+Shift+S)`}
          aria-label="Dock to side panel"
          data-testid="topbar-slim-btn"
        >
          <PanelRight size={16} />
        </button>
      </div>
    </header>
  );
}
