import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar as CalIcon, MapPin, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createBooking, getBusinessBySlug, listBookings, listLocations, listServices, listStaff,
  setBookingStaff, subscribe, updateBookingStatus, getOrCreateGuestCustomer, rescheduleBooking,
} from "@/lib/api";
import { fmtInTz, ymdInTz, parseISO, addMinutesIso } from "@/lib/time";
import { initials, formatPriceCents, cn } from "@/lib/utils";
import type { Booking } from "@/lib/types";
import { toast } from "sonner";
import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";

type ResourceMode = "staff" | "location";

export default function AdminCalendar() {
  const { bizSlug = "" } = useParams();
  const business = getBusinessBySlug(bizSlug)!;
  const [params] = useSearchParams();
  const [_, force] = useState(0);
  useEffect(() => subscribe(() => force((t) => t + 1)), []);

  const [resource, setResource] = useState<ResourceMode>("staff");
  const [cursor, setCursor] = useState(() => ymdInTz(new Date().toISOString(), business.timezone));
  const [picked, setPicked] = useState<Booking | null>(null);
  const [newOpen, setNewOpen] = useState(params.get("action") === "new");

  const tz = business.timezone;
  const bookings = listBookings({ businessId: business.id });
  const services = listServices(business.id);
  const staff = listStaff(business.id);
  const locations = listLocations(business.id);

  const today = bookings.filter((b) => ymdInTz(b.startAt, tz) === cursor && b.status !== "cancelled_by_customer" && b.status !== "cancelled_by_business");
  const columns = resource === "staff" ? staff.map((s) => ({ id: s.userId, label: s.displayName, avatar: s.avatar })) : locations.map((l) => ({ id: l.id, label: l.name }));

  function shift(delta: number) {
    // Cursor is a wall-clock YMD in the business tz; just advance the calendar day directly.
    const [y, m, d] = cursor.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + delta);
    setCursor(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
    );
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const bookingId = String(e.active.id);
    const data = e.over.data.current as { staffUserId?: string; hour?: number };
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    if (resource === "staff" && data.staffUserId && data.staffUserId !== b.staffUserId) {
      setBookingStaff(bookingId, data.staffUserId);
      toast.success("Reassigned to a different staff member");
    }
    if (typeof data.hour === "number") {
      const start = `${cursor}T${String(data.hour).padStart(2, "0")}:00:00`;
      const utc = new Date(start + "Z").toISOString();
      // Properly convert wall-clock in tz to UTC
      const newStart = new Date(`${cursor}T${String(data.hour).padStart(2, "0")}:00:00Z`).toISOString();
      // Use availability helper for proper tz math
      import("@/lib/time").then(({ wallClockToUtc }) => {
        const isoStart = wallClockToUtc(`${cursor}T${String(data.hour).padStart(2, "0")}:00`, tz);
        rescheduleBooking(bookingId, isoStart);
        force((t) => t + 1);
      });
      void utc; void newStart;
      toast.success("Rescheduled");
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 sm:mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:flex-wrap">
        <div>
          <h1 className="text-title1 font-semibold tracking-tight">Master calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{fmtInTz(`${cursor}T12:00:00Z`, tz, "EEEE, MMMM d")} · {tz.replace("_", " ")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous day"><ArrowLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(ymdInTz(new Date().toISOString(), tz))}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next day"><ArrowRight className="h-4 w-4" /></Button>
          <Tabs value={resource} onValueChange={(v) => setResource(v as ResourceMode)} className="hidden sm:block">
            <TabsList>
              <TabsTrigger value="staff">By staff</TabsTrigger>
              <TabsTrigger value="location">By location</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setNewOpen(true)} size="sm"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">New booking</span><span className="sm:hidden">New</span></Button>
        </div>
      </div>

      {/* Mobile-only: agenda list */}
      <div className="md:hidden">
        <MobileAgenda bookings={today} services={services} staff={staff} locations={locations} tz={tz} onPick={setPicked} />
      </div>

      {/* md+ : resource grid with drag-to-reassign */}
      <div className="hidden md:block">
        <DndContext onDragEnd={onDragEnd}>
          <Card className="p-0 overflow-x-auto">
            <div className="min-w-[800px] grid" style={{ gridTemplateColumns: `60px repeat(${columns.length}, minmax(160px, 1fr))` }}>
              <div className="" />
              {columns.map((c) => (
                <div key={c.id} className="border-b border-l border-border p-3">
                  <div className="flex items-center gap-2">
                    {"avatar" in c && (
                      <Avatar className="h-7 w-7"><AvatarImage src={(c as any).avatar} />{<AvatarFallback className="text-[10px]">{initials(c.label)}</AvatarFallback>}</Avatar>
                    )}
                    <span className="text-sm font-semibold">{c.label}</span>
                  </div>
                </div>
              ))}
              {Array.from({ length: 13 }, (_, i) => 8 + i).map((h) => (
                <ResourceRow key={h} hour={h} columns={columns} bookings={today} resource={resource} services={services} tz={tz} onPick={setPicked} businessId={business.id} />
              ))}
            </div>
          </Card>
        </DndContext>
      </div>

      <NewBookingDialog open={newOpen} onClose={() => setNewOpen(false)} businessId={business.id} tz={tz} />

      <BookingPanel booking={picked} onClose={() => setPicked(null)} services={services} tz={tz} />
    </div>
  );
}

function MobileAgenda({
  bookings, services, staff, locations, tz, onPick,
}: {
  bookings: Booking[];
  services: ReturnType<typeof listServices>;
  staff: ReturnType<typeof listStaff>;
  locations: ReturnType<typeof listLocations>;
  tz: string;
  onPick: (b: Booking) => void;
}) {
  const sorted = useMemo(
    () => bookings.slice().sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [bookings],
  );

  if (sorted.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        <CalIcon className="h-7 w-7 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nothing on the calendar this day.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((b) => {
        const svc = services.find((s) => s.id === b.serviceId);
        const sp = staff.find((s) => s.userId === b.staffUserId);
        const loc = locations.find((l) => l.id === b.locationId);
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onPick(b)}
            className="block w-full text-left rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors p-3"
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-14 tabular-nums">
                <div className="text-sm font-semibold">{fmtInTz(b.startAt, tz, "h:mm")}</div>
                <div className="text-[11px] text-muted-foreground uppercase">{fmtInTz(b.startAt, tz, "a")}</div>
              </div>
              <div className="h-12 w-1 rounded-full bg-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{svc?.name ?? "Service"}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                  <User className="h-3 w-3" /> {b.customerSnapshot.name}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  {sp && (
                    <span className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        {sp.avatar && <AvatarImage src={sp.avatar} alt="" />}
                        <AvatarFallback className="text-[8px]">{initials(sp.displayName)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{sp.displayName}</span>
                    </span>
                  )}
                  {loc && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /><span className="truncate">{loc.name}</span></span>}
                </div>
              </div>
              <Badge
                variant={b.status === "confirmed" ? "confirmed" : b.status === "completed" ? "completed" : b.status === "no_show" ? "noshow" : "cancelled"}
                className="shrink-0 text-[10px]"
              >
                {b.status === "confirmed" ? "On" : b.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ResourceRow({ hour, columns, bookings, resource, services, tz, onPick, businessId }: any) {
  return (
    <>
      <div className="border-b border-border p-2 text-[11px] text-muted-foreground tabular-nums uppercase tracking-wider">{hour}:00</div>
      {columns.map((col: any) => {
        const items = bookings.filter((b: Booking) => {
          const colMatch = resource === "staff" ? b.staffUserId === col.id : b.locationId === col.id;
          if (!colMatch) return false;
          const hh = parseInt(fmtInTz(b.startAt, tz, "H"));
          return hh === hour;
        });
        return <Cell key={col.id} hour={hour} colId={col.id} items={items} services={services} tz={tz} resource={resource} onPick={onPick} businessId={businessId} />;
      })}
    </>
  );
}

function Cell({ hour, colId, items, services, tz, resource, onPick }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${resource}-${colId}-${hour}`,
    data: { staffUserId: resource === "staff" ? colId : undefined, locationId: resource === "location" ? colId : undefined, hour },
  });
  return (
    <div ref={setNodeRef} className={cn("relative border-b border-l border-border min-h-[64px] p-1", isOver && "bg-primary/10")}>
      {items.map((b: Booking) => (
        <DraggableBooking key={b.id} booking={b} services={services} tz={tz} onPick={onPick} />
      ))}
    </div>
  );
}

function DraggableBooking({ booking, services, tz, onPick }: any) {
  const svc = services.find((s: any) => s.id === booking.serviceId);
  const { setNodeRef, attributes, listeners, transform } = useDraggable({ id: booking.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onPick(booking)}
      className="rounded-xl bg-primary/15 border-l-4 border-primary px-2 py-1.5 text-xs hover:bg-primary/25 cursor-grab active:cursor-grabbing transition-colors"
    >
      <div className="tabular-nums font-semibold">{fmtInTz(booking.startAt, tz, "h:mm a")}</div>
      <div className="font-medium truncate">{svc?.name}</div>
      <div className="text-muted-foreground truncate">{booking.customerSnapshot.name}</div>
    </div>
  );
}

function NewBookingDialog({ open, onClose, businessId, tz }: { open: boolean; onClose: () => void; businessId: string; tz: string }) {
  const services = listServices(businessId);
  const staff = listStaff(businessId);
  const locations = listLocations(businessId);

  const [serviceId, setServiceId] = useState<string>(services[0]?.id ?? "");
  const [staffUserId, setStaffUserId] = useState<string>(staff[0]?.userId ?? "");
  const [locationId, setLocationId] = useState<string>(locations[0]?.id ?? "");
  const [date, setDate] = useState(ymdInTz(new Date().toISOString(), tz));
  const [time, setTime] = useState("10:00");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  async function submit() {
    if (!name || !email) { toast.error("Name and email required"); return; }
    const { wallClockToUtc } = await import("@/lib/time");
    const startAt = wallClockToUtc(`${date}T${time}`, tz);
    const customer = getOrCreateGuestCustomer({ name, email, phone });
    createBooking({
      businessId, serviceId, staffUserId, locationId,
      customer: { userId: customer.id, name, email, phone },
      startAt, notesFromCustomer: notes || undefined,
    });
    toast.success("Booking created");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>Phone-in customer? Manual override? Create it here.</DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {formatPriceCents(s.priceCents)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Staff</Label>
            <Select value={staffUserId} onValueChange={setStaffUserId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {staff.map((s) => <SelectItem key={s.userId} value={s.userId}>{s.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Customer name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Notes (internal)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Create booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BookingPanel({ booking, onClose, services, tz }: { booking: Booking | null; onClose: () => void; services: any[]; tz: string }) {
  const open = !!booking;
  const service = booking ? services.find((s) => s.id === booking.serviceId) : null;
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
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{booking.customerSnapshot.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{booking.customerSnapshot.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{booking.customerSnapshot.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-medium tabular-nums">{formatPriceCents(booking.priceCents)}</span></div>
              {booking.depositPaidCents > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Deposit paid</span><span className="font-medium tabular-nums">{formatPriceCents(booking.depositPaidCents)}</span></div>}
            </div>
            <DialogFooter>
              {booking.status === "confirmed" && <>
                <Button variant="outline" onClick={() => { updateBookingStatus(booking.id, "no_show"); onClose(); }}>No-show</Button>
                <Button variant="destructive" onClick={() => { updateBookingStatus(booking.id, "cancelled_by_business"); onClose(); }}>Cancel</Button>
                <Button onClick={() => { updateBookingStatus(booking.id, "completed"); onClose(); }}>Mark complete</Button>
              </>}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
