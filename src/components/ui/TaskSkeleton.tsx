import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TaskSkeletonProps {
  count?: number;
}

export function TaskSkeleton({ count = 4 }: TaskSkeletonProps) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading tasks">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.04 }}
          className={cn(
            "flex items-start gap-3 px-3 py-2.5 rounded-lg",
            "bg-surface border border-border"
          )}
        >
          {/* Checkbox placeholder */}
          <div className="skeleton w-4 h-4 rounded-full mt-0.5 flex-shrink-0" />
          
          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Title */}
            <div className="skeleton h-4 rounded" style={{ width: `${55 + Math.random() * 30}%` }} />
            {/* Meta */}
            {i % 3 !== 0 && (
              <div className="skeleton h-3 rounded" style={{ width: `${20 + Math.random() * 20}%` }} />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
