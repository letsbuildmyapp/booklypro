import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useServices, useStaff, useLocations, useAllBookings } from '@/lib/queries';
import { useQueryClient } from '@tanstack/react-query';
import { createBooking, sendBookingEmail, generateSlots, startOfDayMs } from '@/lib/booking';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Clock, MapPin } from 'lucide-react';
import { formatCurrency, formatDuration } from '@/lib/utils';
import type { Service, Staff } from '@/lib/types';

type Step = 1 | 2 | 3 | 4;

export function BookFlow() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: services } = useServices();
  const { data: staffList } = useStaff();
  const { data: locations } = useLocations();
  const { data: allBookings } = useAllBookings();

  const [step, setStep] = useState<Step>(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffPref, setStaffPref] = useState<string | 'any'>('any');
  const [day, setDay] = useState<number>(() => startOfDayMs(Date.now()));
  const [slot, setSlot] = useState<{ startAt: number; endAt: number; staff: Staff } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const service = services?.find((s) => s.id === serviceId) ?? null;

  const eligibleStaff = useMemo<Staff[]>(() => {
    if (!service || !staffList) return [];
    return staffList.filter((s) => service.staffIds.includes(s.id));
  }, [service, staffList]);

  const slots = useMemo(() => {
    if (!service || !staffList || !allBookings) return [];
    return generateSlots(day, service, staffList, allBookings, staffPref);
  }, [day, service, staffList, allBookings, staffPref]);

  // 7-day strip starting today
  const days = useMemo(() => {
    const today = startOfDayMs(Date.now());
    return Array.from({ length: 14 }, (_, i) => today + i * 86_400_000);
  }, []);

  async function confirmBooking() {
    if (!service || !slot || !profile) return;
    setSubmitting(true);
    try {
      const created = await createBooking({
        service,
        staff: slot.staff,
        customerUid: profile.uid,
        customerName: profile.name,
        customerEmail: profile.email,
        startAt: slot.startAt,
        endAt: slot.endAt,
      });
      const loc = locations?.find((l) => l.id === slot.staff.locationId);
      await sendBookingEmail({
        bookingId: created.id,
        customerName: profile.name,
        customerEmail: profile.email,
        serviceName: service.name,
        staffName: slot.staff.name,
        locationName: loc?.name ?? '',
        locationAddress: loc?.address ?? '',
        startAt: slot.startAt,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
        type: 'confirmation',
      });
      toast.success("You're booked. Confirmation on its way.");
      qc.invalidateQueries({ queryKey: ['bookings'] });
      nav('/app');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Stepper step={step} />

      {step === 1 ? (
        <div className="mt-10">
          <h1 className="font-display text-3xl sm:text-4xl mb-2">What are we booking?</h1>
          <p className="text-base text-ink-600 dark:text-ink-200 mb-8">Pick a service to get started.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {(services ?? []).map((s) => (
              <button
                key={s.id}
                onClick={() => { setServiceId(s.id); setStaffPref('any'); setStep(2); }}
                className={`card p-6 text-left transition-all hover:shadow-lift hover:border-sage-300 ${serviceId === s.id ? 'ring-2 ring-sage-400 border-sage-400' : ''}`}
              >
                <p className="font-display text-xl">{s.name}</p>
                <p className="text-sm text-ink-600 dark:text-ink-200 mt-2 leading-relaxed">{s.description}</p>
                <div className="mt-4 flex items-center gap-3 text-sm text-ink-500 dark:text-ink-300">
                  <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {formatDuration(s.durationMin)}</span>
                  <span className="num font-medium text-ink-800 dark:text-ink-100">{formatCurrency(s.priceCents)}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-10">
            <button onClick={() => nav('/app')} className="btn-ghost">
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 && service ? (
        <div className="mt-10">
          <h1 className="font-display text-3xl sm:text-4xl mb-2">Who's doing the work?</h1>
          <p className="text-base text-ink-600 dark:text-ink-200 mb-8">Pick a stylist, or let us match you with whoever's free.</p>
          <div className="grid gap-3">
            <button
              onClick={() => { setStaffPref('any'); setStep(3); }}
              className={`card p-5 text-left flex items-center gap-4 transition-all hover:shadow-lift ${staffPref === 'any' ? 'ring-2 ring-sage-400 border-sage-400' : ''}`}
            >
              <div className="h-12 w-12 rounded-2xl bg-sage-100 dark:bg-sage-800/40 grid place-items-center text-sage-700 dark:text-sage-300 font-display text-lg">★</div>
              <div className="flex-1">
                <p className="font-display text-lg">Any available stylist</p>
                <p className="text-sm text-ink-600 dark:text-ink-200">Get the earliest open slot.</p>
              </div>
              <ArrowRight size={16} className="text-ink-400" />
            </button>
            {eligibleStaff.map((s) => (
              <button
                key={s.id}
                onClick={() => { setStaffPref(s.id); setStep(3); }}
                className={`card p-5 text-left flex items-center gap-4 transition-all hover:shadow-lift ${staffPref === s.id ? 'ring-2 ring-sage-400 border-sage-400' : ''}`}
              >
                {s.avatarUrl ? (
                  <img src={s.avatarUrl} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-2xl bg-blush-100 dark:bg-blush-800/40 grid place-items-center text-blush-700 dark:text-blush-300 font-medium">
                    {s.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-display text-lg">{s.name}</p>
                  <p className="text-sm text-ink-600 dark:text-ink-200">{s.title}</p>
                </div>
                <ArrowRight size={16} className="text-ink-400" />
              </button>
            ))}
          </div>
          <div className="mt-10">
            <button onClick={() => setStep(1)} className="btn-ghost">
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 && service ? (
        <div className="mt-10">
          <h1 className="font-display text-3xl sm:text-4xl mb-2">Pick a time.</h1>
          <p className="text-base text-ink-600 dark:text-ink-200 mb-8">
            {service.name} · {formatDuration(service.durationMin)}
            {staffPref !== 'any' && staffList ? ` with ${staffList.find((s) => s.id === staffPref)?.name}` : ''}
          </p>

          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-1 px-1">
            {days.map((d) => {
              const dt = new Date(d);
              const active = d === day;
              return (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  className={`flex flex-col items-center justify-center min-w-16 h-20 rounded-2xl border transition-colors px-3 ${active ? 'bg-sage-600 text-white border-sage-600' : 'bg-white dark:bg-ink-800 border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-200 hover:border-sage-300'}`}
                >
                  <span className="text-xs uppercase tracking-wider font-medium">{dt.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="font-display text-2xl num leading-none mt-1">{dt.getDate()}</span>
                </button>
              );
            })}
          </div>

          {slots.length === 0 ? (
            <div className="card p-8 text-center text-ink-500 dark:text-ink-300">
              No openings on this day. Try another.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {slots.map((s) => {
                const t = new Date(s.startAt);
                return (
                  <button
                    key={`${s.staff.id}-${s.startAt}`}
                    onClick={() => { setSlot(s); setStep(4); }}
                    className="card p-4 text-left hover:border-sage-300 hover:shadow-lift transition-all"
                  >
                    <p className="font-display text-lg num">{t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                    {staffPref === 'any' ? (
                      <p className="text-xs text-ink-500 dark:text-ink-300 mt-1">{s.staff.name.split(' ')[0]}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-10">
            <button onClick={() => setStep(2)} className="btn-ghost">
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 && service && slot ? (
        <div className="mt-10">
          <h1 className="font-display text-3xl sm:text-4xl mb-2">Confirm your booking.</h1>
          <p className="text-base text-ink-600 dark:text-ink-200 mb-8">Looks good?</p>
          <div className="card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1">
                <p className="eyebrow mb-2">Service</p>
                <p className="font-display text-2xl">{service.name}</p>
                <p className="text-sm text-ink-600 dark:text-ink-200 mt-1">{service.description}</p>
                <div className="mt-3 text-sm text-ink-500 dark:text-ink-300">{formatDuration(service.durationMin)} · <span className="num">{formatCurrency(service.priceCents)}</span></div>
              </div>
              <div className="flex-1">
                <p className="eyebrow mb-2">When &amp; where</p>
                <p className="font-display text-xl">
                  {new Date(slot.startAt).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <p className="font-display text-xl num">{new Date(slot.startAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                <p className="text-sm text-ink-600 dark:text-ink-200 mt-3">with <span className="font-medium">{slot.staff.name}</span></p>
                <p className="text-sm text-ink-500 dark:text-ink-300 mt-2 inline-flex items-center gap-1.5">
                  <MapPin size={13} /> {locations?.find((l) => l.id === slot.staff.locationId)?.name}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button onClick={() => setStep(3)} className="btn-secondary">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={confirmBooking} disabled={submitting} className="btn-primary">
              {submitting ? 'Confirming…' : (<><Check size={16} /> Confirm booking</>)}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ['Service', 'Stylist', 'Time', 'Confirm'];
  return (
    <div className="flex items-center gap-3">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3.5 h-9 rounded-full text-xs font-medium tracking-wider uppercase ${active ? 'bg-sage-600 text-white' : done ? 'bg-sage-100 text-sage-800 dark:bg-sage-800/40 dark:text-sage-200' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300'}`}>
              <span className="num">{n}</span> {label}
            </div>
            {i < labels.length - 1 ? <span className="hidden sm:inline-block w-4 h-px bg-ink-200 dark:bg-ink-700" /> : null}
          </div>
        );
      })}
    </div>
  );
}
