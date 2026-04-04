/**
 * DateTimePicker — fully custom Nord-styled date + time picker.
 * Replaces the native <input type="datetime-local"> with a dropdown
 * calendar that matches the app's design system perfectly.
 *
 * Props:
 *   value    — ISO string or null
 *   onChange — called with ISO string when date/time changes, or null to clear
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, ChevronLeft, ChevronRight, X, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO, isValid, setHours, setMinutes,
  getHours, getMinutes,
} from "date-fns";

interface DateTimePickerProps {
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
  placeholder?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "No due date",
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse the current value into a Date (or null)
  const parsed = value && isValid(parseISO(value)) ? parseISO(value) : null;

  // The month currently shown in the calendar grid
  const [viewMonth, setViewMonth] = useState<Date>(parsed ?? new Date());

  // Time fields (hours / minutes as strings for controlled inputs)
  const [hour, setHour] = useState(parsed ? String(getHours(parsed)).padStart(2, "0") : "00");
  const [minute, setMinute] = useState(parsed ? String(getMinutes(parsed)).padStart(2, "0") : "00");

  // Sync hour/minute when the external value changes
  useEffect(() => {
    if (parsed) {
      setHour(String(getHours(parsed)).padStart(2, "0"));
      setMinute(String(getMinutes(parsed)).padStart(2, "0"));
      setViewMonth(parsed);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // When user picks a day
  function selectDay(day: Date) {
    const h = parseInt(hour) || 0;
    const m = parseInt(minute) || 0;
    let d = setHours(day, h);
    d = setMinutes(d, m);
    onChange(d.toISOString());
    setViewMonth(d);
  }

  // When user changes time — update keeping the same date
  function commitTime(h: string, m: string) {
    if (!parsed) return;
    let d = setHours(parsed, parseInt(h) || 0);
    d = setMinutes(d, parseInt(m) || 0);
    onChange(d.toISOString());
  }

  // Calendar grid days
  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const displayLabel = parsed
    ? format(parsed, "MMM d, yyyy  h:mm a")
    : placeholder;

  return (
    <div ref={containerRef} className="relative w-full" data-testid="date-time-picker">
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm",
          "bg-surface-2 border transition-colors text-left",
          open ? "border-accent" : "border-border hover:border-border/80",
          parsed ? "text-text" : "text-text-faint"
        )}
        aria-label="Pick due date"
      >
        <Calendar size={13} className={cn("flex-shrink-0", parsed ? "text-accent" : "text-text-faint")} />
        <span className="flex-1 truncate">{displayLabel}</span>
        {parsed && (
          <span
            role="button"
            aria-label="Clear date"
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="flex-shrink-0 p-0.5 rounded hover:bg-surface-3 text-text-faint hover:text-error transition-colors"
          >
            <X size={11} />
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "absolute z-50 mt-1.5 w-64",
              "bg-surface border border-border rounded-xl shadow-lg",
              "overflow-hidden"
            )}
            data-testid="date-picker-dropdown"
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <button
                type="button"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                className="p-1 rounded-md text-text-faint hover:text-text hover:bg-surface-2 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={14} />
              </button>

              <span className="text-sm font-semibold text-text">
                {format(viewMonth, "MMMM yyyy")}
              </span>

              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="p-1 rounded-md text-text-faint hover:text-text hover:bg-surface-2 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 px-2 pb-1">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <div key={d} className="text-center text-xs text-text-faint py-0.5">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
              {days.map((day) => {
                const isSelected = parsed ? isSameDay(day, parsed) : false;
                const isCurrentMonth = isSameMonth(day, viewMonth);
                const isTodayDay = isToday(day);

                return (
                  <button
                    type="button"
                    key={day.toISOString()}
                    onClick={() => selectDay(day)}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded-md text-xs transition-colors",
                      isSelected
                        ? "bg-accent text-nord-nord0 font-semibold"
                        : isTodayDay
                        ? "border border-accent/50 text-accent font-medium hover:bg-accent/15"
                        : isCurrentMonth
                        ? "text-text hover:bg-surface-2"
                        : "text-text-faint/40 hover:bg-surface-2"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {/* Time picker */}
            <div className="border-t border-border px-3 py-2.5 flex items-center gap-2">
              <Clock size={12} className="text-text-faint flex-shrink-0" />
              <span className="text-xs text-text-faint">Time</span>
              <div className="flex items-center gap-1 ml-auto">
                {/* Hours */}
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={(e) => setHour(e.target.value.padStart(2, "0"))}
                  onBlur={(e) => {
                    const h = String(Math.min(23, Math.max(0, parseInt(e.target.value) || 0))).padStart(2, "0");
                    setHour(h);
                    commitTime(h, minute);
                  }}
                  className={cn(
                    "w-10 text-center text-sm bg-surface-2 text-text rounded px-1 py-0.5",
                    "border border-border focus:border-accent outline-none transition-colors"
                  )}
                  aria-label="Hour"
                />
                <span className="text-text-faint font-bold text-sm">:</span>
                {/* Minutes */}
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minute}
                  onChange={(e) => setMinute(e.target.value.padStart(2, "0"))}
                  onBlur={(e) => {
                    const m = String(Math.min(59, Math.max(0, parseInt(e.target.value) || 0))).padStart(2, "0");
                    setMinute(m);
                    commitTime(hour, m);
                  }}
                  className={cn(
                    "w-10 text-center text-sm bg-surface-2 text-text rounded px-1 py-0.5",
                    "border border-border focus:border-accent outline-none transition-colors"
                  )}
                  aria-label="Minute"
                />
              </div>
            </div>

            {/* Quick shortcuts */}
            <div className="border-t border-border px-2 py-2 flex gap-1.5 flex-wrap">
              {[
                { label: "Today", fn: () => selectDay(new Date()) },
                { label: "Tomorrow", fn: () => { const t = new Date(); t.setDate(t.getDate() + 1); selectDay(t); } },
                { label: "Next week", fn: () => { const t = new Date(); t.setDate(t.getDate() + 7); selectDay(t); } },
              ].map(({ label, fn }) => (
                <button
                  type="button"
                  key={label}
                  onClick={fn}
                  className="text-xs px-2 py-1 rounded-md bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
