import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Calendar, Flag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateTask } from "@/hooks/useTasks";
import { useAppStore } from "@/store/appStore";
import { CreateTaskSchema, type CreateTaskInput, type Priority } from "@/types";
import { cn } from "@/lib/utils";
import { priorityConfig } from "@/lib/utils";

const QUICK_PRIORITIES: Priority[] = ["urgent", "high", "medium", "none"];

export function QuickAdd() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<Priority>("none");
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  const createTask = useCreateTask();
  const { setQuickAddFocused } = useAppStore();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: { title: "", priority: "none" },
  });

  // Merge react-hook-form's ref with our local inputRef
  const { ref: registerRef, ...registerRest } = register("title");

  const titleValue = watch("title");

  // Listen for focus-quickadd event from keyboard shortcut
  useEffect(() => {
    const handler = () => {
      inputRef.current?.focus();
      setIsExpanded(true);
    };
    document.addEventListener("nordtodo:focus-quickadd", handler);
    return () => document.removeEventListener("nordtodo:focus-quickadd", handler);
  }, []);

  const onSubmit = useCallback(
    async (data: CreateTaskInput) => {
      if (!data.title.trim()) return;
      await createTask.mutateAsync({
        ...data,
        priority: selectedPriority,
      });
      reset();
      setIsExpanded(false);
      setSelectedPriority("none");
      setShowPriorityPicker(false);
      inputRef.current?.blur();
    },
    [createTask, selectedPriority, reset]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      reset();
      setIsExpanded(false);
      setSelectedPriority("none");
      setShowPriorityPicker(false);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsExpanded(true);
    setQuickAddFocused(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Don't collapse if focus moves to our own children
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (!titleValue?.trim()) {
        setIsExpanded(false);
        setShowPriorityPicker(false);
      }
      setQuickAddFocused(false);
    }
  };

  const pCfg = priorityConfig[selectedPriority];

  return (
    <motion.div
      layout
      className={cn(
        "rounded-lg border transition-all duration-200",
        isExpanded
          ? "border-accent/50 bg-surface shadow-md"
          : "border-border bg-surface hover:border-border-strong"
      )}
      onBlur={handleBlur}
      data-testid="quick-add"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Input row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Plus
            size={14}
            className={cn(
              "flex-shrink-0 transition-colors",
              isExpanded ? "text-accent" : "text-text-faint"
            )}
          />
          <input
            ref={(el) => {
              registerRef(el);
              (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
            }}
            {...registerRest}
            placeholder="Add task… (Ctrl+N)"
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            className="quick-add-input text-sm"
            autoComplete="off"
            spellCheck="false"
            data-testid="quick-add-input"
          />

          {/* Priority picker trigger */}
          <AnimatePresence>
            {isExpanded && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                  selectedPriority !== "none"
                    ? `${pCfg.color} ${pCfg.bgColor}`
                    : "text-text-faint hover:text-text hover:bg-surface-2"
                )}
                title="Set priority"
                data-testid="quick-add-priority"
              >
                <Flag size={11} />
                {selectedPriority !== "none" && pCfg.label}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Submit / cancel */}
          <AnimatePresence>
            {isExpanded && titleValue?.trim() && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-1 flex-shrink-0"
              >
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={createTask.isPending}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium",
                    "bg-accent text-background hover:bg-accent-hover",
                    "transition-colors disabled:opacity-50"
                  )}
                  data-testid="quick-add-submit"
                >
                  {createTask.isPending ? "Adding…" : "Add"}
                </motion.button>

                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setIsExpanded(false);
                    setSelectedPriority("none");
                  }}
                  className="p-1 rounded text-text-faint hover:text-text hover:bg-surface-2 transition-colors"
                  data-testid="quick-add-cancel"
                >
                  <X size={13} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Validation error */}
        <AnimatePresence>
          {errors.title && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 pb-2 text-xs text-error overflow-hidden"
            >
              {errors.title.message}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Priority picker */}
        <AnimatePresence>
          {showPriorityPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="flex items-center gap-1 px-3 py-2">
                <span className="text-xs text-text-faint mr-2">Priority:</span>
                {QUICK_PRIORITIES.map((p) => {
                  const cfg = priorityConfig[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setSelectedPriority(p);
                        setShowPriorityPicker(false);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs transition-colors",
                        selectedPriority === p
                          ? `${cfg.color} ${cfg.bgColor} font-medium`
                          : "text-text-muted hover:bg-surface-2"
                      )}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}
