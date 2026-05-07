import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar as CalIcon, CheckCircle2, Clock, MessageSquare, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { getBusiness, getBusinessBySlug, listBookings, listServices, subscribe, updateBookingStatus, userById } from "@/lib/api";
import { fmtInTz, ymdInTz, addMinutesIso } from "@/lib/time";
import { formatPriceCents, cn } from "@/lib/utils";
import type { Booking } from "@/lib/types";

type View = "day" | "week" | "month";

export default function StaffCalendar() {
  const { bizSlug = "" } = useParams();
  const { user } = useAuth();
  const business = getBusinessBySlug(bizSlug)!;
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState(() => ymdInTz(new Date().toISOString(), business.timezone));
  const [picked, setPicked] = useState<Booking | null>(null);
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);

  const tz = business.timezone;
  const myBookings = useMemo(() => listBookings({ businessId: business.id, staffUserId: user!.id }), [business.id, user, _]);

  function shiftCursor(delta: number) {
    // Cursor is a wall-clock YMD in the business tz; advance the calendar directly.
    const [y, m, d] = cursor.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (view === "day") date.setUTCDate(date.getUTCDate() + delta);
    if (view === "week") date.setUTCDate(date.getUTCDate() + 7 * delta);
    if (view === "month") date.setUTCMonth(date.getUTCMonth() + delta);
    setCursor(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-title1 font-semibold tracking-tight">My calendar</h1>
          <p className="text-muted-foreground mt-1">{business.name} · {tz.replace("_", " ")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => shiftCursor(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setCursor(ymdInTz(new Date().toISOString(), tz))}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => shiftCursor(1)}><ArrowRight className="h-4 w-4" /></Button>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card className="p-4 md:p-6">
        {view === "day" && <DayView dateYmd={cursor} bookings={myBookings} tz={tz} businessId={business.id} onPick={setPicked} />}
        {view === "week" && <WeekView dateYmd={cursor} bookings={myBookings} tz={tz} businessId={business.id} onPick={setPicked} />}
        {view === "month" && <MonthView dateYmd={cursor} bookings={myBookings} tz={tz} businessId={business.id} onPick={setPicked} />}
      </Card>

      <BookingPanel booking={picked} onClose={() => setPicked(null)} />
    </div>
  );
}

function dayBookings(bookings: Booking[], ymd: string, tz: string) {
  return bookings.filter((b) => ymdInTz(b.startAt, tz) === ymd && b.status !== "cancelled_by_customer" && b.status !== "cancelled_by_business").sort((a, b) => a.startAt.localeCompare(b.startAt));
}

function DayView({ dateYmd, bookings, tz, businessId, onPick }: { dateYmd: string; bookings: Booking[]; tz: string; businessId: string; onPick: (b: Booking) => void }) {
  const today = dayBookings(bookings, dateYmd, tz);
  const hours = Array.from({ length: 13 }, (_, i) => 8 + i); // 8am to 8pm grid
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title3 font-semibold">{fmtInTz(`${dateYmd}T12:00:00Z`, tz, "EEEE, MMM d")}</h2>
        <span className="text-sm text-muted-foreground">{today.length} booking{today.length === 1 ? "" : "s"}</span>
      </div>
      <div className="relative">
        <div className="grid grid-cols-[60px_1fr] gap-2">
          {hours.map((h) => (
            <div key={h} className="contents">
              <div className="text-[11px] text-muted-foreground tabular-nums uppercase tracking-wider pt-1">{h}:00</div>
              <div className="h-16 border-t border-border" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 grid grid-cols-[60px_1fr] gap-2 pointer-events-none">
          <div />
          <div className="relative">
            {today.map((b) => {
              const sh = parseFloat(fmtInTz(b.startAt, tz, "H")) + parseFloat(fmtInTz(b.startAt, tz, "m")) / 60;
              const eh = parseFloat(fmtInTz(b.endAt, tz, "H")) + parseFloat(fmtInTz(b.endAt, tz, "m")) / 60;
              const top = (sh - 8) * 64;
              const height = Math.max(36, (eh - sh) * 64 - 4);
              const service = listServices(businessId).find((s) => s.id === b.serviceId)!;
              return (
                <motion.button
                  key={b.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => onPick(b)}
                  className="absolute left-0 right-2 rounded-2xl bg-primary/15 border-l-4 border-primary px-3 py-2 text-left pointer-events-auto hover:shadow-soft transition-shadow"
                  style={{ top, height }}
                >
                  <div className="text-xs tabular-nums font-semibold">{fmtInTz(b.startAt, tz, "h:mm a")} – {fmtInTz(b.endAt, tz, "h:mm a")}</div>
                  <div className="text-[13px] font-medium truncate">{service.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{b.customerSnapshot.name}</div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekView({ dateYmd, bookings, tz, businessId, onPick }: { dateYmd: string; bookings: Booking[]; tz: string; businessId: string; onPick: (b: Booking) => void }) {
  const start = new Date(`${dateYmd}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return ymdInTz(d.toISOString(), tz);
  });
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const items = dayBookings(bookings, d, tz);
        return (
          <div key={d} className="rounded-2xl border border-border min-h-[260px] p-2">
            <div className="px-1 mb-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{fmtInTz(`${d}T12:00:00Z`, tz, "EEE")}</div>
              <div className="text-headline font-semibold tabular-nums">{fmtInTz(`${d}T12:00:00Z`, tz, "d")}</div>
            </div>
            <div className="space-y-1.5">
              {items.map((b) => {
                const service = listServices(businessId).find((s) => s.id === b.serviceId)!;
                return (
                  <button key={b.id} onClick={() => onPick(b)} className="w-full text-left rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors p-2 text-xs">
                    <div className="tabular-nums font-semibold">{fmtInTz(b.startAt, tz, "h:mm a")}</div>
                    <div className="font-medium truncate">{service.name}</div>
                    <div className="text-muted-foreground truncate">{b.customerSnapshot.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ dateYmd, bookings, tz, businessId, onPick }: { dateYmd: string; bookings: Booking[]; tz: string; businessId: string; onPick: (b: Booking) => void }) {
  const [y, m] = dateYmd.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const startWd = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: Array<{ ymd: string | null }> = [];
  for (let i = 0; i < startWd; i++) cells.push({ ymd: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ ymd: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  while (cells.length % 7 !== 0) cells.push({ ymd: null });
  const today = ymdInTz(new Date().toISOString(), tz);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="px-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c.ymd) return <div key={i} className="aspect-square" />;
          const items = dayBookings(bookings, c.ymd, tz);
          const isToday = c.ymd === today;
          return (
            <div key={i} className={cn("rounded-2xl border p-2 min-h-[100px]", isToday ? "border-primary bg-primary/5" : "border-border")}>
              <div className="text-sm tabular-nums font-medium">{Number(c.ymd.slice(-2))}</div>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((b) => {
                  const svc = listServices(businessId).find((s) => s.id === b.serviceId)!;
                  return (
                    <button key={b.id} onClick={() => onPick(b)} className="w-full text-left rounded-lg bg-primary/15 hover:bg-primary/20 px-1.5 py-0.5 text-[11px] truncate">
                      <span className="tabular-nums font-medium">{fmtInTz(b.startAt, tz, "h:mma")}</span> {svc.name}
                    </button>
                  );
                })}
                {items.length > 3 && <div className="text-[10px] text-muted-foreground px-1.5">+{items.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookingPanel({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const open = !!booking;
  const business = booking ? getBusiness(booking.businessId) : null;
  const services = booking ? listServices(booking.businessId) : [];
  const service = booking ? services.find((s) => s.id === booking.serviceId) : null;
  void userById;
  const tz = business?.timezone ?? "UTC";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {booking && service && (
          <>
            <DialogHeader>
              <Badge variant={booking.status === "confirmed" ? "confirmed" : booking.status === "completed" ? "completed" : booking.status === "no_show" ? "noshow" : "cancelled"}>
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
              {booking.status === "confirmed" && <>
                <Button onClick={() => { updateBookingStatus(booking.id, "completed"); onClose(); }} className="flex-1"><CheckCircle2 className="h-4 w-4" />Mark complete</Button>
                <Button variant="outline" onClick={() => { updateBookingStatus(booking.id, "no_show"); onClose(); }} className="flex-1"><AlertTriangle className="h-4 w-4" />No-show</Button>
                <Button variant="destructive" onClick={() => { updateBookingStatus(booking.id, "cancelled_by_business"); onClose(); }} className="flex-1"><X className="h-4 w-4" />Cancel</Button>
              </>}
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
