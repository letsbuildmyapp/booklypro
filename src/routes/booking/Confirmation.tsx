import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Check, Download, MapPin, MessageSquare, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtInTz } from "@/lib/time";
import { formatDuration, formatPriceCents } from "@/lib/utils";
import { getBooking, getBusinessBySlug, listLocations, listServices, listStaff } from "@/lib/api";
import NotFoundPage from "@/routes/NotFound";

export default function BookingConfirmation() {
  const { slug = "", bookingId = "" } = useParams();
  const business = getBusinessBySlug(slug);
  const booking = getBooking(bookingId);
  if (!business || !booking) return <NotFoundPage />;
  const service = listServices(business.id).find((s) => s.id === booking.serviceId)!;
  const staff = listStaff(business.id).find((s) => s.userId === booking.staffUserId);
  const location = listLocations(business.id).find((l) => l.id === booking.locationId)!;

  const tz = business.timezone;
  const startTitle = fmtInTz(booking.startAt, tz, "EEEE, MMMM d");
  const startTime = fmtInTz(booking.startAt, tz, "h:mm a");
  const endTime = fmtInTz(booking.endAt, tz, "h:mm a");

  const icsHref = buildIcsHref({
    title: `${service.name} · ${business.name}`,
    description: `Your appointment with ${staff?.displayName ?? "any available staff"}.`,
    location: location.address,
    startAt: booking.startAt,
    endAt: booking.endAt,
  });
  const gcalHref = buildGcalHref({
    title: `${service.name} · ${business.name}`,
    details: `Your appointment with ${staff?.displayName ?? "any available staff"}.`,
    location: location.address,
    startAt: booking.startAt,
    endAt: booking.endAt,
  });

  return (
    <div className="min-h-screen bg-background bg-grain">
      <header className="container py-6 flex items-center justify-between">
        <Link to="/"><Logo /></Link>
        <ThemeToggle />
      </header>
      <main className="container max-w-2xl pb-20">
        <motion.div
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.7 }}
          className="mx-auto h-20 w-20 grid place-items-center rounded-3xl bg-primary text-primary-foreground shadow-pillow my-8"
        >
          <Check className="h-10 w-10" strokeWidth={3} />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-largeTitle font-semibold tracking-tight text-center"
        >
          You're booked.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center text-muted-foreground mt-3"
        >
          We sent a confirmation to <span className="font-medium text-foreground">{booking.customerSnapshot.email}</span>.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        >
          <Card className="mt-8 p-6 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge variant="confirmed">Confirmed</Badge>
                <h2 className="mt-3 text-title2 font-semibold tracking-tight">{service.name}</h2>
                <p className="text-muted-foreground">{business.name}{staff ? ` · ${staff.displayName}` : ""}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Booking ID</div>
                <code className="text-xs">{booking.id}</code>
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl bg-secondary/50 p-5">
              <Row icon={<CalendarIcon className="h-4 w-4" />} label={startTitle} value={`${startTime} – ${endTime} ${fmtInTz(booking.startAt, tz, "zzz")}`} />
              <Row icon={<MapPin className="h-4 w-4" />} label={location.name} value={location.address} />
              <Row icon={<ShieldCheck className="h-4 w-4" />} label={`${formatDuration(service.durationMinutes)} · ${formatPriceCents(service.priceCents)}`} value={booking.depositPaidCents > 0 ? `Paid ${formatPriceCents(booking.depositPaidCents)} deposit, ${formatPriceCents(service.priceCents - booking.depositPaidCents)} due at appointment` : "No deposit required"} />
            </div>

            {booking.notesFromCustomer && (
              <div className="mt-4 rounded-2xl border border-border p-4 text-sm">
                <span className="eyebrow text-muted-foreground">Your note</span>
                <p className="mt-1.5">{booking.notesFromCustomer}</p>
              </div>
            )}

            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <Button asChild size="lg" variant="outline">
                <a href={icsHref} download={`${business.slug}-${booking.id}.ics`}>
                  <Download className="h-4 w-4" /> Add to calendar (.ics)
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={gcalHref} target="_blank" rel="noreferrer">
                  <CalendarIcon className="h-4 w-4" /> Google Calendar
                </a>
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild variant="ghost" size="sm">
                <Link to={`/b/${slug}/manage/${booking.id}`}>
                  <MessageSquare className="h-4 w-4" /> Reschedule or cancel
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/me/bookings">View all my bookings</Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{label}</div>
        <div className="text-sm text-muted-foreground">{value}</div>
      </div>
    </div>
  );
}

function buildIcsHref(args: { title: string; description: string; location: string; startAt: string; endAt: string }) {
  const fmt = (s: string) => s.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BooklyPro//EN",
    "BEGIN:VEVENT",
    `UID:${Math.random().toString(36).slice(2)}@booklypro`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(args.startAt)}`,
    `DTEND:${fmt(args.endAt)}`,
    `SUMMARY:${args.title.replace(/,/g, "\\,")}`,
    `DESCRIPTION:${args.description.replace(/,/g, "\\,")}`,
    `LOCATION:${args.location.replace(/,/g, "\\,")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines)}`;
}

function buildGcalHref(args: { title: string; details: string; location: string; startAt: string; endAt: string }) {
  const fmt = (s: string) => s.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", args.title);
  url.searchParams.set("dates", `${fmt(args.startAt)}/${fmt(args.endAt)}`);
  url.searchParams.set("details", args.details);
  url.searchParams.set("location", args.location);
  return url.toString();
}
