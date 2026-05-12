import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar as CalIcon, Clock, LayoutGrid, List, MapPin, MessageSquare, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtInTz, fmtRelative, ymdInTz } from "@/lib/time";
import { formatPriceCents, cn } from "@/lib/utils";
import { browserTimezone } from "@/lib/time";
import { getBusiness, listBookings, listLocations, listServices, listStaff, subscribe } from "@/lib/api";
import type { Booking } from "@/lib/types";

type View = "list" | "calendar";

export default function CustomerBookings() {
  const { user } = useAuth();
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);
  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  if (!user) return null;

  const all = listBookings({ customerUserId: user.id });
  const now = Date.now();
  const upcoming = all.filter((b) => new Date(b.startAt).getTime() > now && b.status === "confirmed").sort((a, b) => a.startAt.localeCompare(b.startAt));
  const past = all.filter((b) => !(new Date(b.startAt).getTime() > now && b.status === "confirmed")).sort((a, b) => b.startAt.localeCompare(a.startAt));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-title1 font-semibold tracking-tight">My bookings</h1>
          <p className="text-muted-foreground mt-1">Upcoming appointments and your booking history.</p>
        </div>
        <Button asChild><Link to="/me/discover"><Plus className="h-4 w-4" /> Book</Link></Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "upcoming" | "past")}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming · {upcoming.length}</TabsTrigger>
            <TabsTrigger value="past">Past · {past.length}</TabsTrigger>
          </TabsList>
          {tab === "upcoming" && <ViewToggle view={view} onChange={setView} />}
        </div>
        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <EmptyState />
          ) : view === "list" ? (
            <div className="grid gap-4 mt-4">
              {upcoming.map((b) => <BookingRow key={b.id} bookingId={b.id} />)}
            </div>
          ) : (
            <CalendarView bookings={upcoming} userTz={user.timezone || browserTimezone()} />
          )}
        </TabsContent>
        <TabsContent value="past">
          <div className="grid gap-4 mt-4">
            {past.map((b) => <BookingRow key={b.id} bookingId={b.id} />)}
            {past.length === 0 && <p className="text-muted-foreground text-sm">No past bookings yet.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="inline-flex items-center rounded-2xl bg-secondary p-1 text-muted-foreground">
      <button
        onClick={() => onChange("list")}
        aria-pressed={view === "list"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
          view === "list" ? "bg-card text-foreground shadow-soft" : "hover:text-foreground"
        )}
      >
        <List className="h-3.5 w-3.5" /> List
      </button>
      <button
        onClick={() => onChange("calendar")}
        aria-pressed={view === "calendar"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
          view === "calendar" ? "bg-card text-foreground shadow-soft" : "hover:text-foreground"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" /> Calendar
      </button>
    </div>
  );
}

function BookingRow({ bookingId }: { bookingId: string }) {
  const all = listBookings({});
  const b = all.find((x) => x.id === bookingId)!;
  const business = getBusiness(b.businessId)!;
  const service = listServices(business.id).find((s) => s.id === b.serviceId)!;
  const staff = listStaff(business.id).find((s) => s.userId === b.staffUserId);
  const location = listLocations(business.id).find((l) => l.id === b.locationId)!;
  const tz = business.timezone;

  const statusVariant = b.status === "confirmed" ? "confirmed"
    : b.status === "completed" ? "completed"
    : b.status === "no_show" ? "noshow"
    : b.status === "rescheduled" ? "rescheduled"
    : "cancelled";

  const action = b.status === "confirmed" ? (
    <Button asChild variant="outline" size="sm">
      <Link to={`/b/${business.slug}/manage/${b.id}`}>Manage</Link>
    </Button>
  ) : (
    <Button asChild variant="ghost" size="sm">
      <Link to={`/b/${business.slug}`}><MessageSquare className="h-3.5 w-3.5" /> Book again</Link>
    </Button>
  );

  return (
    <Card className="p-5 md:p-6 hover:shadow-pillow transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusVariant as any}>{b.status.replace(/_/g, " ")}</Badge>
            <span className="text-xs text-muted-foreground">{fmtRelative(b.startAt, tz)}</span>
          </div>
          <h2 className="mt-2 text-title3 font-semibold tracking-tight">{service.name}</h2>
          <p className="text-muted-foreground">{business.name}{staff ? ` · ${staff.displayName}` : ""}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CalIcon className="h-3.5 w-3.5" />{fmtInTz(b.startAt, tz, "EEE, MMM d")}</span>
            <span className="flex items-center gap-1.5 tabular-nums"><Clock className="h-3.5 w-3.5" />{fmtInTz(b.startAt, tz, "h:mm a")} {fmtInTz(b.startAt, tz, "zzz")}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{location.name}</span>
          </div>
        </div>

        {/* Mobile: price + action on one row, full width */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border sm:hidden">
          <div className="min-w-0">
            <div className="text-headline font-semibold tabular-nums">{formatPriceCents(service.priceCents)}</div>
            {b.depositPaidCents > 0 && (
              <div className="text-xs text-muted-foreground tabular-nums">{formatPriceCents(b.depositPaidCents)} deposit paid</div>
            )}
          </div>
          <div className="shrink-0">{action}</div>
        </div>

        {/* sm+: price column right-aligned next to the info column */}
        <div className="hidden sm:flex text-right flex-col items-end gap-2 shrink-0">
          <div className="text-headline font-semibold tabular-nums">{formatPriceCents(service.priceCents)}</div>
          {b.depositPaidCents > 0 && (
            <div className="text-xs text-muted-foreground tabular-nums">{formatPriceCents(b.depositPaidCents)} deposit paid</div>
          )}
          {action}
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="p-12 mt-4 text-center">
      <div className="mx-auto h-14 w-14 rounded-3xl bg-primary/15 grid place-items-center">
        <CalIcon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mt-4 text-headline font-semibold">Nothing booked yet</h3>
      <p className="mt-1 text-muted-foreground">Browse a business and book your first appointment.</p>
      <Button asChild size="lg" className="mt-5"><Link to="/me/discover">Find a business</Link></Button>
    </Card>
  );
}

/* ---------- Calendar view ---------- */

function CalendarView({ bookings, userTz }: { bookings: Booking[]; userTz: string }) {
  // Cursor month is YYYY-MM in user's timezone, so the calendar reflects how the user thinks of dates.
  const todayYmd = ymdInTz(new Date().toISOString(), userTz);
  const [cursor, setCursor] = useState(() => todayYmd.slice(0, 7));
  const [pickedDay, setPickedDay] = useState<string | null>(todayYmd);

  // Group bookings by user-tz day key.
  const byDay = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of bookings) {
      // Use the booking's business timezone for the day key — that's what the customer sees on confirmation.
      const biz = getBusiness(b.businessId);
      const tz = biz?.timezone ?? userTz;
      const k = ymdInTz(b.startAt, tz);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(b);
    }
    return m;
  }, [bookings, userTz]);

  const [year, monthRaw] = cursor.split("-").map(Number);
  const month = monthRaw - 1;
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

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

  const pickedBookings = pickedDay ? byDay.get(pickedDay) ?? [] : [];

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5 mt-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => shift(-1)} aria-label="Previous month" className="rounded-2xl hover:bg-secondary px-3 py-1.5 touch-target">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <h3 className="text-headline font-semibold">{fmtInTz(`${cursor}-01T12:00:00Z`, userTz, "MMMM yyyy")}</h3>
            <button
              onClick={() => { setCursor(todayYmd.slice(0, 7)); setPickedDay(todayYmd); }}
              className="text-xs text-primary hover:underline mt-0.5"
            >
              Jump to today
            </button>
          </div>
          <button onClick={() => shift(1)} aria-label="Next month" className="rounded-2xl hover:bg-secondary px-3 py-1.5 touch-target">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="text-center py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c.ymd) return <div key={i} />;
            const items = byDay.get(c.ymd) ?? [];
            const isToday = c.ymd === todayYmd;
            const isPicked = c.ymd === pickedDay;
            const isPast = c.ymd < todayYmd;
            return (
              <button
                key={c.ymd}
                onClick={() => setPickedDay(c.ymd!)}
                className={cn(
                  "relative min-h-[72px] rounded-2xl text-left p-1.5 transition-all border",
                  isPicked ? "border-primary bg-primary/10 shadow-soft" :
                  items.length > 0 ? "border-border bg-card hover:border-primary/60" :
                  "border-transparent hover:bg-secondary/50",
                  isPast && !isPicked && "opacity-60",
                  isToday && !isPicked && "ring-1 ring-primary/40"
                )}
              >
                <div className={cn("text-sm tabular-nums font-medium", isToday && "text-primary")}>{c.day}</div>

                {/* Mobile: compact dot + count */}
                {items.length > 0 && (
                  <div className="sm:hidden mt-1 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-[10px] tabular-nums font-medium text-primary">{items.length}</span>
                  </div>
                )}

                {/* sm+: time + service chips */}
                <div className="hidden sm:block mt-1 space-y-0.5">
                  {items.slice(0, 2).map((b) => {
                    const biz = getBusiness(b.businessId)!;
                    const svc = listServices(biz.id).find((s) => s.id === b.serviceId)!;
                    return (
                      <div key={b.id} className="rounded-md bg-primary/15 px-1 py-0.5 text-[10px] truncate">
                        <span className="tabular-nums font-medium">{fmtInTz(b.startAt, biz.timezone, "h:mma").toLowerCase()}</span>
                        {" "}<span className="opacity-80">{svc.name}</span>
                      </div>
                    );
                  })}
                  {items.length > 2 && (
                    <div className="text-[10px] text-muted-foreground px-1">+{items.length - 2} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Day detail pane */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        {pickedDay ? (
          <Card className="p-5">
            <div className="mb-4">
              <span className="eyebrow text-muted-foreground">{pickedBookings.length === 0 ? "Nothing scheduled" : `${pickedBookings.length} booking${pickedBookings.length === 1 ? "" : "s"}`}</span>
              <h3 className="mt-0.5 text-headline font-semibold">
                {fmtInTz(`${pickedDay}T12:00:00Z`, userTz, "EEEE, MMM d")}
              </h3>
            </div>
            {pickedBookings.length === 0 ? (
              <div className="rounded-2xl bg-secondary/50 p-5 text-sm text-muted-foreground text-center">
                No appointments this day.
              </div>
            ) : (
              <div className="space-y-3">
                {pickedBookings.sort((a, b) => a.startAt.localeCompare(b.startAt)).map((b, i) => (
                  <CalendarBookingItem key={b.id} booking={b} delay={i * 0.04} />
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-5 text-center text-sm text-muted-foreground">
            Pick a day to see your appointments.
          </Card>
        )}
      </div>
    </div>
  );
}

function CalendarBookingItem({ booking, delay }: { booking: Booking; delay: number }) {
  const biz = getBusiness(booking.businessId)!;
  const svc = listServices(biz.id).find((s) => s.id === booking.serviceId)!;
  const staff = listStaff(biz.id).find((s) => s.userId === booking.staffUserId);
  const tz = biz.timezone;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", bounce: 0.2 }}
    >
      <Link
        to={`/b/${biz.slug}/manage/${booking.id}`}
        className="block rounded-2xl border border-border bg-card hover:border-primary hover:shadow-soft transition-all p-4"
      >
        <div className="flex items-start gap-3">
          <div className="text-center shrink-0 px-2.5 py-1.5 rounded-xl bg-primary/15 text-primary">
            <div className="text-[10px] uppercase tracking-wider font-semibold">{fmtInTz(booking.startAt, tz, "MMM")}</div>
            <div className="text-lg font-semibold tabular-nums leading-tight">{fmtInTz(booking.startAt, tz, "d")}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{svc.name}</div>
            <div className="text-xs text-muted-foreground truncate">{biz.name}{staff ? ` · ${staff.displayName}` : ""}</div>
            <div className="mt-1.5 text-xs text-muted-foreground tabular-nums flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {fmtInTz(booking.startAt, tz, "h:mm a")} – {fmtInTz(booking.endAt, tz, "h:mm a")}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
