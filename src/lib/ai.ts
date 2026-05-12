/* ---------------------------------------------------------------------
   Local AI simulation. Every helper here returns realistic output sourced
   from a fixture library, with the cadence and shape of a real model call.
   Service-description writing streams character-by-character at ~30 cps.
--------------------------------------------------------------------- */

import { addMinutesIso } from "./time";
import type { Booking } from "./types";

// ---------- Service description writer (streaming) ----------

const SERVICE_DESCRIPTION_FIXTURES: Record<string, string[]> = {
  "Cut & Style": [
    "A precision cut tailored to your hair and how you actually wear it. Includes a deep-conditioning rinse and a blow-out finish you'll be able to recreate at home.",
    "An unhurried 45-minute cut shaped to your face, your texture, and the way mornings actually go. Finish with a smooth blow-out, leave knowing what to ask for next time.",
  ],
  "Single-Process Color": [
    "Refresh your color in a single seating. We mix to your tone, apply with bond-builder, and gloss to seal — leaving hair shinier than when you walked in.",
    "Even, single-tone color for grey coverage or a fresh hue. Bond-builder mixed into every formula. Sixty minutes, glossy finish, no surprises.",
  ],
  "Bath & Brush": [
    "A warm bath, gentle blow-dry, thorough brush-out, and ear cleaning. Calm, unhurried, and tailored to your dog's temperament.",
    "Bath, brush-out, ear clean, and nail file — paced for anxious dogs. We work at the speed your pup is comfortable with.",
  ],
  "Math Tutoring": [
    "One-on-one, 60-minute sessions targeted to where you actually are — no scripts, no busywork. We work the problems you're stuck on and build from there.",
    "Hour-long sessions over video. Bring the homework, the worksheet, or the topic that won't click. We work it through together until it does.",
  ],
  "Balayage": [
    "Hand-painted highlights for dimension that grows in softly. Three to four hours, including toner and a glossy finish. The kind of color that looks better in month three.",
  ],
  "Hot Yoga": [
    "A 75-minute heated flow that meets you on the mat where you are. Modifications offered throughout, no mirrors, and ten minutes of stillness at the end.",
  ],
  "Restorative Yoga": [
    "Long-held supported poses, dim light, no expectations. Sixty minutes of slowing down — ideal for the day you'd rather not move quickly.",
  ],
  "Reading Tutoring": [
    "One-on-one reading sessions for grades 1–5. We start with what's in front of you — the assignment, the page, the word that keeps tripping up — and build confidence from there.",
  ],
  "Full Groom": [
    "Bath, blow-dry, hand-finished cut, nail trim, ear clean, and a bandana or bow. Two hours, calm pacing, no kennel time before or after.",
  ],
};

const GENERIC_FIXTURES: string[] = [
  "A thoughtful session paced to what you actually need. We start with a brief conversation, work through what matters, and leave time at the end to talk about next steps.",
  "Unhurried, focused, and tailored to the person in front of us — not a script. Add the specifics that matter to you and we'll shape it from there.",
  "Quality time, quietly delivered. The kind of session that ends with you knowing exactly what we did and why.",
];

function pickFixture(serviceName: string, durationMinutes: number): string {
  const exact = SERVICE_DESCRIPTION_FIXTURES[serviceName];
  if (exact) return exact[Math.floor(Math.random() * exact.length)];

  const lower = serviceName.toLowerCase();
  for (const [key, samples] of Object.entries(SERVICE_DESCRIPTION_FIXTURES)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return samples[0];
    }
  }
  const generic = GENERIC_FIXTURES[Math.floor(Math.random() * GENERIC_FIXTURES.length)];
  return `${generic} (~${durationMinutes} minutes)`;
}

/** Async iterator — yields the text in growing prefixes at ~30 chars/sec. */
export async function* streamServiceDescription(input: {
  serviceName: string;
  businessTone?: string;
  durationMinutes: number;
}): AsyncGenerator<string, string, void> {
  const text = pickFixture(input.serviceName, input.durationMinutes);
  const charsPerTick = 2;
  const tickMs = Math.round(1000 / (30 / charsPerTick));
  let cursor = 0;
  while (cursor < text.length) {
    cursor = Math.min(text.length, cursor + charsPerTick);
    yield text.slice(0, cursor);
    if (cursor < text.length) {
      await new Promise((r) => setTimeout(r, tickMs));
    }
  }
  return text;
}

/** Non-streaming convenience wrapper (kept for places that just want the final string). */
export async function aiServiceDescription(input: {
  serviceName: string;
  businessTone?: string;
  durationMinutes: number;
}): Promise<string> {
  return pickFixture(input.serviceName, input.durationMinutes);
}

// ---------- No-show risk score ----------

export async function aiNoShowRiskScore(input: {
  customerHistory: { totalBookings: number; noShows: number; lastBookingDaysAgo: number | null };
  leadHours: number;
  depositPaidCents: number;
}): Promise<{ score: number; reason: string }> {
  let score = 5;
  const reasons: string[] = [];
  if (input.customerHistory.noShows > 0) {
    score += input.customerHistory.noShows * 22;
    reasons.push(`${input.customerHistory.noShows} prior no-show${input.customerHistory.noShows > 1 ? "s" : ""}`);
  }
  if (input.leadHours > 24 * 14) { score += 10; reasons.push("booked far in advance"); }
  if (input.depositPaidCents === 0) { score += 12; reasons.push("no deposit"); }
  else { score = Math.max(0, score - 8); reasons.push("deposit paid"); }
  if (input.customerHistory.totalBookings > 4 && input.customerHistory.noShows === 0) {
    score = Math.max(0, score - 14); reasons.push("loyal customer");
  }
  score = Math.min(95, Math.max(2, score));
  return { score, reason: reasons.join(", ") || "no signal" };
}

// ---------- Reschedule suggestions ----------

export async function aiRescheduleSuggestions(input: {
  booking: Booking;
  pastBookings: Booking[];
  available: Array<{ startAt: string; endAt: string }>;
}): Promise<Array<{ startAt: string; endAt: string; rationale: string }>> {
  return input.available.slice(0, 3).map((s, i) => ({
    startAt: s.startAt,
    endAt: s.endAt,
    rationale:
      i === 0 ? "Same day-of-week as your most-booked slot"
      : i === 1 ? "Similar time of day to past appointments"
      : "Earliest opening this week",
  }));
}

// ---------- Smart scheduling assistant (tool-use) ----------

export interface SchedulingProposal {
  summary: string;
  changes: Array<{
    bookingId?: string;
    action: "reschedule" | "cancel" | "block_time" | "create";
    description: string;
    payload?: any;
  }>;
}

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

function findWeekday(lower: string): number | null {
  for (const [name, idx] of Object.entries(WEEKDAY_INDEX)) {
    if (new RegExp(`\\b${name}\\b`).test(lower)) return idx;
  }
  return null;
}

export async function aiSchedulingAssistant(input: {
  businessId: string;
  prompt: string;
  context: { bookings: Booking[]; staff: Array<{ id: string; name: string }>; services: Array<{ id: string; name: string }> };
}): Promise<SchedulingProposal> {
  // Tiny pause for realism — feels like the model is thinking.
  await new Promise((r) => setTimeout(r, 900));

  const lower = input.prompt.toLowerCase();
  const wd = findWeekday(lower);

  // "Block off Tuesday" / "Block next Friday"
  if (/\b(block|hold|close|out of office|ooo)\b/.test(lower) && wd !== null) {
    const dayName = Object.entries(WEEKDAY_INDEX).find(([_, i]) => i === wd)![0];
    return {
      summary: `Block all of next ${capitalize(dayName)} on your calendar.`,
      changes: [{
        action: "block_time",
        description: `Add a full-day blackout for next ${capitalize(dayName)}.`,
      }],
    };
  }

  // "Move all Thursday afternoon appointments to Friday morning"
  if (/\bmove\b/.test(lower) && wd !== null) {
    const targets = input.context.bookings
      .filter((b) => {
        const d = new Date(b.startAt);
        if (d.getUTCDay() !== wd) return false;
        if (/afternoon|pm/.test(lower)) return d.getUTCHours() >= 12;
        if (/morning|am/.test(lower)) return d.getUTCHours() < 12;
        return true;
      })
      .slice(0, 4);
    if (targets.length === 0) {
      return {
        summary: "I couldn't find appointments matching that window. Try widening the time range or check the day.",
        changes: [],
      };
    }
    const shiftMinutes = /morning|am/.test(lower) ? -3 * 60 : 24 * 60 - 3 * 60;
    return {
      summary: `Move ${targets.length} matching appointment${targets.length === 1 ? "" : "s"} to the next opening.`,
      changes: targets.map((b) => ({
        bookingId: b.id,
        action: "reschedule" as const,
        description: `Reschedule ${b.customerSnapshot.name}.`,
        payload: { newStartAt: addMinutesIso(b.startAt, shiftMinutes) },
      })),
    };
  }

  // "Cancel everything on Friday"
  if (/\bcancel\b/.test(lower) && wd !== null) {
    const targets = input.context.bookings.filter((b) => new Date(b.startAt).getUTCDay() === wd).slice(0, 8);
    return {
      summary: `Cancel ${targets.length} appointment${targets.length === 1 ? "" : "s"}.`,
      changes: targets.map((b) => ({
        bookingId: b.id,
        action: "cancel" as const,
        description: `Cancel ${b.customerSnapshot.name}.`,
      })),
    };
  }

  // "How busy am I next week" — informational
  if (/\bhow busy|workload|load|next week\b/.test(lower)) {
    const upcoming = input.context.bookings.filter((b) => {
      const t = new Date(b.startAt).getTime();
      const now = Date.now();
      return t > now && t < now + 7 * 24 * 60 * 60 * 1000;
    }).length;
    return {
      summary: `You have ${upcoming} appointment${upcoming === 1 ? "" : "s"} booked over the next seven days.`,
      changes: [],
    };
  }

  // "Add 30 minutes between every appointment"
  if (/\b(add|insert)\b/.test(lower) && /\bbuffer|between|gap\b/.test(lower)) {
    return {
      summary: "I'd add a 30-minute buffer to every service. Confirm and I'll update each service's `bufferAfter` to 30.",
      changes: [{
        action: "block_time",
        description: "Update all services with a 30-minute post-appointment buffer.",
      }],
    };
  }

  // Fallback — polite, suggests concrete prompts
  return {
    summary:
      "I understood your request but couldn't translate it into a concrete change. Try one of these: " +
      "'Move all Thursday afternoon appointments to Friday morning', 'Block off next Tuesday', " +
      "or 'Cancel everything on Friday'.",
    changes: [],
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
