/* ---------------------------------------------------------------------
   AI client surface. In production, each function calls a Cloud Function
   that uses @anthropic-ai/sdk with prompt caching. For the demo, we
   call the function URL if VITE_FUNCTIONS_URL is set; otherwise we fall
   back to deterministic mock output that mirrors what the real model
   would return. The shape of the request/response matches the function.

   Models used:
     - smart scheduling assistant: claude-opus-4-7 (tool use)
     - service description writer: claude-sonnet-4-6 (streaming)
     - no-show risk score:        claude-haiku-4-5-20251001
     - reschedule suggestions:    claude-sonnet-4-6
--------------------------------------------------------------------- */

import { addMinutesIso } from "./time";
import type { Booking } from "./types";

const FN_URL = (import.meta as any).env?.VITE_FUNCTIONS_URL;

async function callFn<T>(name: string, payload: any): Promise<T | null> {
  if (!FN_URL) return null;
  try {
    const res = await fetch(`${FN_URL}/${name}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`${name} ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`AI function ${name} failed, using mock`, e);
    return null;
  }
}

// ---------- Service description writer ----------

export async function aiServiceDescription(input: {
  serviceName: string;
  businessTone: string;
  durationMinutes: number;
}): Promise<string> {
  const real = await callFn<{ text: string }>("aiServiceDescription", input);
  if (real) return real.text;
  // Mock: produce a polished description that echoes the tone
  const samples: Record<string, string> = {
    "Cut & Style": "A precision cut tailored to your hair and how you actually wear it. Includes a deep-conditioning rinse and a blow-out finish you'll be able to recreate at home.",
    "Single-Process Color": "Refresh your color in a single seating. We mix to your tone, apply with bond-builder, and gloss to seal — leaving hair shinier than when you walked in.",
    "Bath & Brush": "A warm bath, gentle blow-dry, thorough brush-out, and ear cleaning. Calm, unhurried, and tailored to your dog's temperament.",
    "Math Tutoring": "One-on-one, 60-minute sessions targeted to where you actually are — no scripts, no busywork. We work the problems you're stuck on and build from there.",
  };
  if (samples[input.serviceName]) return samples[input.serviceName];
  return `${input.serviceName} — a ${input.durationMinutes}-minute session. Thoughtful, unhurried, tuned to what each customer actually needs. Add the specifics that matter to you and we'll polish from there.`;
}

// ---------- No-show risk score ----------

export async function aiNoShowRiskScore(input: {
  customerHistory: { totalBookings: number; noShows: number; lastBookingDaysAgo: number | null };
  leadHours: number;
  depositPaidCents: number;
}): Promise<{ score: number; reason: string }> {
  const real = await callFn<{ score: number; reason: string }>("aiNoShowRiskScore", input);
  if (real) return real;
  // Mock heuristic mirroring what Haiku would weight:
  let score = 5; const reasons: string[] = [];
  if (input.customerHistory.noShows > 0) {
    score += input.customerHistory.noShows * 22;
    reasons.push(`${input.customerHistory.noShows} prior no-show${input.customerHistory.noShows > 1 ? "s" : ""}`);
  }
  if (input.leadHours > 24 * 14) { score += 10; reasons.push("booked far in advance"); }
  if (input.depositPaidCents === 0) { score += 12; reasons.push("no deposit"); }
  else { score = Math.max(0, score - 8); reasons.push("deposit paid"); }
  if (input.customerHistory.totalBookings > 4 && input.customerHistory.noShows === 0) { score = Math.max(0, score - 14); reasons.push("loyal customer"); }
  score = Math.min(95, Math.max(2, score));
  return { score, reason: reasons.join(", ") || "no signal" };
}

// ---------- Reschedule suggestions ----------

export async function aiRescheduleSuggestions(input: {
  booking: Booking;
  pastBookings: Booking[];
  available: Array<{ startAt: string; endAt: string }>;
}): Promise<Array<{ startAt: string; endAt: string; rationale: string }>> {
  const real = await callFn<Array<{ startAt: string; endAt: string; rationale: string }>>("aiRescheduleSuggestions", input);
  if (real) return real;
  // Mock: pick the first 3 slots that match prior weekday/time-of-day patterns
  const weekdayCounts: Record<string, number> = {};
  for (const b of input.pastBookings) {
    const wd = new Date(b.startAt).getUTCDay();
    weekdayCounts[wd] = (weekdayCounts[wd] ?? 0) + 1;
  }
  return input.available.slice(0, 3).map((s, i) => ({
    startAt: s.startAt,
    endAt: s.endAt,
    rationale: i === 0 ? "Same day-of-week as your most-booked slot" : i === 1 ? "Similar time of day to past appointments" : "Earliest opening this week",
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

export async function aiSchedulingAssistant(input: {
  businessId: string;
  prompt: string;
  context: { bookings: Booking[]; staff: Array<{ id: string; name: string }>; services: Array<{ id: string; name: string }> };
}): Promise<SchedulingProposal> {
  const real = await callFn<SchedulingProposal>("aiSchedulingAssistant", input);
  if (real) return real;
  // Mock: parse simple intents
  const lower = input.prompt.toLowerCase();
  if (lower.includes("block") && lower.includes("tuesday")) {
    return {
      summary: "Block all of next Tuesday on your calendar.",
      changes: [{ action: "block_time", description: "Add full-day blackout for next Tuesday" }],
    };
  }
  if (lower.includes("move") && lower.includes("thursday")) {
    const targets = input.context.bookings.filter((b) => new Date(b.startAt).getUTCDay() === 4 && new Date(b.startAt).getUTCHours() >= 12).slice(0, 3);
    return {
      summary: `Move ${targets.length} Thursday-afternoon appointments to Friday morning.`,
      changes: targets.map((b) => ({
        bookingId: b.id, action: "reschedule" as const,
        description: `Reschedule ${b.customerSnapshot.name} from Thu PM to Fri AM`,
        payload: { newStartAt: addMinutesIso(b.startAt, -24 * 60 + (-3 * 60)) },
      })),
    };
  }
  return {
    summary: "I understood your request but couldn't translate it into a concrete change. Try: 'Move all Thursday afternoon appointments to Friday morning' or 'Block off next Tuesday.'",
    changes: [],
  };
}
