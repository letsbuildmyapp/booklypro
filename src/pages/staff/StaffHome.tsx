import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useStaffBookings, useServices, useLocations } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { completeBooking } from '@/lib/booking';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ConfirmModal';
import { Check, MapPin, Clock } from 'lucide-react';
import { formatDuration, formatCurrency } from '@/lib/utils';
import type { Booking } from '@/lib/types';

export function StaffHome() {
  const { profile } = useAuth();
  const { data: bookings, isLoading } = useStaffBookings(profile?.staffId);
  const { data: services } = useServices();
  const { data: locations } = useLocations();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const groups = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayMs = today.getTime();
    const tomorrowMs = todayMs + 86_400_000;
    const weekEndMs = todayMs + 86_400_000 * 7;
    const list = (bookings ?? []).filter((b) => b.status !== 'canceled');
    return {
      today: list.filter((b) => b.startAt >= todayMs && b.startAt < tomorrowMs),
      week:  list.filter((b) => b.startAt >= tomorrowMs && b.startAt < weekEndMs),
    };
  }, [bookings]);

  const svcOf = (id: string) => services?.find((s) => s.id === id);
  const locOf = (id: string) => locations?.find((l) => l.id === id);

  async function markComplete(b: Booking) {
    const ok = await confirm({
      title: 'Mark as completed?',
      message: `Wrap up ${svcOf(b.serviceId)?.name ?? 'this appointment'} with ${b.customerName}.`,
      confirmLabel: 'Mark complete',
    });
    if (!ok) return;
    try {
      await completeBooking(b.id);
      toast.success('Marked complete.');
      qc.invalidateQueries({ queryKey: ['bookings'] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <p className="eyebrow mb-2">Today</p>
      <h1 className="font-display text-4xl sm:text-5xl mb-2">
        Hi, {profile?.name.split(' ')[0]}.
      </h1>
      <p className="text-base text-ink-600 dark:text-ink-200 mb-10">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {isLoading ? (
        <div className="text-ink-500 dark:text-ink-300 text-base">Loading your schedule…</div>
      ) : (
        <>
          <Section title="Today" empty="No appointments today. Take a breath.">
            {groups.today.map((b) => (
              <StaffCard key={b.id} b={b} svc={svcOf(b.serviceId)} loc={locOf(b.locationId)} onComplete={() => markComplete(b)} canComplete />
            ))}
          </Section>

          <Section title="The rest of the week" empty="A clear week ahead.">
            {groups.week.map((b) => (
              <StaffCard key={b.id} b={b} svc={svcOf(b.serviceId)} loc={locOf(b.locationId)} />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children, empty }: { title: string; children: React.ReactNode; empty: string }) {
  const arr = Array.isArray(children) ? children : [children];
  const isEmpty = arr.flat().filter(Boolean).length === 0;
  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl mb-5">{title}</h2>
      {isEmpty ? (
        <div className="card p-8 text-center text-ink-500 dark:text-ink-300">{empty}</div>
      ) : (
        <div className="grid gap-3">{children}</div>
      )}
    </section>
  );
}

function StaffCard({ b, svc, loc, onComplete, canComplete }: {
  b: Booking;
  svc: ReturnType<typeof Object> | undefined;
  loc: ReturnType<typeof Object> | undefined;
  onComplete?: () => void;
  canComplete?: boolean;
}) {
  const start = new Date(b.startAt);
  return (
    <div className="card p-5 sm:p-6 flex items-center gap-5">
      <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-sage-50 dark:bg-sage-800/30 text-sage-700 dark:text-sage-200 border border-sage-100 dark:border-sage-700/40 shrink-0">
        <span className="text-xs uppercase tracking-wider font-medium">{start.toLocaleString('en-US', { weekday: 'short' })}</span>
        <span className="font-display text-xl num leading-none mt-0.5">{start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-xl">{(svc as { name?: string })?.name ?? '—'}</p>
        <p className="text-sm text-ink-600 dark:text-ink-200 mt-1">
          {b.customerName} · <a href={`mailto:${b.customerEmail}`} className="hover:underline">{b.customerEmail}</a>
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500 dark:text-ink-300">
          <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {formatDuration((svc as { durationMin?: number })?.durationMin ?? 0)}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {(loc as { name?: string })?.name ?? '—'}</span>
          <span className="num">{formatCurrency(b.priceCents)}</span>
        </div>
        <StatusPill status={b.status} />
      </div>
      {canComplete && b.status === 'confirmed' && onComplete ? (
        <button onClick={onComplete} className="btn-primary text-sm shrink-0 hidden sm:inline-flex">
          <Check size={14} /> Complete
        </button>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: Booking['status'] }) {
  const map: Record<Booking['status'], { label: string; cls: string }> = {
    confirmed: { label: 'Confirmed', cls: 'bg-sage-100 text-sage-800 dark:bg-sage-800/40 dark:text-sage-200' },
    completed: { label: 'Completed', cls: 'bg-ink-100 text-ink-700 dark:bg-ink-700/40 dark:text-ink-200' },
    canceled:  { label: 'Canceled',  cls: 'bg-blush-100 text-blush-800 dark:bg-blush-800/30 dark:text-blush-200' },
    no_show:   { label: 'No-show',   cls: 'bg-blush-100 text-blush-800 dark:bg-blush-800/30 dark:text-blush-200' },
  };
  const m = map[status];
  return <span className={`pill mt-2 ${m.cls}`}>{m.label}</span>;
}
