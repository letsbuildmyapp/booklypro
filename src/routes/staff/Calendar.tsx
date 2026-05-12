import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, User as UserIcon, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { getBusiness, getBusinessBySlug, listBookings, listServices, subscribe, updateBookingStatus } from "@/lib/api";
import { fmtInTz, ymdInTz } from "@/lib/time";
import { formatPriceCents, cn } from "@/lib/utils";
import type { Booking } from "@/lib/types";

export default function StaffCalendar() {
  const { bizSlug = "" } = useParams();
  const { user } = useAuth();
  const business = getBusinessBySlug(bizSlug)!;
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);

  const tz = business.timezone;
  const todayYmd = ymdInTz(new Date().toISOString(), tz);
  const [cursor, setCursor] = useState(() => todayYmd.slice(0, 7));
  const [pickedDay, setPickedDay] = useState<string | null>(todayYmd);
  const [picked, setPicked] = useState<Booking | null>(null);

  const myBookings = useMemo(
    () => listBookings({ businessId: business.id, staffUserId: user!.id }),
    [business.id, user, _],
  );

  // Group bookings by business-tz day key.
  const byDay = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of myBookings) {
      if (b.status === "cancelled_by_customer" || b.status === "cancelled_by_business") continue;
      const k = ymdInTz(b.startAt, tz);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(b);
    }
    return m;
  }, [myBookings, tz]);

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

  const pickedBookings = pickedDay
    ? (byDay.get(pickedDay) ?? []).slice().sort((a, b) => a.startAt.localeCompare(b.startAt))
    : [];

  return (
    <div>
      <div className="mb-5 sm:mb-6">
        <h1 className="text-title1 font-semibold tracking-tight">My calendar</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base truncate">{business.name} · {tz.replace("_", " ")}</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => shift(-1)} aria-label="Previous month" className="rounded-2xl hover:bg-secondary px-3 py-1.5 touch-target">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <h3 className="text-headline font-semibold">{fmtInTz(`${cursor}-01T12:00:00Z`, tz, "MMMM yyyy")}</h3>
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

                  {/* sm+: time + customer chips */}
                  <div className="hidden sm:block mt-1 space-y-0.5">
                    {items.slice(0, 2).map((b) => (
                      <div key={b.id} className="rounded-md bg-primary/15 px-1 py-0.5 text-[10px] truncate">
                        <span className="tabular-nums font-medium">{fmtInTz(b.startAt, tz, "h:mma").toLowerCase()}</span>
                        {" "}<span className="opacity-80">{b.customerSnapshot.name}</span>
                      </div>
                    ))}
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
                <span className="eyebrow text-muted-foreground">
                  {pickedBookings.length === 0 ? "Nothing scheduled" : `${pickedBookings.length} booking${pickedBookings.length === 1 ? "" : "s"}`}
                </span>
                <h3 className="mt-0.5 text-headline font-semibold">
                  {fmtInTz(`${pickedDay}T12:00:00Z`, tz, "EEEE, MMM d")}
                </h3>
              </div>
              {pickedBookings.length === 0 ? (
                <div className="rounded-2xl bg-secondary/50 p-5 text-sm text-muted-foreground text-center">
                  No appointments this day.
                </div>
              ) : (
                <div className="space-y-3">
                  {pickedBookings.map((b, i) => (
                    <CalendarBookingItem key={b.id} booking={b} tz={tz} businessId={business.id} delay={i * 0.04} onPick={setPicked} />
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

      <BookingPanel booking={picked} onClose={() => setPicked(null)} />
    </div>
  );
}

function CalendarBookingItem({
  booking, tz, businessId, delay, onPick,
}: {
  booking: Booking;
  tz: string;
  businessId: string;
  delay: number;
  onPick: (b: Booking) => void;
}) {
  const svc = listServices(businessId).find((s) => s.id === booking.serviceId);
  const statusVariant: any =
    booking.status === "confirmed" ? "confirmed"
    : booking.status === "completed" ? "completed"
    : booking.status === "no_show" ? "noshow"
    : booking.status === "rescheduled" ? "rescheduled"
    : "cancelled";
  return (
    <motion.button
      type="button"
      onClick={() => onPick(booking)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", bounce: 0.2 }}
      className="block w-full text-left rounded-2xl border border-border bg-card hover:border-primary hover:shadow-soft transition-all p-4"
    >
      <div className="flex items-start gap-3">
        <div className="text-center shrink-0 px-2.5 py-1.5 rounded-xl bg-primary/15 text-primary tabular-nums">
          <div className="text-[10px] uppercase tracking-wider font-semibold">{fmtInTz(booking.startAt, tz, "h:mma")}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{Math.round((new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / 60000)}m</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{svc?.name ?? "Service"}</span>
            <Badge variant={statusVariant} className="text-[10px]">
              {booking.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <UserIcon className="h-3 w-3" />
            <span className="truncate">{booking.customerSnapshot.name}</span>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground tabular-nums flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {fmtInTz(booking.startAt, tz, "h:mm a")} – {fmtInTz(booking.endAt, tz, "h:mm a")}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function BookingPanel({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const open = !!booking;
  const business = booking ? getBusiness(booking.businessId) : null;
  const services = booking ? listServices(booking.businessId) : [];
  const service = booking ? services.find((s) => s.id === booking.serviceId) : null;
  const tz = business?.timezone ?? "UTC";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {booking && service && (
          <>
            <DialogHeader>
              <Badge
                variant={
                  booking.status === "confirmed" ? "confirmed" :
                  booking.status === "completed" ? "completed" :
                  booking.status === "no_show" ? "noshow" :
                  "cancelled"
                }
              >
                {booking.status.replace(/_/g, " ")}
              </Badge>
              <DialogTitle>{service.name}</DialogTitle>
              <DialogDescription>
                {fmtInTz(booking.startAt, tz, "EEEE, MMM d · h:mm a")} – {fmtInTz(booking.endAt, tz, "h:mm a")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <Row label="Customer" value={booking.customerSnapshot.name} />
              <Row label="Email" value={booking.customerSnapshot.email} />
              <Row label="Phone" value={booking.customerSnapshot.phone} />
              <Row label="Price" value={formatPriceCents(booking.priceCents)} />
              {booking.depositPaidCents > 0 && <Row label="Deposit paid" value={formatPriceCents(booking.depositPaidCents)} />}
              {booking.notesFromCustomer && (
                <div className="rounded-2xl border border-border p-3">
                  <div className="eyebrow text-muted-foreground mb-1">Note</div>
                  <p>{booking.notesFromCustomer}</p>
                </div>
              )}
            </div>
            <DialogFooter className="!flex-col gap-2 sm:!flex-row sm:!justify-stretch">
              {booking.status === "confirmed" && (
                <>
                  <Button onClick={() => { updateBookingStatus(booking.id, "completed"); onClose(); }} className="flex-1">
                    <CheckCircle2 className="h-4 w-4" />Mark complete
                  </Button>
                  <Button variant="outline" onClick={() => { updateBookingStatus(booking.id, "no_show"); onClose(); }} className="flex-1">
                    <AlertTriangle className="h-4 w-4" />No-show
                  </Button>
                  <Button variant="destructive" onClick={() => { updateBookingStatus(booking.id, "cancelled_by_business"); onClose(); }} className="flex-1">
                    <X className="h-4 w-4" />Cancel
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

