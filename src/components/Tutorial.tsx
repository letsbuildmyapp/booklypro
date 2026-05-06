import { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, X, Sparkles, Calendar, Users, Layers, BookOpen, Coffee, ClipboardList, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';

const TUTORIAL_KEY_PREFIX = 'booklypro:tutorial_seen:';
const MOBILE_BREAKPOINT = 768;

interface Step {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: React.ReactNode;
  target?: string;
  placement?: 'right' | 'left' | 'top' | 'bottom';
}

const CUSTOMER_STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Welcome to BooklyPro',
    body: "A calm place to book your next salon visit. Take 30 seconds to see how it works.",
  },
  {
    icon: Calendar,
    title: 'Your bookings, all in one place',
    body: 'Upcoming and past appointments live here. Tap any to reschedule or cancel.',
    target: 'nav-bookings',
    placement: 'bottom',
  },
  {
    icon: BookOpen,
    title: 'Book a service',
    body: "Pick a service, choose a stylist (or 'any'), and grab a time slot. Confirmation lands in your inbox.",
    target: 'nav-book',
    placement: 'bottom',
  },
  {
    icon: Sparkles,
    title: "You're set",
    body: 'Reschedule freely up to a day before. We send a friendly reminder the night before your appointment.',
  },
];

const STAFF_STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Welcome to your day view',
    body: "Everything you need to run your chair, nothing you don't.",
  },
  {
    icon: Calendar,
    title: 'Today, at a glance',
    body: 'Your appointments line up by time. Mark each one complete when you wrap up.',
    target: 'nav-day',
    placement: 'bottom',
  },
  {
    icon: ClipboardList,
    title: 'Week ahead',
    body: 'Scroll past today to see the rest of your week — clients, services, and any notes they left at booking.',
  },
  {
    icon: Coffee,
    title: 'Have a great shift',
    body: 'Clients know what they booked, when, and where. You just show up and do what you do best.',
  },
];

const ADMIN_STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Welcome, manager',
    body: 'BooklyPro keeps your studio running calmly. Quick tour of the four key areas.',
  },
  {
    icon: Calendar,
    title: 'Calendar',
    body: 'Today and the week ahead, across every chair and location. Status colors at a glance.',
    target: 'nav-cal',
    placement: 'bottom',
  },
  {
    icon: Layers,
    title: 'All-staff view',
    body: 'See every stylist side-by-side for the day. Useful for spotting gaps and balancing load.',
    target: 'nav-all',
    placement: 'bottom',
  },
  {
    icon: Settings,
    title: 'Services & pricing',
    body: 'Add, rename, or reprice the menu. Changes apply to new bookings only — past prices stay locked.',
    target: 'nav-services',
    placement: 'bottom',
  },
  {
    icon: Users,
    title: 'Staff & availability',
    body: 'Manage who works where, the hours they take, and which services each one offers.',
    target: 'nav-staff',
    placement: 'bottom',
  },
  {
    icon: Sparkles,
    title: "You're ready",
    body: 'Sign in as a customer or staff member from the demo tiles to see the other side.',
  },
];

const STEPS_BY_ROLE: Record<Role, Step[]> = {
  customer: CUSTOMER_STEPS,
  staff: STAFF_STEPS,
  admin: ADMIN_STEPS,
};

interface Rect { top: number; left: number; width: number; height: number }

export function Tutorial() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth < MOBILE_BREAKPOINT,
  );

  const role = profile?.role;
  const STEPS = useMemo<Step[]>(() => (role ? STEPS_BY_ROLE[role] : []), [role]);

  useEffect(() => { setStep(0); }, [STEPS]);

  useEffect(() => {
    if (!role) { setOpen(false); return; }
    const seen = localStorage.getItem(TUTORIAL_KEY_PREFIX + role);
    setOpen(!seen);
    setStep(0);
  }, [role]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const close = useCallback(() => {
    if (role) localStorage.setItem(TUTORIAL_KEY_PREFIX + role, '1');
    setOpen(false);
  }, [role]);

  const next = useCallback(() => {
    setStep((s) => {
      if (s < STEPS.length - 1) return s + 1;
      close();
      return s;
    });
  }, [close, STEPS.length]);

  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close, next, back]);

  const currentStep = STEPS[step];
  const targetSel = currentStep?.target;

  useLayoutEffect(() => {
    if (!open || isMobile || !targetSel) { setRect(null); return; }
    const compute = () => {
      const el = document.querySelector(`[data-tour="${targetSel}"]`) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    compute();
    const onResize = () => compute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, isMobile, targetSel, step]);

  if (!open || !currentStep) return null;

  const hasTarget = !!rect && !!targetSel;
  if (isMobile || !hasTarget) {
    return <CenteredModal steps={STEPS} step={step} onClose={close} onNext={next} onBack={back} onJump={setStep} />;
  }

  // Desktop spotlight
  const Icon = currentStep.icon;
  const isLast = step === STEPS.length - 1;

  const PAD = 16;
  const TOOLTIP_W = 360;
  const TOOLTIP_H_EST = 280;
  let top = 0;
  let left = 0;
  if (rect) {
    const placement = currentStep.placement ?? 'bottom';
    if (placement === 'right') {
      left = rect.left + rect.width + PAD;
      top = rect.top;
      if (left + TOOLTIP_W > window.innerWidth - PAD) {
        left = rect.left;
        top = rect.top + rect.height + PAD;
      }
    } else if (placement === 'left') {
      left = rect.left - TOOLTIP_W - PAD;
      top = rect.top;
    } else if (placement === 'bottom') {
      left = rect.left;
      top = rect.top + rect.height + PAD;
    } else if (placement === 'top') {
      left = rect.left;
      top = rect.top - TOOLTIP_H_EST - PAD;
    }
    left = Math.min(Math.max(PAD, left), window.innerWidth - TOOLTIP_W - PAD);
    top = Math.min(Math.max(PAD, top), window.innerHeight - TOOLTIP_H_EST - PAD);
  }
  const tipStyle: React.CSSProperties = { top, left };

  return (
    <AnimatePresence>
      <motion.div
        key="spot-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        onClick={close}
      >
        {hasTarget && rect ? (
          <motion.div
            initial={false}
            animate={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
            }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="absolute rounded-2xl pointer-events-none"
            style={{ boxShadow: '0 0 0 9999px rgba(26,24,20,0.66), 0 0 0 2px rgb(214 96 79)' }}
          />
        ) : (
          <div className="absolute inset-0 bg-ink-900/66" />
        )}
      </motion.div>

      <motion.div
        key={`tip-${step}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18 }}
        role="dialog"
        aria-modal="true"
        className="fixed z-[101] w-[360px] rounded-3xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 shadow-lift overflow-hidden"
        style={tipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-12 border-b border-ink-100 dark:border-ink-700">
          <span className="eyebrow">Tour · <span className="num">{step + 1}</span> of <span className="num">{STEPS.length}</span></span>
          <button onClick={close} className="text-ink-500 hover:text-ink-900 dark:hover:text-ink-50 p-1.5 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700" aria-label="Close tour">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          <div className="h-11 w-11 rounded-2xl bg-sage-100 dark:bg-sage-800/40 grid place-items-center mb-4 text-sage-700 dark:text-sage-300">
            <Icon size={20} />
          </div>
          <h2 className="font-display text-xl text-ink-900 dark:text-ink-50">{currentStep.title}</h2>
          <div className="text-base text-ink-700 dark:text-ink-200 mt-2 leading-relaxed">{currentStep.body}</div>
        </div>
        <div className="flex items-center justify-between px-5 h-14 border-t border-ink-100 dark:border-ink-700 bg-cream/40 dark:bg-ink-900/40">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={i === step
                  ? 'h-1.5 w-6 rounded-full bg-sage-600 transition-all'
                  : 'h-1.5 w-1.5 rounded-full bg-ink-200 dark:bg-ink-600 hover:bg-ink-400 transition-all'}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button onClick={back} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm text-ink-600 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-700">
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <button onClick={close} className="inline-flex items-center h-9 px-3 rounded-xl text-sm text-ink-500 hover:text-ink-900 dark:hover:text-ink-50">Skip</button>
            )}
            <button onClick={next} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-medium bg-sage-600 hover:bg-sage-700 text-white transition-colors">
              {isLast ? 'Done' : 'Next'} {!isLast ? <ArrowRight size={14} /> : null}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function CenteredModal({
  steps, step, onClose, onNext, onBack, onJump,
}: {
  steps: Step[];
  step: number;
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
  onJump: (i: number) => void;
}) {
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] grid place-items-center px-4 py-8 bg-ink-900/66 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          key={`step-${step}`}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-md rounded-3xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 shadow-lift overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 h-12 border-b border-ink-100 dark:border-ink-700">
            <span className="eyebrow">Tour · <span className="num">{step + 1}</span> of <span className="num">{steps.length}</span></span>
            <button onClick={onClose} className="text-ink-500 hover:text-ink-900 dark:hover:text-ink-50 p-1.5 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700" aria-label="Close tour">
              <X size={16} />
            </button>
          </div>
          <div className="p-6 sm:p-8">
            <div className="h-12 w-12 rounded-2xl bg-sage-100 dark:bg-sage-800/40 grid place-items-center mb-5 text-sage-700 dark:text-sage-300">
              <Icon size={22} />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-ink-900 dark:text-ink-50">{current.title}</h2>
            <div className="text-base text-ink-700 dark:text-ink-200 mt-3 leading-relaxed">{current.body}</div>
          </div>
          <div className="flex items-center justify-between px-5 h-14 border-t border-ink-100 dark:border-ink-700 bg-cream/40 dark:bg-ink-900/40">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onJump(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={i === step
                    ? 'h-1.5 w-6 rounded-full bg-sage-600 transition-all'
                    : 'h-1.5 w-1.5 rounded-full bg-ink-200 dark:bg-ink-600 hover:bg-ink-400 transition-all'}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 ? (
                <button onClick={onBack} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm text-ink-600 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-ink-700">
                  <ArrowLeft size={14} /> Back
                </button>
              ) : (
                <button onClick={onClose} className="inline-flex items-center h-9 px-3 rounded-xl text-sm text-ink-500 hover:text-ink-900 dark:hover:text-ink-50">Skip</button>
              )}
              <button onClick={onNext} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-medium bg-sage-600 hover:bg-sage-700 text-white transition-colors">
                {isLast ? 'Done' : 'Next'} {!isLast ? <ArrowRight size={14} /> : null}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
