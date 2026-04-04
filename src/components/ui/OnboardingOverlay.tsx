import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Command, Keyboard, Inbox } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useUpdatePreferences } from "@/hooks/usePreferences";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Inbox,
    title: "Welcome to Nord Todo",
    description:
      "A minimal, keyboard-friendly task manager. Everything is stored locally on your device.",
  },
  {
    icon: Keyboard,
    title: "Keyboard-first",
    description:
      "Press Ctrl+N to add a task, Ctrl+K for the command palette, and arrow keys to navigate.",
  },
  {
    icon: Command,
    title: "Command palette",
    description:
      "Hit Ctrl+K to access all commands — navigate views, create tasks, open settings.",
  },
  {
    icon: CheckCircle2,
    title: "You're ready",
    description:
      "Start by adding your first task. Click the + area at the top of the task list or press Ctrl+N.",
  },
];

export function OnboardingOverlay() {
  const [step, setStep] = useState(0);
  const { setShowOnboarding } = useAppStore();
  const updatePrefs = useUpdatePreferences();

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (isLast) {
      updatePrefs.mutate({ firstRunComplete: true });
      setShowOnboarding(false);
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-modal flex items-center justify-center bg-background/70 palette-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="bg-surface border border-border rounded-xl w-full max-w-sm mx-4 overflow-hidden"
        data-testid="onboarding"
      >
        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center pt-5 pb-2">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-5 bg-accent" : "w-1.5 bg-surface-3"
              )}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="px-8 py-6 text-center"
          >
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/15 flex items-center justify-center">
                <Icon size={22} className="text-accent" />
              </div>
            </div>
            <h2 className="text-base font-semibold text-text mb-2">{current.title}</h2>
            <p className="text-sm text-text-muted leading-relaxed">{current.description}</p>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2 px-6 pb-6">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-2 text-sm rounded-lg bg-surface-2 text-text-muted hover:bg-surface-3 transition-colors border border-border"
            >
              Back
            </button>
          )}
          <motion.button
            onClick={handleNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-2 text-sm rounded-lg bg-accent text-background font-medium hover:bg-accent-hover transition-colors"
            data-testid="onboarding-next"
          >
            {isLast ? "Get started" : "Next"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
