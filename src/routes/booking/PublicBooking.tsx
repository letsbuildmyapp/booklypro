import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Check, Clock, MapPin, Phone, ShieldCheck, Sparkles, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn, formatDuration, formatPriceCents, initials } from "@/lib/utils";
import { browserTimezone, fmtInTz, todayYmd } from "@/lib/time";
import { computeDeposit } from "@/lib/availability";
import { createBooking, getBusinessBySlug, getOrCreateGuestCustomer, getAvailableSlots, listServices, listStaff, listLocations, currentUser } from "@/lib/api";
import type { AvailableSlot } from "@/lib/availability";
import type { Service, StaffProfile } from "@/lib/types";
import NotFoundPage from "@/routes/NotFound";
import { toast } from "sonner";

type Step = 0 | 1 | 2 | 3 | 4;

export default function PublicBookingPage() {
  const { slug = "" } = useParams();
  const business = getBusinessBySlug(slug);
  const nav = useNavigate();

  if (!business) return <NotFoundPage />;

  const services = listServices(business.id).filter((s) => s.active);
  const staff = listStaff(business.id).filter((s) => s.active);
  const locations = listLocations(business.id).filter((l) => l.active);

  const [step, setStep] = useState<Step>(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffUserId, setStaffUserId] = useState<string | "any" | null>(null);
  const [locationId, setLocationId] = useState<string | null>(locations[0]?.id ?? null);
  const [slot, setSlot] = useState<AvailableSlot | null>(null);
  const [showInMyTz, setShowInMyTz] = useState(false);

  const me = currentUser();
  const myTz = browserTimezone();
  const renderTz = showInMyTz ? myTz : business.timezone;

  const service = services.find((s) => s.id === serviceId);
  const skipStaffStep = staff.length <= 1;
  const skipLocationStep = locations.length <= 1;

  // Auto-skip steps when there's only one option
  useEffect(() => {
    if (step === 1 && skipStaffStep) {
      setStaffUserId(staff[0]?.userId ?? "any");
      setStep(skipLocationStep ? 3 : 2);
    }
    if (step === 2 && skipLocationStep) {
      setLocationId(locations[0]?.id ?? null);
      setStep(3);
    }
  }, [step, skipStaffStep, skipLocationStep, staff, locations]);

  const accentHue = business.brandColors.hue;

  return (
    <div
      className="min-h-screen bg-background bg-grain"
      style={{ ["--ring" as any]: `${accentHue} 60% 50%`, ["--primary" as any]: `${accentHue} 35% 46%` }}
    >
      <header className="container py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="container max-w-3xl pb-20">
        {/* Business header */}
        <Card className="overflow-hidden mb-6">
          {business.heroImage && (
            <div className="aspect-[5/2] overflow-hidden bg-muted">
              <img src={business.heroImage} alt={business.name} className="h-full w-full object-cover" />
            </div>
          )}
          <div className="p-6 md:p-8">
            <h1 className="text-title1 md:text-largeTitle font-semibold tracking-tight">{business.name}</h1>
            <p className="mt-2 text-muted-foreground leading-relaxed prose-soft">{business.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {business.address}</div>
              <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {business.phone}</div>
              <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {business.timezone.replace("_", " ")}</div>
            </div>
          </div>
        </Card>

        <Stepper step={step} skipStaff={skipStaffStep} skipLoc={skipLocationStep} />

        <div className="mt-8" data-tour="booking-step">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {step === 0 && (
                <ServiceStep services={services} onPick={(id) => { setServiceId(id); setStep(skipStaffStep ? (skipLocationStep ? 3 : 2) : 1); }} selected={serviceId} />
              )}
              {step === 1 && service && (
                <StaffStep
                  service={service}
                  staff={staff.filter((s) => service.eligibleStaffIds.includes(s.userId))}
                  selected={staffUserId}
                  onPick={(id) => { setStaffUserId(id); setStep(skipLocationStep ? 3 : 2); }}
                  onBack={() => setStep(0)}
                />
              )}
              {step === 2 && (
                <LocationStep
                  locations={locations}
                  selected={locationId}
                  onPick={(id) => { setLocationId(id); setStep(3); }}
                  onBack={() => setStep(1)}
                />
              )}
              {step === 3 && service && (
                <DateTimeStep
                  service={service}
                  staff={staff}
                  staffUserId={staffUserId}
                  locationId={locationId!}
                  businessId={business.id}
                  businessTimezone={business.timezone}
                  renderTz={renderTz}
                  showInMyTz={showInMyTz}
                  setShowInMyTz={setShowInMyTz}
                  myTz={myTz}
                  selected={slot}
                  onPick={(s) => { setSlot(s); setStep(4); }}
                  onBack={() => setStep(skipLocationStep ? (skipStaffStep ? 0 : 1) : 2)}
                />
              )}
              {step === 4 && service && slot && (
                <DetailsStep
                  business={business}
                  service={service}
                  staffUserId={slot.staffUserId}
                  locationId={locationId!}
                  slot={slot}
                  renderTz={renderTz}
                  defaults={me ? { name: me.displayName, email: me.email, phone: me.phone ?? "" } : undefined}
                  onBack={() => setStep(3)}
                  onConfirm={(booking) => nav(`/b/${slug}/confirmed/${booking.id}`)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {business.showPlatformFooter && (
        <footer className="container py-8 border-t border-border">
          <div className="text-xs text-center text-muted-foreground">
            Booking powered by <Link to="/" className="font-semibold text-foreground hover:underline">BooklyPro</Link>
          </div>
        </footer>
      )}
    </div>
  );
}

function Stepper({ step, skipStaff, skipLoc }: { step: Step; skipStaff: boolean; skipLoc: boolean }) {
  const labels = ["Service", "Staff", "Location", "Time", "Details"];
  const visible = labels.map((l, i) => ({ l, i })).filter(({ i }) => {
    if (i === 1 && skipStaff) return false;
    if (i === 2 && skipLoc) return false;
    return true;
  });
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1">
      {visible.map(({ l, i }, idx) => {
        const active = step === i;
        const done = step > i;
        return (
          <div key={l} className="flex items-center gap-3 shrink-0">
            <div className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium",
              active ? "bg-primary text-primary-foreground" :
              done ? "bg-secondary text-foreground" :
              "bg-muted/50 text-muted-foreground"
            )}>
              <span className={cn(
                "grid place-items-center h-5 w-5 rounded-full text-[10px] tabular-nums font-semibold",
                active ? "bg-primary-foreground/20" : done ? "bg-primary text-primary-foreground" : "bg-card"
              )}>
                {done ? <Check className="h-3 w-3" /> : idx + 1}
              </span>
              <span>{l}</span>
            </div>
            {idx < visible.length - 1 && <div className={cn("h-px w-6", done ? "bg-primary" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}

function ServiceStep({ services, selected, onPick }: { services: Service[]; selected: string | null; onPick: (id: string) => void }) {
  return (
    <div>
      <h2 className="text-title2 font-semibold mb-1">Pick a service</h2>
      <p className="text-muted-foreground mb-5">Choose what you'd like to book.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {services.map((s) => {
          const dep = computeDeposit(s);
          return (
            <button
              key={s.id}
              onClick={() => onPick(s.id)}
              className={cn(
                "text-left rounded-3xl border bg-card p-6 transition-all touch-target-lg hover:shadow-pillow hover:-translate-y-0.5",
                selected === s.id ? "border-primary ring-2 ring-primary/30" : "border-border"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-headline font-semibold">{s.name}</h3>
                <span className="text-title3 font-semibold tabular-nums">{formatPriceCents(s.priceCents)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{s.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="muted"><Clock className="h-3 w-3" /> {formatDuration(s.durationMinutes)}</Badge>
                {dep > 0 && (
                  <Badge variant="accent">
                    <ShieldCheck className="h-3 w-3" /> {formatPriceCents(dep)} deposit
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StaffStep({ service, staff, selected, onPick, onBack }: {
  service: Service; staff: StaffProfile[]; selected: string | "any" | null;
  onPick: (id: string | "any") => void; onBack: () => void;
}) {
  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3 gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <h2 className="text-title2 font-semibold mb-1">Pick a staff member</h2>
      <p className="text-muted-foreground mb-5">For your <span className="font-medium text-foreground">{service.name}</span>.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => onPick("any")}
          className={cn(
            "text-left rounded-3xl border bg-card p-6 transition-all touch-target-lg hover:shadow-pillow",
            selected === "any" ? "border-primary ring-2 ring-primary/30" : "border-border"
          )}
        >
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/15 grid place-items-center text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-headline font-semibold">Any available</h3>
              <p className="text-sm text-muted-foreground">Pick the first open slot.</p>
            </div>
          </div>
        </button>
        {staff.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.userId)}
            className={cn(
              "text-left rounded-3xl border bg-card p-6 transition-all touch-target-lg hover:shadow-pillow",
              selected === s.userId ? "border-primary ring-2 ring-primary/30" : "border-border"
            )}
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {s.avatar && <AvatarImage src={s.avatar} alt="" />}
                <AvatarFallback>{initials(s.displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h3 className="text-headline font-semibold truncate">{s.displayName}</h3>
                {s.bio && <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">{s.bio}</p>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LocationStep({ locations, selected, onPick, onBack }: {
  locations: ReturnType<typeof listLocations>; selected: string | null;
  onPick: (id: string) => void; onBack: () => void;
}) {
  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3 gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <h2 className="text-title2 font-semibold mb-1">Pick a location</h2>
      <div className="grid sm:grid-cols-2 gap-4 mt-5">
        {locations.map((l) => (
          <button
            key={l.id}
            onClick={() => onPick(l.id)}
            className={cn(
              "text-left rounded-3xl border bg-card p-6 transition-all hover:shadow-pillow",
              selected === l.id ? "border-primary ring-2 ring-primary/30" : "border-border"
            )}
          >
            <h3 className="text-headline font-semibold">{l.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{l.address}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function DateTimeStep(props: {
  service: Service; staff: StaffProfile[]; staffUserId: string | "any" | null;
  locationId: string; businessId: string; businessTimezone: string;
  renderTz: string; showInMyTz: boolean; setShowInMyTz: (v: boolean) => void; myTz: string;
  selected: AvailableSlot | null; onPick: (s: AvailableSlot) => void; onBack: () => void;
}) {
  const today = todayYmd(props.businessTimezone);
  const [pickedDay, setPickedDay] = useState<string>(today);

  // Compute slots for next 60 days
  const allSlots = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 60);
    return getAvailableSlots({
      businessId: props.businessId,
      serviceId: props.service.id,
      staffUserId: props.staffUserId === "any" ? null : props.staffUserId,
      locationId: props.locationId,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
    });
  }, [props.businessId, props.service.id, props.staffUserId, props.locationId]);

  // Group by day in business tz, using business calendar (not viewer's tz)
  const slotsByDay = useMemo(() => {
    const m = new Map<string, AvailableSlot[]>();
    for (const s of allSlots) {
      const d = fmtInTz(s.startAt, props.businessTimezone, "yyyy-MM-dd");
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(s);
    }
    return m;
  }, [allSlots, props.businessTimezone]);

  const slotsForPicked = slotsByDay.get(pickedDay) ?? [];

  return (
    <div>
      <button onClick={props.onBack} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3 gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-title2 font-semibold mb-1">Pick a time</h2>
          <p className="text-muted-foreground">All times in <span className="font-medium text-foreground">{props.renderTz.replace("_", " ")}</span></p>
        </div>
        {props.myTz !== props.businessTimezone && (
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-sm cursor-pointer">
            <Switch checked={props.showInMyTz} onCheckedChange={props.setShowInMyTz} />
            <span>Show in my timezone <span className="text-muted-foreground">({props.myTz})</span></span>
          </label>
        )}
      </div>

      <div className="mt-6 grid lg:grid-cols-[1fr_320px] gap-6">
        <div data-tour="time-grid">
          <MonthCalendar
            tz={props.businessTimezone}
            slotsByDay={slotsByDay}
            picked={pickedDay}
            onPick={setPickedDay}
          />
        </div>
        <Card className="p-5 max-h-[420px] overflow-y-auto">
          <div className="mb-3 text-sm">
            <span className="eyebrow text-muted-foreground">Times for</span>
            <div className="mt-0.5 font-semibold text-headline">
              {fmtInTz(`${pickedDay}T12:00:00Z`, props.businessTimezone, "EEEE, MMM d")}
            </div>
          </div>
          {slotsForPicked.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto opacity-40 mb-2" />
              <p className="text-sm">No openings this day.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {slotsForPicked.map((s) => (
                <motion.button
                  key={s.startAt + s.staffUserId}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => props.onPick(s)}
                  className={cn(
                    "rounded-2xl border-2 px-3 py-3 text-sm font-medium tabular-nums transition-all touch-target",
                    props.selected?.startAt === s.startAt
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary hover:bg-primary/5"
                  )}
                >
                  {fmtInTz(s.startAt, props.renderTz, "h:mm a")}
                </motion.button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function MonthCalendar({ tz, slotsByDay, picked, onPick }: {
  tz: string; slotsByDay: Map<string, AvailableSlot[]>; picked: string; onPick: (ymd: string) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const t = todayYmd(tz);
    return t.slice(0, 7); // YYYY-MM
  });

  const [year, monthRaw] = cursor.split("-").map(Number);
  const month = monthRaw - 1;
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = todayYmd(tz);

  const cells: Array<{ ymd?: string; day: number | null }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ ymd, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null });

  function shift(delta: number) {
    let m = month + 1 + delta;
    let y = year;
    while (m > 12) { m -= 12; y += 1; }
    while (m < 1) { m += 12; y -= 1; }
    setCursor(`${y}-${String(m).padStart(2, "0")}`);
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shift(-1)} className="touch-target rounded-2xl hover:bg-secondary px-3 py-1.5">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h3 className="font-semibold">
          {fmtInTz(`${cursor}-01T12:00:00Z`, tz, "MMMM yyyy")}
        </h3>
        <button onClick={() => shift(1)} className="touch-target rounded-2xl hover:bg-secondary px-3 py-1.5">
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="text-center py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (c.day === null) return <div key={i} />;
          const ymd = c.ymd!;
          const has = (slotsByDay.get(ymd)?.length ?? 0) > 0;
          const isPicked = ymd === picked;
          const isToday = ymd === today;
          const isPast = ymd < today;
          return (
            <button
              key={ymd}
              disabled={!has || isPast}
              onClick={() => onPick(ymd)}
              className={cn(
                "aspect-square rounded-2xl text-sm tabular-nums font-medium transition-all touch-target",
                isPicked ? "bg-primary text-primary-foreground shadow-soft" :
                has && !isPast ? "bg-card hover:bg-primary/10 text-foreground" :
                "text-muted-foreground/40 cursor-not-allowed",
                isToday && !isPicked && "ring-1 ring-primary/40"
              )}
            >
              {c.day}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Available</div>
        <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted" /> Fully booked</div>
      </div>
    </Card>
  );
}

function DetailsStep(props: {
  business: ReturnType<typeof getBusinessBySlug>;
  service: Service;
  staffUserId: string;
  locationId: string;
  slot: AvailableSlot;
  renderTz: string;
  defaults?: { name: string; email: string; phone: string };
  onBack: () => void;
  onConfirm: (b: { id: string }) => void;
}) {
  const [form, setForm] = useState({
    name: props.defaults?.name ?? "",
    email: props.defaults?.email ?? "",
    phone: props.defaults?.phone ?? "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const business = props.business!;
  const deposit = computeDeposit(props.service);

  async function confirm() {
    if (!form.name || !form.email) {
      toast.error("We need your name and email to confirm.");
      return;
    }
    setSubmitting(true);
    try {
      // Mock Stripe deposit charge — in prod, redirect to Stripe Checkout
      const stripePaymentIntentId = deposit > 0 ? `pi_demo_${Math.random().toString(36).slice(2, 10)}` : null;

      const customer = currentUser() ?? getOrCreateGuestCustomer({ name: form.name, email: form.email, phone: form.phone });

      const booking = createBooking({
        businessId: business.id,
        serviceId: props.service.id,
        staffUserId: props.staffUserId,
        locationId: props.locationId,
        customer: { userId: customer.id, name: form.name, email: form.email, phone: form.phone },
        startAt: props.slot.startAt,
        notesFromCustomer: form.notes || undefined,
        depositPaidCents: deposit,
        stripePaymentIntentId,
      });

      if (deposit > 0) toast.success(`Deposit of ${formatPriceCents(deposit)} charged · Stripe test mode`);
      props.onConfirm(booking);
    } catch (e: any) {
      toast.error(e.message || "Could not confirm booking");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button onClick={props.onBack} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3 gap-1.5">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <h2 className="text-title2 font-semibold mb-1">Almost done</h2>
      <p className="text-muted-foreground mb-6">Tell us how to reach you.</p>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Anything we should know? <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. allergies, accessibility needs, parking questions" />
            </div>
          </div>
        </Card>

        <Card className="p-6 h-fit sticky top-6">
          <h3 className="font-semibold text-headline">Order summary</h3>
          <Separator />
          <div className="space-y-3 mt-4 text-sm">
            <Row label="Service" value={props.service.name} />
            <Row label="With" value={<StaffName id={props.staffUserId} businessId={business.id} />} />
            <Row label="When" value={fmtInTz(props.slot.startAt, props.renderTz, "EEE, MMM d · h:mm a")} />
            <Row label="Duration" value={formatDuration(props.service.durationMinutes)} />
          </div>
          <div className="border-t border-border my-4" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Service total</span>
            <span className="font-semibold tabular-nums">{formatPriceCents(props.service.priceCents)}</span>
          </div>
          {deposit > 0 && (
            <>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-sm text-muted-foreground">Deposit due now</span>
                <span className="font-semibold text-primary tabular-nums">{formatPriceCents(deposit)}</span>
              </div>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-sm text-muted-foreground">Remaining at appointment</span>
                <span className="font-semibold tabular-nums">{formatPriceCents(props.service.priceCents - deposit)}</span>
              </div>
            </>
          )}
          <Button size="lg" className="w-full mt-5" onClick={confirm} disabled={submitting}>
            {submitting ? "Confirming…" : deposit > 0 ? `Pay ${formatPriceCents(deposit)} & confirm` : "Confirm booking"}
          </Button>
          <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
            By confirming you agree to {business.cancellationPolicy.hoursBefore}h cancellation policy.
            {business.cancellationPolicy.chargePercent > 0 && ` Cancellations within ${business.cancellationPolicy.hoursBefore}h are charged ${business.cancellationPolicy.chargePercent}% of service.`}
          </p>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function StaffName({ id, businessId }: { id: string; businessId: string }) {
  const sp = listStaff(businessId).find((s) => s.userId === id);
  if (!sp) return <span className="text-muted-foreground inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Any available</span>;
  return <span className="inline-flex items-center gap-1.5">{sp.displayName}</span>;
}

function Separator() { return <div className="h-px bg-border my-4" />; }
