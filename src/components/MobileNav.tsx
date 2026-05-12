import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Hamburger button label */
  label?: string;
  /** Drawer content — rendered inside the drawer panel */
  children: (ctx: { close: () => void }) => React.ReactNode;
  /** Hide the trigger above this breakpoint (default lg = 1024px) */
  hideAt?: "md" | "lg";
}

export function MobileNav({ label = "Open menu", children, hideAt = "lg" }: Props) {
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const triggerHideClass = hideAt === "md" ? "md:hidden" : "lg:hidden";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className={cn(
          // negative left margin pulls the icon flush with the page content's left edge
          "touch-target inline-flex h-10 w-10 -ml-2.5 items-center justify-center rounded-2xl text-foreground hover:bg-secondary transition-colors",
          triggerHideClass,
        )}
      >
        <Menu className="h-5 w-5" />
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[120] bg-foreground/45 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
            >
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", bounce: 0.05, duration: 0.42 }}
                className="absolute top-0 left-0 h-full w-[86%] max-w-[340px] bg-card border-r border-border shadow-pillow overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-label={label}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-card/95 backdrop-blur border-b border-border">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Menu</span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="touch-target inline-flex h-9 w-9 items-center justify-center rounded-2xl hover:bg-secondary text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4">
                  {children({ close: () => setOpen(false) })}
                </div>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
