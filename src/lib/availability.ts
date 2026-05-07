/* ---------------------------------------------------------------------
   Availability engine. Produces valid start times for a service given:
   weekly schedule, special-date overrides, time-off, blackouts,
   existing bookings (with buffers), location open hours.

   This logic is mirrored in functions/src/availability.ts so the
   serverless version is byte-for-byte equivalent.
--------------------------------------------------------------------- */

import {
  addMinutesIso, diffMinutes, fmtInTz, parseISO, todayYmd,
  WEEKDAYS, weekdayInTz, wallClockToUtc, ymdInTz, type Weekday,
} from "./time";
import type { Availability, Blackout, Booking, Service } from "./types";

export interface AvailabilityRequest {
  service: Service;
  staffIds: string[]; // empty => 'any available'
  locationId: string;
  rangeStart: string; // ISO UTC
  rangeEnd: string;   // ISO UTC
  timezone: string;   // business / location tz
  staffSchedules: Map<string, Availability>;
  bookings: Booking[]; // existing for these staff+location, status=confirmed
  blackouts: Blackout[];
  /** Step in minutes for slot candidates (default = service duration). */
  stepMinutes?: number;
  /** Don't return slots earlier than this many minutes from now. */
  minLeadMinutes?: number;
}

export interface AvailableSlot {
  startAt: string;
  endAt: string;
  staffUserId: string;
}

export function computeAvailability(req: AvailabilityRequest): AvailableSlot[] {
  const step = req.stepMinutes ?? Math.min(30, req.service.durationMinutes);
  const lead = req.minLeadMinutes ?? 30;
  const now = Date.now();
  const minStart = now + lead * 60_000;
  const slots: AvailableSlot[] = [];

  const staffIds = req.staffIds.length
    ? req.staffIds
    : Array.from(req.staffSchedules.keys());

  // Iterate over each day in the range in the business tz
  const startYmd = ymdInTz(req.rangeStart, req.timezone);
  const endYmd = ymdInTz(req.rangeEnd, req.timezone);

  let cursor = startYmd;
  while (cursor <= endYmd) {
    for (const staffId of staffIds) {
      const sched = req.staffSchedules.get(staffId);
      if (!sched) continue;
      const dayWindows = windowsForDay(sched, cursor, req.timezone);
      if (!dayWindows.length) continue;

      for (const w of dayWindows) {
        // walk the window in `step` increments
        let candidate = w.start;
        while (true) {
          const slotEnd = addMinutesIso(candidate, req.service.durationMinutes);
          if (parseISO(slotEnd).getTime() > parseISO(w.end).getTime()) break;
          if (parseISO(candidate).getTime() < minStart) {
            candidate = addMinutesIso(candidate, step);
            continue;
          }
          if (
            !inBlackout(candidate, slotEnd, req.blackouts) &&
            !overlapsExisting(candidate, slotEnd, staffId, req.bookings, req.service)
          ) {
            slots.push({ startAt: candidate, endAt: slotEnd, staffUserId: staffId });
          }
          candidate = addMinutesIso(candidate, step);
        }
      }
    }
    cursor = nextYmd(cursor);
  }

  // Sort by startAt; for "any" mode, keep first staff per start time
  slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
  if (!req.staffIds.length) {
    const seen = new Set<string>();
    return slots.filter((s) => {
      if (seen.has(s.startAt)) return false;
      seen.add(s.startAt);
      return true;
    });
  }
  return slots;
}

function windowsForDay(av: Availability, ymd: string, tz: string): Array<{ start: string; end: string }> {
  // 1. special-date override wins
  const special = av.specialDates[ymd];
  if (special === "closed") return [];
  let baseWindows: Array<{ start: string; end: string }> = [];
  if (Array.isArray(special)) {
    baseWindows = special.map((s) => ({
      start: wallClockToUtc(`${ymd}T${s.start}`, tz),
      end: wallClockToUtc(`${ymd}T${s.end}`, tz),
    }));
  } else {
    // 2. weekly schedule
    const utcMidnight = wallClockToUtc(`${ymd}T00:00`, tz);
    const wd: Weekday = weekdayInTz(utcMidnight, tz);
    const slots = av.weeklySchedule[wd] ?? [];
    baseWindows = slots.map((s) => ({
      start: wallClockToUtc(`${ymd}T${s.start}`, tz),
      end: wallClockToUtc(`${ymd}T${s.end}`, tz),
    }));
  }
  // 3. subtract time-off
  for (const off of av.timeOff) {
    baseWindows = baseWindows.flatMap((w) => subtractInterval(w, off));
  }
  return baseWindows;
}

function subtractInterval(
  win: { start: string; end: string },
  off: { startAt: string; endAt: string }
): Array<{ start: string; end: string }> {
  const ws = parseISO(win.start).getTime();
  const we = parseISO(win.end).getTime();
  const os = parseISO(off.startAt).getTime();
  const oe = parseISO(off.endAt).getTime();
  if (oe <= ws || os >= we) return [win]; // no overlap
  if (os <= ws && oe >= we) return []; // fully consumed
  if (os <= ws && oe < we) return [{ start: new Date(oe).toISOString(), end: win.end }];
  if (os > ws && oe >= we) return [{ start: win.start, end: new Date(os).toISOString() }];
  return [
    { start: win.start, end: new Date(os).toISOString() },
    { start: new Date(oe).toISOString(), end: win.end },
  ];
}

function inBlackout(start: string, end: string, blackouts: Blackout[]) {
  const s = parseISO(start).getTime();
  const e = parseISO(end).getTime();
  return blackouts.some((b) => {
    const bs = parseISO(b.startAt).getTime();
    const be = parseISO(b.endAt).getTime();
    return s < be && e > bs;
  });
}

function overlapsExisting(
  start: string,
  end: string,
  staffId: string,
  bookings: Booking[],
  service: Service
) {
  const candidateStart = parseISO(start).getTime() - service.bufferBeforeMinutes * 60_000;
  const candidateEnd = parseISO(end).getTime() + service.bufferAfterMinutes * 60_000;
  return bookings.some((b) => {
    if (b.staffUserId !== staffId) return false;
    if (b.status !== "confirmed") return false;
    // Existing bookings are buffered too — staff isn't free immediately on either side.
    const bs = parseISO(b.startAt).getTime() - service.bufferBeforeMinutes * 60_000;
    const be = parseISO(b.endAt).getTime() + service.bufferAfterMinutes * 60_000;
    return candidateStart < be && candidateEnd > bs;
  });
}

function nextYmd(ymd: string) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Group slots by date string in tz for the picker UI. */
export function groupByDay(slots: AvailableSlot[], tz: string) {
  const out = new Map<string, AvailableSlot[]>();
  for (const s of slots) {
    const k = ymdInTz(s.startAt, tz);
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(s);
  }
  return out;
}

/** Compute deposit cents given service config + price. */
export function computeDeposit(service: Service): number {
  if (service.depositType === "none") return 0;
  if (service.depositType === "flat") return service.depositAmount;
  return Math.round((service.priceCents * service.depositAmount) / 100);
}

/** Cancellation policy: returns charge cents if cancelling now would trigger fee. */
export function cancellationCharge(
  booking: Booking,
  policy: { hoursBefore: number; chargePercent: number },
  nowMs = Date.now()
): { withinWindow: boolean; chargeCents: number } {
  const startMs = parseISO(booking.startAt).getTime();
  const hoursUntil = (startMs - nowMs) / (1000 * 60 * 60);
  const within = hoursUntil < policy.hoursBefore && hoursUntil >= 0;
  const charge = within ? Math.round((booking.priceCents * policy.chargePercent) / 100) : 0;
  return { withinWindow: within, chargeCents: charge };
}

export { todayYmd, fmtInTz };
