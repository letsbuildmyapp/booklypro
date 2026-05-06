// Helpers for slot generation, conflict detection, and create/update/cancel bookings.

import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import type { Booking, Service, Staff } from './types';

export const SLOT_INTERVAL_MIN = 30;

export function dayOfWeek(ms: number) { return new Date(ms).getDay(); }
export function startOfDayMs(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
export function addMin(ms: number, m: number) { return ms + m * 60_000; }

export function timeOfDayMin(ms: number) {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

export interface SlotOption {
  startAt: number;
  endAt: number;
  staff: Staff;
}

/**
 * Generate available slots on `dayMs` for `service` with the given `staff` (or any if "any").
 * Excludes any time that overlaps an existing non-canceled booking for the staff.
 */
export function generateSlots(
  dayMs: number,
  service: Service,
  staffList: Staff[],
  bookings: Booking[],
  staffPreference: string | 'any',
): SlotOption[] {
  const dayStart = startOfDayMs(dayMs);
  const dow = new Date(dayStart).getDay();

  // Eligible staff: filtered by service.staffIds AND availability on this dow.
  const eligible = staffList.filter((s) => {
    if (!service.staffIds.includes(s.id)) return false;
    if (staffPreference !== 'any' && s.id !== staffPreference) return false;
    return s.availability.some((a) => a.dow === dow);
  });

  const conflicts = bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed');

  const slots: SlotOption[] = [];
  for (const s of eligible) {
    const window = s.availability.find((a) => a.dow === dow);
    if (!window) continue;
    for (let t = window.startMin; t + service.durationMin <= window.endMin; t += SLOT_INTERVAL_MIN) {
      const startAt = dayStart + t * 60_000;
      const endAt = startAt + service.durationMin * 60_000;
      // Conflict: any booking for this staff that overlaps [startAt, endAt)
      const conflict = conflicts.some(
        (b) => b.staffId === s.id && b.startAt < endAt && b.endAt > startAt,
      );
      if (conflict) continue;
      // Don't allow slots in the past
      if (startAt < Date.now()) continue;
      slots.push({ startAt, endAt, staff: s });
    }
  }

  // Sort by startAt, then collapse duplicates by time (when staffPreference === 'any', keep first staff).
  slots.sort((a, b) => a.startAt - b.startAt || a.staff.name.localeCompare(b.staff.name));
  if (staffPreference === 'any') {
    const seen = new Set<number>();
    const dedup: SlotOption[] = [];
    for (const s of slots) {
      if (seen.has(s.startAt)) continue;
      seen.add(s.startAt);
      dedup.push(s);
    }
    return dedup;
  }
  return slots;
}

interface CreateBookingArgs {
  service: Service;
  staff: Staff;
  customerUid: string;
  customerName: string;
  customerEmail: string;
  startAt: number;
  endAt: number;
  notes?: string;
}

export async function createBooking(args: CreateBookingArgs) {
  const data = {
    serviceId: args.service.id,
    staffId: args.staff.id,
    locationId: args.staff.locationId,
    customerUid: args.customerUid,
    customerName: args.customerName,
    customerEmail: args.customerEmail,
    startAt: args.startAt,
    endAt: args.endAt,
    status: 'confirmed' as const,
    notes: args.notes ?? '',
    priceCents: args.service.priceCents,
    createdAt: Date.now(),
  };
  const docRef = await addDoc(collection(db, 'bookings'), data);
  await updateDoc(doc(db, 'bookings', docRef.id), { id: docRef.id });
  return { ...data, id: docRef.id };
}

export async function cancelBooking(id: string) {
  await updateDoc(doc(db, 'bookings', id), { status: 'canceled' });
}

export async function completeBooking(id: string) {
  await updateDoc(doc(db, 'bookings', id), { status: 'completed' });
}

export async function rescheduleBooking(id: string, startAt: number, endAt: number) {
  await updateDoc(doc(db, 'bookings', id), { startAt, endAt });
}

interface SendEmailArgs {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  staffName: string;
  locationName: string;
  locationAddress: string;
  startAt: number;
  durationMin: number;
  priceCents: number;
  type?: 'confirmation' | 'cancellation' | 'reschedule';
}

export async function sendBookingEmail(args: SendEmailArgs) {
  try {
    const fn = httpsCallable(functions, 'sendBookingEmail');
    const res = await fn(args);
    return res.data as { delivered: boolean; mocked?: boolean; subject?: string };
  } catch (e) {
    console.warn('[sendBookingEmail] failed', e);
    return { delivered: false, mocked: true };
  }
}
