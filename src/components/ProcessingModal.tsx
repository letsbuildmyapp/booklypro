import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Check, CreditCard, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  title?: string;
  subtitle?: string;
  /** Holds the modal in its 'succeeded' state for this many ms before onSettled fires. */
  successHoldMs?: number;
  onSettled?: () => void;
}

/**
 * A two-phase processing overlay: spinner → check. Used for the brief
 * payment/billing animations during the demo's checkout flows.
 *
 * The component renders for `processingMs` (default 1200ms), shows the
 * success check for `successHoldMs` (default 480ms), then calls onSettled.
 */
export function ProcessingModal({
  open,
  title = "Processing payment",
  subtitle = "Securely confirming with your card issuer",
  successHoldMs = 480,
  onSettled,
}: Props) {
  const [phase, setPhase] = useState<"processing" | "success">("processing");

  useEffect(() => {
    if (!open) {
      setPhase("processing");
      return;
    }
    const processingMs = 1200;
    const t1 = setTimeout(() => setPhase("success"), processingMs);
    const t2 = setTimeout(() => {
      onSettled?.();
    }, processingMs + successHoldMs);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [open, onSettled, successHoldMs]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[150] grid place-items-center bg-foreground/40 backdrop-blur-sm p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ type: "spring", bounce: 0.22, duration: 0.45 }}
            className="bg-card rounded-3xl shadow-pillow border border-border w-full max-w-sm p-8 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="mx-auto mb-5 h-16 w-16 rounded-full grid place-items-center bg-primary/12">
              <AnimatePresence mode="wait">
                {phase === "processing" ? (
                  <motion.div
                    key="spin"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="check"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: "spring", bounce: 0.45, duration: 0.5 }}
                  >
                    <Check className="h-7 w-7 text-primary" strokeWidth={2.5} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence mode="wait">
              {phase === "processing" ? (
                <motion.div
                  key="t-processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h3 className="text-title3 font-semibold tracking-tight">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
                  <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider">
                    <CreditCard className="h-3 w-3" /> Secure payment
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="t-success"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <h3 className="text-title3 font-semibold tracking-tight">All set</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">Payment confirmed.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
