import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox, Sun, Calendar, CalendarDays, CheckCircle, Archive,
  Flag, Hash, Plus, ChevronsLeft, Settings, AlignLeft,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useSidebarStore } from "@/store/sidebarStore";
import { useTaskCounts, useTags } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import type { SmartView, Tag } from "@/types";

interface NavItem {
  id: SmartView | string;
  label: string;
  icon: React.ElementType;
  countKey?: keyof { inbox: number; today: number; upcoming: number; overdue: number; completed: number; flagged: number };
  isDanger?: boolean;
}

const SYSTEM_VIEWS: NavItem[] = [
  { id: "inbox", label: "Inbox", icon: Inbox, countKey: "inbox" },
  { id: "today", label: "Today", icon: Sun, countKey: "today" },
  { id: "upcoming", label: "Upcoming", icon: Calendar, countKey: "upcoming" },
  { id: "overdue", label: "Overdue", icon: CalendarDays, countKey: "overdue", isDanger: true },
  { id: "flagged", label: "Flagged", icon: Flag, countKey: "flagged" },
  { id: "no_date", label: "No Date", icon: AlignLeft },
  { id: "completed", label: "Completed", icon: CheckCircle, countKey: "completed" },
  { id: "archived", label: "Archived", icon: Archive },
];

export function Sidebar() {
  const { activeView, setActiveView, setSettingsOpen } = useAppStore();
  const { expanded, toggle } = useSidebarStore();
  const { data: counts } = useTaskCounts();
  const { data: tags } = useTags();

  const sidebarWidth = expanded ? "14rem" : "3.5rem";

  return (
    <motion.nav
      layout
      animate={{ width: sidebarWidth }}
      transition={{ type: "spring", damping: 30, stiffness: 250 }}
      className={cn(
        "flex flex-col h-full bg-surface border-r border-border overflow-hidden",
        "flex-shrink-0 select-none relative z-sidebar"
      )}
      aria-label="Application navigation"
      data-testid="sidebar"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 pt-4 pb-3 flex-shrink-0">
        <AnimatePresence>
          {expanded && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <NordLogo />
              <span className="text-sm font-semibold text-text truncate">Nord Todo</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!expanded && (
          <div className="mx-auto">
            <NordLogo />
          </div>
        )}

        {expanded && (
          <button
            onClick={toggle}
            className="p-1 rounded text-text-faint hover:text-text hover:bg-surface-2 transition-colors flex-shrink-0"
            aria-label="Collapse sidebar"
            title="Collapse sidebar (Ctrl+\\)"
            data-testid="sidebar-collapse-btn"
          >
            <ChevronsLeft size={14} />
          </button>
        )}
      </div>

      {/* ── Expand button (collapsed state) ── */}
      {!expanded && (
        <button
          onClick={toggle}
          className="w-full flex justify-center py-1 text-text-faint hover:text-text hover:bg-surface-2 transition-colors"
          aria-label="Expand sidebar"
        >
          <motion.div whileHover={{ x: 2 }} transition={{ type: "spring", stiffness: 400 }}>
            <ChevronsLeft size={14} className="rotate-180" />
          </motion.div>
        </button>
      )}

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 space-y-0.5">
        {/* System views */}
        {SYSTEM_VIEWS.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            expanded={expanded}
            count={item.countKey ? counts?.[item.countKey] : undefined}
            onClick={() => setActiveView(item.id)}
            isDanger={item.isDanger}
          />
        ))}

        {/* Tags section */}
        {tags && tags.length > 0 && (
          <>
            <SectionDivider expanded={expanded} label="Tags" />
            {tags.map((tag) => (
              <NavRow
                key={tag.id}
                item={{ id: `tag:${tag.name}`, label: tag.name, icon: Hash }}
                isActive={activeView === `tag:${tag.name}`}
                expanded={expanded}
                count={tag.taskCount ?? undefined}
                onClick={() => setActiveView(`tag:${tag.name}`)}
                tagColor={tag.color ?? undefined}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 border-t border-border p-2">
        <NavRow
          item={{ id: "__settings", label: "Settings", icon: Settings }}
          isActive={false}
          expanded={expanded}
          onClick={() => setSettingsOpen(true)}
        />
      </div>
    </motion.nav>
  );
}

// ── NavRow ──────────────────────────────────────────────────

interface NavRowProps {
  item: { id: string; label: string; icon: React.ElementType };
  isActive: boolean;
  expanded: boolean;
  count?: number;
  onClick: () => void;
  isDanger?: boolean;
  tagColor?: string;
}

function NavRow({ item, isActive, expanded, count, onClick, isDanger, tagColor }: NavRowProps) {
  const Icon = item.icon;
  const showBadge = typeof count === "number" && count > 0;

  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left",
        "text-sm transition-colors duration-150 relative group",
        isActive
          ? "bg-accent/15 text-accent font-medium"
          : isDanger
          ? "text-text-muted hover:text-error hover:bg-error/10"
          : "text-text-muted hover:text-text hover:bg-surface-2"
      )}
      data-testid={`nav-${item.id}`}
      aria-current={isActive ? "page" : undefined}
    >
      {/* Icon */}
      <span
        className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
        style={tagColor ? { color: tagColor } : undefined}
      >
        <Icon size={14} className={cn(isActive && "text-accent")} />
      </span>

      {/* Label */}
      <AnimatePresence>
        {expanded && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 truncate min-w-0 whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Count badge */}
      <AnimatePresence>
        {expanded && showBadge && (
          <motion.span
            key="count"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "flex-shrink-0 text-xs rounded-full px-1.5 py-0 min-w-[1.2rem] text-center",
              isActive
                ? "bg-accent/25 text-accent"
                : isDanger
                ? "bg-error/15 text-error"
                : "bg-surface-3 text-text-faint"
            )}
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Collapsed badge (dot only) */}
      {!expanded && showBadge && (
        <span
          className={cn(
            "absolute top-1 right-1 w-1.5 h-1.5 rounded-full",
            isDanger ? "bg-error" : "bg-accent"
          )}
        />
      )}
    </motion.button>
  );
}

// ── Section divider ──────────────────────────────────────────

function SectionDivider({ expanded, label }: { expanded: boolean; label: string }) {
  return (
    <div className="pt-3 pb-1 px-2">
      <AnimatePresence>
        {expanded ? (
          <motion.span
            key="label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs font-semibold text-text-faint uppercase tracking-wider"
          >
            {label}
          </motion.span>
        ) : (
          <motion.hr
            key="divider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-border"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Nord Logo SVG ────────────────────────────────────────────

function NordLogo() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Nord Todo logo"
      role="img"
    >
      {/* Geometric mark: a checkmark inside a rounded diamond */}
      <rect
        x="2"
        y="2"
        width="16"
        height="16"
        rx="4"
        fill="#3B4252"
        stroke="#88C0D0"
        strokeWidth="1.5"
      />
      <path
        d="M6 10L8.5 12.5L14 7"
        stroke="#88C0D0"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
