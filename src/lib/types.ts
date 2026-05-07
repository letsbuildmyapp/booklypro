// Core domain types shared across client + server.

import type { Weekday } from "./time";

export type Role = "customer" | "staff" | "admin" | "superadmin";

export type Tier = "solo" | "team" | "pro";

export interface User {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  avatar?: string;
  timezone: string;
  roles: Role[];
  /** businessIds where the user is staff or admin */
  memberOf?: string[];
  claimedFromGuestAt?: string | null;
  createdAt: string;
}

export interface BrandColors {
  /** OKLCH hue (degrees) used to tint the booking page accent */
  hue: number;
  /** css token name override */
  name?: string;
}

export interface Business {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo?: string;
  heroImage?: string;
  timezone: string;
  address: string;
  phone: string;
  ownerUserId: string;
  staffUserIds: string[];
  status: "active" | "suspended";
  tier: Tier;
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "none";
  stripeCustomerId?: string;
  brandColors: BrandColors;
  cancellationPolicy: { hoursBefore: number; chargePercent: number };
  showPlatformFooter: boolean;
  createdAt: string;
}

export type DepositType = "none" | "percent" | "flat";

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceCents: number;
  depositType: DepositType;
  /** percent (0-100) if depositType="percent", cents if "flat" */
  depositAmount: number;
  eligibleStaffIds: string[];
  eligibleLocationIds: string[];
  /** OKLCH-aware css color label (token name) */
  color: string;
  active: boolean;
  sortOrder: number;
}

export interface Location {
  id: string;
  businessId: string;
  name: string;
  address: string;
  timezone: string;
  active: boolean;
}

export interface StaffProfile {
  id: string;
  userId: string;
  businessId: string;
  displayName: string;
  bio: string;
  avatar: string;
  serviceIds: string[];
  locationIds: string[];
  active: boolean;
  sortOrder: number;
}

export interface AvailabilitySlot { start: string; end: string } // "09:00" / "12:30"

export interface Availability {
  id: string; // staffUserId
  businessId: string;
  weeklySchedule: Record<Weekday, AvailabilitySlot[]>;
  /** YYYY-MM-DD → slots or 'closed' */
  specialDates: Record<string, AvailabilitySlot[] | "closed">;
  timeOff: Array<{ id: string; startAt: string; endAt: string; reason: string }>;
}

export type BookingStatus =
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled_by_customer"
  | "cancelled_by_business"
  | "rescheduled";

export interface Booking {
  id: string;
  businessId: string;
  serviceId: string;
  staffUserId: string;
  locationId: string;
  customerUserId: string;
  customerSnapshot: { name: string; email: string; phone: string };
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: BookingStatus;
  priceCents: number;
  depositPaidCents: number;
  stripePaymentIntentId?: string | null;
  notesFromCustomer?: string;
  notesInternal?: string;
  createdAt: string;
  statusHistory: Array<{ status: BookingStatus; at: string; byUserId?: string }>;
  rescheduledFromBookingId?: string | null;
  reminderSentAt?: { hours24?: string | null; hours2?: string | null };
  noShowRiskScore?: { score: number; reason: string; cachedAt: string };
}

export interface Blackout {
  id: string;
  businessId: string;
  startAt: string;
  endAt: string;
  reason: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  bookingId: string;
  participantIds: string[];
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCounts: Record<string, number>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readBy: string[];
}

export interface Notification {
  id: string;
  userId: string;
  kind:
    | "booking_confirmed"
    | "booking_reminder"
    | "booking_cancelled"
    | "booking_rescheduled"
    | "message"
    | "system";
  title: string;
  body: string;
  link?: string;
  createdAt: string;
  readAt?: string | null;
}

export interface SmsLogEntry {
  id: string;
  businessId: string;
  to: string;
  body: string;
  bookingId?: string;
  createdAt: string;
  status: "stub_logged";
}
