import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useCustomerBookings, useServices, useStaff, useLocations } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/components/ConfirmModal';
import { cancelBooking, sendBookingEmail } from '@/lib/booking';
import { toast } from 'sonner';
import { Calendar, MapPin, Sparkles, X } from 'lucide-react';
import { formatCurrency, formatDuration } from '@/lib/utils';
import type { Booking } from '@/lib/types';

export function CustomerHome() {
  const { profile } = useAuth();
  const { data: bookings, isLoading } = useCustomerBookings(profile?.uid);
  const { data: services } = useServices();
  const { data: staffList } = useStaff();
  const { data: locations } = useLocations();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const now = Date.now();
  const upcoming = (bookings ?? []).filter((b) => b.status === 'confirmed' && b.endAt > now);
  const past = (bookings ?? []).filter((b) => b.status !== 'confirmed' || b.endAt <= now);

  function svcName(id: string) { return services?.find((s) => s.id === id); }
  function staffName(id: string) { return staffList?.find((s) => s.id === id); }
  function locName(id: string) { return locations?.find((l) => l.id === id); }

  async function handleCancel(b: Booking) {
    const ok = await confirm({
      title: 'Cancel this booking?',
      message: `${svcName(b.serviceId)?.name ?? 'Appointment'} with ${staffName(b.staffId)?.name ?? 'your stylist'} on ${new Date(b.startAt).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`,
      confirmLabel: 'Yes, cancel',
      cancelLabel: 'Keep it',
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancelBooking(b.id);
      const svc = svcName(b.serviceId);
      const staff = staffName(b.staffId);
      const loc = locName(b.locationId);
      await sendBookingEmail({
        bookingId: b.id,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        serviceName: svc?.name ?? '',
        staffName: staff?.name ?? '',
        locationName: loc?.name ?? '',
        locationAddress: loc?.address ?? '',
        startAt: b.startAt,
        durationMin: svc?.durationMin ?? 0,
        priceCents: b.priceCents,
        type: 'cancellation',
      });
      toast.success('Booking canceled. Email on its way.');
      qc.invalidateQueries({ queryKey: ['bookings'] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <p className="eyebrow mb-2">Welcome back</p>
          <h1 className="font-display text-4xl sm:text-5xl">Hello, {profile?.name.split(' ')[0]}.</h1>
        </div>
        <Link to="/app/book" className="btn-primary">
          <Sparkles size={16} /> Book a service
        </Link>
      </div>

      {isLoading ? (
        <div className="text-ink-500 dark:text-ink-300 text-base">Loading your bookings…</div>
      ) : (
        <>
          <Section title="Upcoming" empty="No upcoming bookings yet.">
            {upcoming.map((b) => (
              <BookingCard
                key={b.id}
                b={b}
                serviceName={svcName(b.serviceId)?.name ?? '—'}
                durationMin={svcName(b.serviceId)?.durationMin ?? 0}
                staffName={staffName(b.staffId)?.name ?? '—'}
                locationName={locName(b.locationId)?.name ?? '—'}
                onCancel={() => handleCancel(b)}
              />
            ))}
          </Section>

          <Section title="Past" empty="Past bookings will appear here.">
            {past.map((b) => (
              <BookingCard
                key={b.id}
                b={b}
                serviceName={svcName(b.serviceId)?.name ?? '—'}
                durationMin={svcName(b.serviceId)?.durationMin ?? 0}
                staffName={staffName(b.staffId)?.name ?? '—'}
                locationName={locName(b.locationId)?.name ?? '—'}
                past
              />
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
        <div className="grid gap-4">{children}</div>
      )}
    </section>
  );
}

function BookingCard({
  b, serviceName, durationMin, staffName, locationName, onCancel, past,
}: {
  b: Booking;
  serviceName: string;
  durationMin: number;
  staffName: string;
  locationName: string;
  onCancel?: () => void;
  past?: boolean;
}) {
  const start = new Date(b.startAt);
  const dateLabel = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeLabel = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return (
    <div className="card p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:items-center sm:justify-between">
      <div className="flex gap-5 flex-1">
        <div className="hidden sm:flex flex-col items-center justify-center min-w-16 h-16 rounded-2xl bg-sage-50 dark:bg-sage-800/30 text-sage-700 dark:text-sage-200 border border-sage-100 dark:border-sage-700/40">
          <span className="text-xs font-medium uppercase tracking-wider num">{start.toLocaleString('en-US', { month: 'short' })}</span>
          <span className="font-display text-xl leading-none num">{start.getDate()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-xl">{serviceName}</p>
          <p className="text-sm text-ink-600 dark:text-ink-200 mt-1">with {staffName} · {formatDuration(durationMin)} · {formatCurrency(b.priceCents)}</p>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500 dark:text-ink-300">
            <span className="inline-flex items-center gap-1.5"><Calendar size={13} /> {dateLabel} · <span className="num">{timeLabel}</span></span>
            <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {locationName}</span>
          </div>
          <StatusPill status={b.status} />
        </div>
      </div>
      {onCancel && !past ? (
        <button onClick={onCancel} className="btn-secondary text-sm sm:self-auto self-end">
          <X size={14} /> Cancel
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
