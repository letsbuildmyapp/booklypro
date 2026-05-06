import { useMemo, useState } from 'react';
import { useAllBookings, useStaff, useServices } from '@/lib/queries';
import { startOfDayMs } from '@/lib/booking';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_PX = 60;

export function AdminCalendar() {
  const { data: bookings } = useAllBookings();
  const { data: staffList } = useStaff();
  const { data: services } = useServices();
  const [day, setDay] = useState(() => startOfDayMs(Date.now()));

  const dayLabel = new Date(day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const next = day + 86_400_000;

  const byStaff = useMemo(() => {
    const m: Record<string, NonNullable<typeof bookings>> = {};
    for (const s of staffList ?? []) m[s.id] = [];
    for (const b of bookings ?? []) {
      if (b.startAt >= day && b.startAt < next && b.status !== 'canceled') {
        m[b.staffId]?.push(b);
      }
    }
    return m;
  }, [bookings, staffList, day, next]);

  const svcOf = (id: string) => services?.find((s) => s.id === id);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="eyebrow mb-2">All staff</p>
          <h1 className="font-display text-4xl sm:text-5xl">Day view</h1>
          <p className="text-base text-ink-600 dark:text-ink-200 mt-2">{dayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDay(day - 86_400_000)} className="btn-secondary !px-4"><ChevronLeft size={16} /></button>
          <button onClick={() => setDay(startOfDayMs(Date.now()))} className="btn-secondary text-sm">Today</button>
          <button onClick={() => setDay(day + 86_400_000)} className="btn-secondary !px-4"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="flex min-w-fit">
          {/* Hour gutter */}
          <div className="w-16 shrink-0 border-r border-ink-100 dark:border-ink-700">
            <div className="h-12 border-b border-ink-100 dark:border-ink-700" />
            {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => {
              const h = HOUR_START + i;
              return (
                <div key={h} className="h-[60px] flex items-start justify-end pr-2 pt-1 text-xs text-ink-400 num border-b border-ink-100 dark:border-ink-700">
                  {h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'a' : 'p'}
                </div>
              );
            })}
          </div>

          {(staffList ?? []).map((s) => (
            <div key={s.id} className="w-44 sm:w-52 shrink-0 border-r border-ink-100 dark:border-ink-700 last:border-r-0">
              <div className="h-12 border-b border-ink-100 dark:border-ink-700 px-3 flex items-center">
                <p className="font-display text-base truncate">{s.name}</p>
              </div>
              <div className="relative" style={{ height: (HOUR_END - HOUR_START) * HOUR_PX }}>
                {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-b border-ink-50 dark:border-ink-800" style={{ top: i * HOUR_PX, height: HOUR_PX }} />
                ))}
                {(byStaff[s.id] ?? []).map((b) => {
                  const start = new Date(b.startAt);
                  const minFromStart = (start.getHours() - HOUR_START) * 60 + start.getMinutes();
                  const top = (minFromStart / 60) * HOUR_PX;
                  const dur = (b.endAt - b.startAt) / 60_000;
                  const height = (dur / 60) * HOUR_PX - 2;
                  if (top < 0 || top > (HOUR_END - HOUR_START) * HOUR_PX) return null;
                  const svc = svcOf(b.serviceId);
                  const cls = b.status === 'completed'
                    ? 'bg-ink-100 dark:bg-ink-700/40 text-ink-700 dark:text-ink-200 border-ink-200 dark:border-ink-600'
                    : 'bg-sage-100 dark:bg-sage-800/40 text-sage-900 dark:text-sage-100 border-sage-300 dark:border-sage-600';
                  return (
                    <div
                      key={b.id}
                      className={`absolute left-1 right-1 rounded-xl border px-2.5 py-1.5 overflow-hidden ${cls}`}
                      style={{ top, height: Math.max(height, 28) }}
                    >
                      <p className="text-xs font-medium num leading-tight">
                        {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <p className="text-xs font-medium truncate leading-tight mt-0.5">{svc?.name ?? '—'}</p>
                      <p className="text-xs text-ink-600 dark:text-ink-300 truncate">{b.customerName}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
