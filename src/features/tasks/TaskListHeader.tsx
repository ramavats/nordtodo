import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { cn, priorityConfig } from "@/lib/utils";
import type { SortField, SortDir, Priority } from "@/types";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "sort_order", label: "Manual" },
  { value: "due_at", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "created_at", label: "Created" },
  { value: "title", label: "Title" },
];

export function TaskListHeader() {
  const { filters, setFilters, resetFilters } = useAppStore();
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.priority !== null || filters.tags.length > 0 || filters.search !== "";

  return (
    <div className="px-4 pb-2 flex-shrink-0">
      {/* Filter row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          {/* Active filter chips */}
          {filters.priority && (
            <FilterChip
              label={priorityConfig[filters.priority].label}
              color={priorityConfig[filters.priority].color}
              onRemove={() => setFilters({ priority: null })}
            />
          )}
          {filters.tags.map((tag) => (
            <FilterChip
              key={tag}
              label={`#${tag}`}
              onRemove={() =>
                setFilters({ tags: filters.tags.filter((t) => t !== tag) })
              }
            />
          ))}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-text-faint hover:text-error transition-colors whitespace-nowrap"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Sort control */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <SortSelect
            value={filters.sortBy}
            dir={filters.sortDir}
            onChange={(sortBy, sortDir) => setFilters({ sortBy, sortDir })}
          />

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-1.5 rounded transition-colors text-xs",
              showFilters || hasActiveFilters
                ? "bg-accent/15 text-accent"
                : "text-text-faint hover:text-text hover:bg-surface-2"
            )}
            title="Filters"
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>
      </div>

      {/* Expanded filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1 border-t border-border mt-2">
              <p className="text-xs text-text-faint mb-2">Filter by priority</p>
              <div className="flex gap-1.5 flex-wrap">
                {(["urgent", "high", "medium", "none"] as Priority[]).map((p) => {
                  const cfg = priorityConfig[p];
                  const isActive = filters.priority === p;
                  return (
                    <button
                      key={p}
                      onClick={() =>
                        setFilters({ priority: isActive ? null : p })
                      }
                      className={cn(
                        "px-2.5 py-1 rounded text-xs transition-colors",
                        isActive
                          ? `${cfg.color} ${cfg.bgColor} font-medium`
                          : "text-text-muted hover:bg-surface-2"
                      )}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({
  label,
  color,
  onRemove,
}: {
  label: string;
  color?: string;
  onRemove: () => void;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
        "bg-accent/15 text-accent whitespace-nowrap"
      )}
    >
      <span className={color}>{label}</span>
      <button
        onClick={onRemove}
        className="hover:text-accent-hover transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X size={10} />
      </button>
    </motion.span>
  );
}

function SortSelect({
  value,
  dir,
  onChange,
}: {
  value: SortField;
  dir: SortDir;
  onChange: (field: SortField, dir: SortDir) => void;
}) {
  const current = SORT_OPTIONS.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1 text-xs text-text-faint hover:text-text transition-colors px-1.5 py-1 rounded hover:bg-surface-2"
        onClick={() => {
          // cycle through sort options
          const idx = SORT_OPTIONS.findIndex((o) => o.value === value);
          const next = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length];
          onChange(next.value, dir);
        }}
      >
        {current?.label ?? "Sort"}
        <ChevronDown size={11} />
      </button>
    </div>
  );
}
