import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type Resolver = (ok: boolean) => void;

const Ctx = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmModalProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<Resolver | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOpts(o);
      setResolver(() => resolve);
    });
  }, []);

  const close = (ok: boolean) => {
    resolver?.(ok);
    setOpts(null);
    setResolver(null);
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {opts ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] grid place-items-center px-4 py-8 bg-ink-900/60 backdrop-blur-sm"
            onClick={() => close(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close(false);
              if (e.key === 'Enter') close(true);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              className="card w-full max-w-md p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-2xl mb-3 text-ink-900 dark:text-ink-50">{opts.title}</h2>
              <p className="text-base text-ink-700 dark:text-ink-200 mb-6 leading-relaxed">{opts.message}</p>
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                <button onClick={() => close(false)} className="btn-secondary">
                  {opts.cancelLabel ?? 'Cancel'}
                </button>
                <button
                  onClick={() => close(true)}
                  className={opts.destructive ? 'btn-accent' : 'btn-primary'}
                  autoFocus
                >
                  {opts.confirmLabel ?? 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useConfirm outside ConfirmModalProvider');
  return v;
}
