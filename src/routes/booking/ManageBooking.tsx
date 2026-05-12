import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Calendar as CalendarIcon, MessageSquare, X } from "lucide-react";
import { HomeLink } from "@/components/HomeLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtInTz } from "@/lib/time";
import { cancellationCharge } from "@/lib/availability";
import { formatPriceCents } from "@/lib/utils";
import { currentUser, ensureConversation, getBooking, getBusinessBySlug, listServices, listStaff, listLocations, rescheduleBooking, updateBookingStatus } from "@/lib/api";
import NotFoundPage from "@/routes/NotFound";

export default function ManageBookingPage() {
  const { slug = "", bookingId = "" } = useParams();
  const business = getBusinessBySlug(slug);
  const booking = getBooking(bookingId);
  const nav = useNavigate();
  const [_tick, force] = useState(0);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const charge = useMemo(
    () => booking && business
      ? cancellationCharge(booking, business.cancellationPolicy)
      : { withinWindow: false, chargeCents: 0 },
    [booking, business, _tick]
  );
  if (!business || !booking) return <NotFoundPage />;
  const service = listServices(business.id).find((s) => s.id === booking.serviceId)!;
  const staff = listStaff(business.id).find((s) => s.userId === booking.staffUserId);
  const location = listLocations(business.id).find((l) => l.id === booking.locationId)!;
  const policy = business.cancellationPolicy;

  function doCancel() {
    updateBookingStatus(booking!.id, "cancelled_by_customer", booking!.customerUserId);
    toast.success(charge.chargeCents > 0 ? `Booking cancelled. ${formatPriceCents(charge.chargeCents)} charge applied.` : "Booking cancelled. No charge.");
    setConfirmCancelOpen(false);
    // Logged-in customers get sent back to their bookings list; guests stay on this page.
    if (currentUser()) {
      nav("/me/bookings");
    } else {
      force((t) => t + 1);
    }
  }

  return (
    <div className="min-h-screen bg-background bg-grain">
      <header className="container py-6 flex items-center justify-between">
        <HomeLink />
        <ThemeToggle />
      </header>
      <main className="container max-w-2xl pb-20">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to={`/b/${slug}/confirmed/${booking.id}`}><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <h1 className="text-title1 font-semibold tracking-tight">Manage your booking</h1>
        <Card className="mt-6 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant={booking.status === "confirmed" ? "confirmed" : booking.status === "cancelled_by_customer" || booking.status === "cancelled_by_business" ? "cancelled" : "muted"}>
                {booking.status.replace(/_/g, " ")}
              </Badge>
              <h2 className="mt-3 text-title2 font-semibold tracking-tight">{service.name}</h2>
              <p className="text-muted-foreground">{business.name}{staff ? ` · ${staff.displayName}` : ""}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-secondary/50 p-4 text-sm">
            <div className="font-semibold">{fmtInTz(booking.startAt, business.timezone, "EEE, MMM d · h:mm a zzz")}</div>
            <div className="text-muted-foreground">{location.name}</div>
          </div>

          {booking.status === "confirmed" && (
            <div className="mt-6 space-y-3">
              <Button size="lg" variant="outline" className="w-full" onClick={() => {
                // Demo: bump 1 day; production: open availability picker again
                const newStart = new Date(booking.startAt);
                newStart.setUTCDate(newStart.getUTCDate() + 1);
                rescheduleBooking(booking.id, newStart.toISOString(), booking.customerUserId);
                toast.success("Rescheduled to the same time tomorrow (demo)");
                force((t) => t + 1);
              }}>
                <CalendarIcon className="h-4 w-4" /> Reschedule
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => {
                const conv = ensureConversation({
                  businessId: business.id,
                  bookingId: booking.id,
                  participantIds: [booking.customerUserId, business.ownerUserId],
                });
                nav(`/me/messages?c=${conv.id}`);
              }}>
                <MessageSquare className="h-4 w-4" /> Message {business.name}
              </Button>
              <Button size="lg" variant="destructive" className="w-full" onClick={() => setConfirmCancelOpen(true)}>
                <X className="h-4 w-4" /> Cancel booking
              </Button>
            </div>
          )}
        </Card>
      </main>

      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              {charge.withinWindow
                ? <>Cancelling within <b>{policy.hoursBefore} hours</b> of your appointment incurs a <b className="text-destructive">{formatPriceCents(charge.chargeCents)}</b> charge ({policy.chargePercent}% of service).</>
                : <>You're outside the cancellation window. No charge.</>}
            </DialogDescription>
          </DialogHeader>
          {charge.withinWindow && (
            <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 flex gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>Need to skip this fee? Try messaging {business.name} first — most owners are flexible.</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancelOpen(false)}>Keep my booking</Button>
            <Button variant="destructive" onClick={doCancel}>Yes, cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
