import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.1 }}
      className="flex flex-col items-center justify-center py-20 px-8 text-center"
      role="status"
      data-testid="empty-state"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
        className="mb-4 text-nord-nord3"
      >
        {icon ?? <CheckCircle2 size={36} strokeWidth={1.5} />}
      </motion.div>
      <p className="text-sm font-medium text-text-muted mb-1">{title}</p>
      <p className="text-xs text-text-faint max-w-xs">{description}</p>
    </motion.div>
  );
}
