/* ---------------------------------------------------------------------
   Public data API surface. UI calls these instead of the store directly.
   In production these would be replaced by Firestore queries / Cloud
   Function calls. Each function name maps 1:1 to a future server path.
--------------------------------------------------------------------- */

import { addMinutesIso, parseISO, ymdInTz } from "./time";
import { getStore, mutate, newId, currentUser as _currentUser, setCurrentUser as _setCurrentUser, subscribe as _subscribe } from "./store";
import type {
  Availability, Blackout, Booking, BookingStatus, Business,
  Conversation, Location, Message, Notification, Service, SmsLogEntry,
  StaffProfile, User, Role, Tier,
} from "./types";
import { browserTimezone } from "./time";
import { computeAvailability, computeDeposit, type AvailableSlot } from "./availability";

export const subscribe = _subscribe;
export const currentUser = _currentUser;
export const setCurrentUser = _setCurrentUser;

// ---------- Auth ----------

export async function signInWithEmail(email: string, _password: string): Promise<User> {
  const s = getStore();
  const u = s.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u) throw new Error("No account with that email. Try one of the seeded accounts (see README).");
  setCurrentUser(u.id);
  return u;
}

export async function signUpCustomer(input: { email: string; displayName: string; phone?: string; password: string }): Promise<User> {
  const s = getStore();
  if (s.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("An account already exists with that email.");
  }
  const id = newId("user");
  const user: User = {
    id, email: input.email, displayName: input.displayName, phone: input.phone,
    timezone: browserTimezone(), roles: ["customer"], createdAt: new Date().toISOString(),
  };
  mutate((s) => { s.users.push(user); });
  setCurrentUser(id);
  return user;
}

export async function signInWithGoogle(): Promise<User> {
  // Stub for the demo: signs in as Ada Reyes (the cross-business demo customer).
  // Production: replace with Firebase signInWithPopup(GoogleAuthProvider).
  const s = getStore();
  const u = s.users.find((x) => x.email === "ada@example.com");
  if (!u) throw new Error("Demo seed missing");
  setCurrentUser(u.id);
  return u;
}

export async function signOut() {
  setCurrentUser(null);
}

/** Auto-create a guest user during a booking. Returns user; later they can claim it via magic link. */
export function getOrCreateGuestCustomer(input: { email: string; name: string; phone: string }): User {
  const s = getStore();
  const existing = s.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
  if (existing) return existing;
  const id = newId("user");
  const user: User = {
    id, email: input.email, displayName: input.name, phone: input.phone,
    timezone: browserTimezone(), roles: ["customer"],
    claimedFromGuestAt: null, createdAt: new Date().toISOString(),
  };
  mutate((s) => { s.users.push(user); });
  return user;
}

// ---------- Businesses ----------

export function listBusinesses(): Business[] { return getStore().businesses; }
export function getBusiness(id: string): Business | undefined { return getStore().businesses.find((b) => b.id === id); }
export function getBusinessBySlug(slug: string): Business | undefined { return getStore().businesses.find((b) => b.slug === slug); }
export function listMemberBusinesses(userId: string): Business[] {
  const s = getStore();
  return s.businesses.filter((b) => b.staffUserIds.includes(userId) || b.ownerUserId === userId);
}

export function updateBusiness(id: string, patch: Partial<Business>) {
  mutate((s) => {
    const idx = s.businesses.findIndex((b) => b.id === id);
    if (idx >= 0) s.businesses[idx] = { ...s.businesses[idx], ...patch };
  });
}

export function setBusinessTier(id: string, tier: Tier) {
  updateBusiness(id, { tier, subscriptionStatus: "active" });
}

// ---------- Services / Staff / Locations ----------

export function listServices(businessId: string): Service[] {
  return getStore().services.filter((s) => s.businessId === businessId).sort((a, b) => a.sortOrder - b.sortOrder);
}
export function listStaff(businessId: string): StaffProfile[] {
  return getStore().staff.filter((s) => s.businessId === businessId).sort((a, b) => a.sortOrder - b.sortOrder);
}
export function listLocations(businessId: string): Location[] {
  return getStore().locations.filter((s) => s.businessId === businessId);
}

export function createService(input: Omit<Service, "id" | "sortOrder"> & { sortOrder?: number }): Service {
  const id = newId("svc");
  const sortOrder = input.sortOrder ?? listServices(input.businessId).length;
  const svc: Service = { id, sortOrder, ...input } as Service;
  mutate((s) => { s.services.push(svc); });
  return svc;
}
export function updateService(id: string, patch: Partial<Service>) {
  mutate((s) => {
    const idx = s.services.findIndex((x) => x.id === id);
    if (idx >= 0) s.services[idx] = { ...s.services[idx], ...patch };
  });
}
export function deleteService(id: string) {
  mutate((s) => { s.services = s.services.filter((x) => x.id !== id); });
}

export function createStaffInvite(args: { businessId: string; email: string; displayName: string; serviceIds: string[]; locationIds: string[] }) {
  // Demo behavior: if a user with that email exists, attach them; else create one.
  const existing = getStore().users.find((u) => u.email.toLowerCase() === args.email.toLowerCase());
  const userId = existing ? existing.id : newId("user");
  if (!existing) {
    const u: User = {
      id: userId, email: args.email, displayName: args.displayName,
      timezone: browserTimezone(), roles: ["staff", "customer"],
      memberOf: [args.businessId], createdAt: new Date().toISOString(),
    };
    mutate((s) => { s.users.push(u); });
  } else {
    mutate((s) => {
      const u = s.users.find((x) => x.id === userId)!;
      if (!u.roles.includes("staff")) u.roles.push("staff");
      u.memberOf = Array.from(new Set([...(u.memberOf ?? []), args.businessId]));
    });
  }
  const profile: StaffProfile = {
    id: newId("staff"), userId, businessId: args.businessId,
    displayName: args.displayName, bio: "", avatar: "",
    serviceIds: args.serviceIds, locationIds: args.locationIds,
    active: true, sortOrder: listStaff(args.businessId).length,
  };
  mutate((s) => {
    s.staff.push(profile);
    const biz = s.businesses.find((b) => b.id === args.businessId)!;
    biz.staffUserIds = Array.from(new Set([...biz.staffUserIds, userId]));
    if (!s.availability.find((a) => a.id === userId && a.businessId === args.businessId)) {
      s.availability.push({
        id: userId, businessId: args.businessId,
        weeklySchedule: { sun: [], mon: [{ start: "09:00", end: "17:00" }], tue: [{ start: "09:00", end: "17:00" }], wed: [{ start: "09:00", end: "17:00" }], thu: [{ start: "09:00", end: "17:00" }], fri: [{ start: "09:00", end: "17:00" }], sat: [] },
        specialDates: {}, timeOff: [],
      });
    }
  });
  return profile;
}

export function createLocation(input: Omit<Location, "id">): Location {
  const id = newId("loc");
  const loc: Location = { id, ...input };
  mutate((s) => { s.locations.push(loc); });
  return loc;
}

// ---------- Availability ----------

export function getStaffAvailability(staffUserId: string, businessId: string): Availability | undefined {
  return getStore().availability.find((a) => a.id === staffUserId && a.businessId === businessId);
}
export function setStaffAvailability(staffUserId: string, businessId: string, patch: Partial<Availability>) {
  mutate((s) => {
    const idx = s.availability.findIndex((a) => a.id === staffUserId && a.businessId === businessId);
    if (idx >= 0) s.availability[idx] = { ...s.availability[idx], ...patch };
    else s.availability.push({ id: staffUserId, businessId, weeklySchedule: { sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] }, specialDates: {}, timeOff: [], ...patch });
  });
}

export function getAvailableSlots(args: {
  businessId: string; serviceId: string; staffUserId?: string | null; locationId?: string | null;
  rangeStart: string; rangeEnd: string;
}): AvailableSlot[] {
  const s = getStore();
  const biz = s.businesses.find((b) => b.id === args.businessId)!;
  const service = s.services.find((x) => x.id === args.serviceId);
  if (!service) return [];
  const tz = (args.locationId && s.locations.find((l) => l.id === args.locationId)?.timezone) || biz.timezone;
  const staffIds = args.staffUserId
    ? [args.staffUserId]
    : service.eligibleStaffIds.filter((id) => s.staff.find((sp) => sp.userId === id && sp.businessId === biz.id && sp.active));
  const staffSchedules = new Map<string, Availability>();
  for (const sid of staffIds) {
    const av = s.availability.find((a) => a.id === sid && a.businessId === biz.id);
    if (av) staffSchedules.set(sid, av);
  }
  const bookings = s.bookings.filter((b) => b.businessId === biz.id);
  const blackouts = s.blackouts.filter((b) => b.businessId === biz.id);
  return computeAvailability({
    service, staffIds: args.staffUserId ? [args.staffUserId] : staffIds,
    locationId: args.locationId ?? service.eligibleLocationIds[0],
    rangeStart: args.rangeStart, rangeEnd: args.rangeEnd, timezone: tz,
    staffSchedules, bookings, blackouts,
    stepMinutes: Math.min(30, service.durationMinutes),
  });
}

// ---------- Bookings ----------

export function listBookings(filter: { businessId?: string; customerUserId?: string; staffUserId?: string }): Booking[] {
  let rows = getStore().bookings;
  if (filter.businessId) rows = rows.filter((b) => b.businessId === filter.businessId);
  if (filter.customerUserId) rows = rows.filter((b) => b.customerUserId === filter.customerUserId);
  if (filter.staffUserId) rows = rows.filter((b) => b.staffUserId === filter.staffUserId);
  return rows.sort((a, b) => a.startAt.localeCompare(b.startAt));
}
export function getBooking(id: string): Booking | undefined { return getStore().bookings.find((b) => b.id === id); }

export function createBooking(input: {
  businessId: string; serviceId: string; staffUserId: string; locationId: string;
  customer: { userId: string; name: string; email: string; phone: string };
  startAt: string;
  notesFromCustomer?: string;
  depositPaidCents?: number;
  stripePaymentIntentId?: string | null;
}): Booking {
  const s = getStore();
  const service = s.services.find((x) => x.id === input.serviceId)!;
  const endAt = addMinutesIso(input.startAt, service.durationMinutes);
  const id = newId("bkg");
  const booking: Booking = {
    id, businessId: input.businessId, serviceId: input.serviceId,
    staffUserId: input.staffUserId, locationId: input.locationId,
    customerUserId: input.customer.userId,
    customerSnapshot: { name: input.customer.name, email: input.customer.email, phone: input.customer.phone },
    startAt: input.startAt, endAt, durationMinutes: service.durationMinutes,
    status: "confirmed", priceCents: service.priceCents,
    depositPaidCents: input.depositPaidCents ?? 0,
    stripePaymentIntentId: input.stripePaymentIntentId ?? null,
    notesFromCustomer: input.notesFromCustomer,
    createdAt: new Date().toISOString(),
    statusHistory: [{ status: "confirmed", at: new Date().toISOString(), byUserId: input.customer.userId }],
    reminderSentAt: {},
  };
  mutate((s) => {
    s.bookings.push(booking);
    s.notifications.push({
      id: newId("notif"), userId: input.customer.userId, kind: "booking_confirmed",
      title: "Booking confirmed", body: `Your appointment is set.`,
      link: `/me/bookings`, createdAt: new Date().toISOString(), readAt: null,
    });
  });
  return booking;
}

export function updateBookingStatus(bookingId: string, status: BookingStatus, byUserId?: string) {
  mutate((s) => {
    const b = s.bookings.find((x) => x.id === bookingId);
    if (!b) return;
    b.status = status;
    b.statusHistory.push({ status, at: new Date().toISOString(), byUserId });
  });
}

export function rescheduleBooking(bookingId: string, newStartAt: string, byUserId?: string): Booking {
  const s = getStore();
  const old = s.bookings.find((b) => b.id === bookingId)!;
  const service = s.services.find((x) => x.id === old.serviceId)!;
  const endAt = addMinutesIso(newStartAt, service.durationMinutes);
  mutate((s) => {
    const b = s.bookings.find((x) => x.id === bookingId)!;
    b.startAt = newStartAt;
    b.endAt = endAt;
    b.statusHistory.push({ status: "rescheduled", at: new Date().toISOString(), byUserId });
  });
  return getStore().bookings.find((x) => x.id === bookingId)!;
}

export function setBookingStaff(bookingId: string, staffUserId: string) {
  mutate((s) => {
    const b = s.bookings.find((x) => x.id === bookingId);
    if (b) b.staffUserId = staffUserId;
  });
}

// ---------- Conversations / Messages ----------

export function listConversationsForUser(userId: string): Conversation[] {
  return getStore().conversations.filter((c) => c.participantIds.includes(userId)).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}
export function listConversationsForBusiness(businessId: string): Conversation[] {
  return getStore().conversations.filter((c) => c.businessId === businessId).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}
export function listMessages(conversationId: string): Message[] {
  return getStore().messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export function sendMessage(conversationId: string, senderId: string, body: string): Message {
  const id = newId("msg");
  const msg: Message = { id, conversationId, senderId, body, createdAt: new Date().toISOString(), readBy: [senderId] };
  mutate((s) => {
    s.messages.push(msg);
    const c = s.conversations.find((x) => x.id === conversationId);
    if (c) {
      c.lastMessageAt = msg.createdAt;
      c.lastMessagePreview = body.slice(0, 80);
      for (const pid of c.participantIds) {
        if (pid !== senderId) c.unreadCounts[pid] = (c.unreadCounts[pid] ?? 0) + 1;
      }
    }
  });
  return msg;
}
export function markConversationRead(conversationId: string, userId: string) {
  mutate((s) => {
    const c = s.conversations.find((x) => x.id === conversationId);
    if (c) c.unreadCounts[userId] = 0;
    for (const m of s.messages) if (m.conversationId === conversationId && !m.readBy.includes(userId)) m.readBy.push(userId);
  });
}
export function ensureConversation(args: { businessId: string; bookingId: string; participantIds: string[] }): Conversation {
  const s = getStore();
  const existing = s.conversations.find((c) => c.bookingId === args.bookingId);
  if (existing) return existing;
  const conv: Conversation = {
    id: newId("conv"), businessId: args.businessId, bookingId: args.bookingId,
    participantIds: args.participantIds, lastMessageAt: new Date().toISOString(),
    lastMessagePreview: "", unreadCounts: {},
  };
  mutate((s) => { s.conversations.push(conv); });
  return conv;
}

// ---------- Notifications ----------

export function listNotifications(userId: string): Notification[] {
  return getStore().notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function markNotificationRead(id: string) {
  mutate((s) => {
    const n = s.notifications.find((x) => x.id === id);
    if (n) n.readAt = new Date().toISOString();
  });
}

// ---------- SMS log (stub for Twilio in real product) ----------

export function logSms(entry: Omit<SmsLogEntry, "id" | "createdAt" | "status">): SmsLogEntry {
  const e: SmsLogEntry = { id: newId("sms"), createdAt: new Date().toISOString(), status: "stub_logged", ...entry };
  mutate((s) => { s.smsLog.push(e); });
  return e;
}

// ---------- Helpers ----------

export function userById(id: string): User | undefined { return getStore().users.find((u) => u.id === id); }
export function staffByUser(userId: string, businessId: string): StaffProfile | undefined {
  return getStore().staff.find((s) => s.userId === userId && s.businessId === businessId);
}
