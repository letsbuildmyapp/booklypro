import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { resetStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ResetDemo({ className }: { className?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  function doReset() {
    setResetting(true);
    resetStore();
    // Reload to re-mount root and replay the tour from a clean slate
    setTimeout(() => {
      window.location.href = "/";
    }, 280);
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 print:hidden",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!confirming ? (
          <motion.button
            key="pill"
            type="button"
            onClick={() => setConfirming(true)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-card/90 backdrop-blur-sm border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 shadow-soft transition-colors"
            aria-label="Reset demo"
          >
            <RotateCcw className="h-3 w-3" />
            Reset demo
          </motion.button>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl bg-card border border-border shadow-pillow p-3.5 w-[280px]"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-semibold">Reset the demo?</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Clears everything in this browser and reloads the home page.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={resetting}
                className="flex-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doReset}
                disabled={resetting}
                className="flex-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {resetting ? "Resetting…" : "Reset"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
