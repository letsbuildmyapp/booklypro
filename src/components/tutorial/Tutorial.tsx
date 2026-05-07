import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { TUTORIAL_STEPS, type TutorialStep } from "./steps";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const KEY_PREFIX = "booklypro:tutorial_seen:";

function pickRole(roles: Role[]): Role {
  if (roles.includes("superadmin")) return "superadmin";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("staff")) return "staff";
  return "customer";
}

export function Tutorial() {
  const { user } = useAuth();
  const role = user ? pickRole(user.roles) : null;
  const storageKey = role ? `${KEY_PREFIX}${role}` : null;

  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps = role ? TUTORIAL_STEPS[role] : [];
  const step = steps[stepIdx];

  // First-run trigger: open if user logs in and key absent
  useEffect(() => {
    if (!storageKey) return;
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      // small delay so target elements have mounted
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  // Compute target rect
  useEffect(() => {
    if (!open || !step?.target) { setRect(null); return; }
    function measure() {
      const el = document.querySelector(`[data-tour="${step!.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    }
    measure();
    const obs = new ResizeObserver(measure);
    document.body.querySelectorAll(`[data-tour="${step.target}"]`).forEach((el) => obs.observe(el as Element));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stepIdx]);

  function dismiss() {
    if (storageKey) localStorage.setItem(storageKey, "1");
    setOpen(false);
  }
  function next() {
    if (stepIdx < steps.length - 1) setStepIdx(stepIdx + 1);
    else dismiss();
  }
  function prev() { if (stepIdx > 0) setStepIdx(stepIdx - 1); }

  if (!open || !role || !step) return null;

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  const useSpotlight = isDesktop && !!step.target && rect;

  const node = (
    <AnimatePresence>
      <motion.div
        key="tutorial-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      >
        {useSpotlight ? (
          <SpotlightTour rect={rect!} step={step} stepIdx={stepIdx} total={steps.length} onNext={next} onPrev={prev} onClose={dismiss} />
        ) : (
          <CenteredTour step={step} stepIdx={stepIdx} total={steps.length} onNext={next} onPrev={prev} onClose={dismiss} />
        )}
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(node, document.body);
}

function CenteredTour({ step, stepIdx, total, onNext, onPrev, onClose }: { step: TutorialStep; stepIdx: number; total: number; onNext: () => void; onPrev: () => void; onClose: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-foreground/72 backdrop-blur-sm p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
        className="bg-card rounded-3xl shadow-pillow max-w-md w-full p-7 border border-border"
      >
        <TourBody step={step} stepIdx={stepIdx} total={total} />
        <TourNav stepIdx={stepIdx} total={total} onNext={onNext} onPrev={onPrev} onClose={onClose} />
      </motion.div>
    </div>
  );
}

function SpotlightTour({ rect, step, stepIdx, total, onNext, onPrev, onClose }: { rect: DOMRect; step: TutorialStep; stepIdx: number; total: number; onNext: () => void; onPrev: () => void; onClose: () => void }) {
  const padding = 8;
  const cutout = useMemo(() => ({
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }), [rect]);

  // Compute tooltip position
  const placement = step.placement ?? "right";
  const tooltipWidth = 360;
  const offset = 20;
  let style: React.CSSProperties = {};
  switch (placement) {
    case "right":
      style = { top: cutout.top, left: cutout.left + cutout.width + offset, maxWidth: tooltipWidth };
      break;
    case "left":
      style = { top: cutout.top, right: window.innerWidth - cutout.left + offset, maxWidth: tooltipWidth };
      break;
    case "bottom":
      style = { top: cutout.top + cutout.height + offset, left: cutout.left, maxWidth: tooltipWidth };
      break;
    case "top":
      style = { bottom: window.innerHeight - cutout.top + offset, left: cutout.left, maxWidth: tooltipWidth };
      break;
  }

  // Clamp to viewport
  const clampedStyle = { ...style };
  if (typeof clampedStyle.left === "number") clampedStyle.left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, clampedStyle.left as number));
  if (typeof clampedStyle.top === "number") clampedStyle.top = Math.max(16, Math.min(window.innerHeight - 240, clampedStyle.top as number));

  return (
    <>
      {/* Spotlight cutout */}
      <motion.div
        layoutId="tour-cutout"
        initial={false}
        animate={cutout}
        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
        className="absolute rounded-3xl pointer-events-none ring-spotlight"
      />
      {/* Tooltip card */}
      <motion.div
        key={stepIdx}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.55 }}
        style={clampedStyle}
        className="absolute bg-card rounded-3xl shadow-pillow p-6 border border-border w-[360px]"
      >
        <TourBody step={step} stepIdx={stepIdx} total={total} />
        <TourNav stepIdx={stepIdx} total={total} onNext={onNext} onPrev={onPrev} onClose={onClose} />
      </motion.div>
    </>
  );
}

function TourBody({ step, stepIdx, total }: { step: TutorialStep; stepIdx: number; total: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="eyebrow text-muted-foreground">Tour · {stepIdx + 1} of {total}</span>
        <div className="h-10 w-10 rounded-2xl bg-primary/15 grid place-items-center text-primary">{step.icon}</div>
      </div>
      <h2 className="text-title3 font-semibold tracking-tight">{step.title}</h2>
      <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.body}</div>
    </div>
  );
}

function TourNav({ stepIdx, total, onNext, onPrev, onClose }: { stepIdx: number; total: number; onNext: () => void; onPrev: () => void; onClose: () => void }) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-center gap-1.5 mb-5">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => {/* optionally jump - unhandled in stateless wrapper */}}
            aria-label={`Step ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === stepIdx ? "w-6 bg-primary" : "w-1.5 bg-border"
            )}
          />
        ))}
      </div>
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}><X className="h-3.5 w-3.5" /> Skip tour</Button>
        <div className="flex gap-2">
          {stepIdx > 0 && <Button variant="outline" size="sm" onClick={onPrev}><ChevronLeft className="h-3.5 w-3.5" /></Button>}
          <Button size="sm" onClick={onNext}>
            {stepIdx === total - 1 ? "Done" : "Next"}
            {stepIdx !== total - 1 && <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
