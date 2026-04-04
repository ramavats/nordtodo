import { motion, AnimatePresence } from "framer-motion";
import { useUndoStore } from "@/store/undoStore";
import { cn } from "@/lib/utils";

export function UndoToast() {
  const { stack, remove } = useUndoStore();
  const latest = stack[0];

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-toast pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {latest && (
          <motion.div
            key={latest.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className={cn(
              "flex items-center gap-3 pointer-events-auto",
              "bg-surface-2 border border-border rounded-lg px-4 py-2.5",
              "shadow-lg text-sm"
            )}
          >
            <span className="text-text-secondary">{latest.label}</span>
            <button
              onClick={async () => {
                remove(latest.id);
                await latest.undo();
              }}
              className="text-accent font-medium hover:text-accent-hover transition-colors"
            >
              Undo
            </button>
            <button
              onClick={() => remove(latest.id)}
              className="text-text-faint hover:text-text transition-colors text-xs"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
