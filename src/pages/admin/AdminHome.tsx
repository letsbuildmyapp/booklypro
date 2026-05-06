import { useMemo, useState } from 'react';
import { useAllBookings, useServices, useStaff, useLocations } from '@/lib/queries';
import { startOfDayMs } from '@/lib/booking';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, MapPin, Users } from 'lucide-react';
import { formatCurrency, formatDuration } from '@/lib/utils';
import type { Booking } from '@/lib/types';

export function AdminHome() {
  const { data: bookings, isLoading } = useAllBookings();
  const { data: services } = useServices();
  const { data: staffList } = useStaff();
  const { data: locations } = useLocations();

  const [day, setDay] = useState(() => startOfDayMs(Date.now()));
  const next = startOfDayMs(day) + 86_400_000;
  const prevDay = () => setDay(day - 86_400_000);
  const nextDay = () => setDay(day + 86_400_000);
  const today = startOfDayMs(Date.now());

  const todays = useMemo(() => {
    return (bookings ?? []).filter((b) => b.startAt >= day && b.startAt < next).sort((a, b) => a.startAt - b.startAt);
  }, [bookings, day, next]);

  const stats = useMemo(() => {
    const list = todays;
    return {
      total: list.length,
      revenue: list.filter((b) => b.status !== 'canceled').reduce((sum, b) => sum + b.priceCents, 0),
      confirmed: list.filter((b) => b.status === 'confirmed').length,
      completed: list.filter((b) => b.status === 'completed').length,
    };
  }, [todays]);

  const svcOf = (id: string) => services?.find((s) => s.id === id);
  const staffOf = (id: string) => staffList?.find((s) => s.id === id);
  const locOf = (id: string) => locations?.find((l) => l.id === id);

  const dayLabel = new Date(day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="eyebrow mb-2">Studio dashboard</p>
          <h1 className="font-display text-4xl sm:text-5xl">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevDay} className="btn-secondary !px-4" aria-label="Previous day"><ChevronLeft size={16} /></button>
          <button onClick={() => setDay(today)} className="btn-secondary text-sm">Today</button>
          <button onClick={nextDay} className="btn-secondary !px-4" aria-label="Next day"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <Stat label="Bookings" value={String(stats.total)} />
        <Stat label="Confirmed" value={String(stats.confirmed)} />
        <Stat label="Completed" value={String(stats.completed)} />
        <Stat label="Revenue" value={formatCurrency(stats.revenue)} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-5 border-b border-ink-100 dark:border-ink-700 flex items-center gap-3">
          <CalIcon size={18} className="text-sage-600" />
          <p className="font-display text-xl">{dayLabel}</p>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-ink-500 dark:text-ink-300">Loading…</div>
        ) : todays.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display text-2xl text-ink-400 dark:text-ink-500">A clear day.</p>
            <p className="text-sm text-ink-500 dark:text-ink-300 mt-2">Nothing scheduled.</p>
          </div>
        ) : (
          <div>
            {todays.map((b, i) => {
              const svc = svcOf(b.serviceId);
              const staff = staffOf(b.staffId);
              const loc = locOf(b.locationId);
              return (
                <div key={b.id} className={`flex items-center gap-5 px-6 py-5 ${i > 0 ? 'border-t border-ink-100 dark:border-ink-700' : ''}`}>
                  <div className="font-display text-xl num min-w-20 tabular-nums">
                    {new Date(b.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg truncate">{svc?.name ?? '—'}</p>
                    <p className="text-sm text-ink-600 dark:text-ink-200 truncate">
                      {b.customerName} · with {staff?.name ?? '—'}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-500 dark:text-ink-300">
                      <span className="inline-flex items-center gap-1"><MapPin size={11} /> {loc?.name}</span>
                      <span>{formatDuration(svc?.durationMin ?? 0)}</span>
                      <span className="num">{formatCurrency(b.priceCents)}</span>
                    </div>
                  </div>
                  <StatusPill status={b.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Users size={18} className="text-sage-600" />
            <p className="font-display text-xl">Staff today</p>
          </div>
          <ul className="grid gap-2.5">
            {(staffList ?? []).map((s) => {
              const count = todays.filter((b) => b.staffId === s.id).length;
              return (
                <li key={s.id} className="flex items-center justify-between text-base">
                  <span>{s.name}</span>
                  <span className="text-sm text-ink-500 dark:text-ink-300 num">{count} booking{count === 1 ? '' : 's'}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <MapPin size={18} className="text-sage-600" />
            <p className="font-display text-xl">By location</p>
          </div>
          <ul className="grid gap-2.5">
            {(locations ?? []).map((l) => {
              const count = todays.filter((b) => b.locationId === l.id).length;
              return (
                <li key={l.id} className="flex items-center justify-between text-base">
                  <span>{l.name}</span>
                  <span className="text-sm text-ink-500 dark:text-ink-300 num">{count}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="eyebrow text-ink-500 dark:text-ink-300">{label}</p>
      <p className="font-display text-3xl mt-2 num">{value}</p>
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
  return <span className={`pill ${m.cls} shrink-0`}>{m.label}</span>;
}
