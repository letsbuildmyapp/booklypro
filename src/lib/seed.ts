/* ---------------------------------------------------------------------
   Seed data factory — produces a complete tenant ecosystem on first run.
   Real-feeling businesses, services, staff, schedules, bookings.
   Mirrors what scripts/seed.ts writes to Firestore in staging.
--------------------------------------------------------------------- */

import type {
  Availability,
  Booking,
  BookingStatus,
  Business,
  Conversation,
  Location,
  Message,
  Notification,
  Service,
  StaffProfile,
  User,
} from "./types";
import { addMinutesIso, ymdInTz, wallClockToUtc, range } from "./time";
import { nanoid } from "./id";

const TZ_NY = "America/New_York";
const TZ_LA = "America/Los_Angeles";
const TZ_CHI = "America/Chicago";

function id(prefix: string) {
  return `${prefix}_${nanoid(10)}`;
}

function dateOffset(daysFromToday: number, tz: string, hh: number, mm: number) {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + daysFromToday);
  const ymd = ymdInTz(now.toISOString(), tz);
  const hhmm = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  return wallClockToUtc(`${ymd}T${hhmm}`, tz);
}

const STOCK = {
  // Unsplash IDs picked for warm consumer-y feel
  salon: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80&auto=format&fit=crop",
  yoga: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=1600&q=80&auto=format&fit=crop",
  tutor: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600&q=80&auto=format&fit=crop",
  groomer: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1600&q=80&auto=format&fit=crop",
  avatars: [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&q=80",
  ],
};

function defaultWeekly(): Availability["weeklySchedule"] {
  return {
    sun: [],
    mon: [{ start: "09:00", end: "17:00" }],
    tue: [{ start: "09:00", end: "17:00" }],
    wed: [{ start: "09:00", end: "17:00" }],
    thu: [{ start: "09:00", end: "19:00" }],
    fri: [{ start: "09:00", end: "19:00" }],
    sat: [{ start: "10:00", end: "16:00" }],
  };
}

export function seedAll(): {
  users: User[];
  businesses: Business[];
  services: Service[];
  locations: Location[];
  staff: StaffProfile[];
  availability: Availability[];
  bookings: Booking[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
} {
  const users: User[] = [];
  const businesses: Business[] = [];
  const services: Service[] = [];
  const locations: Location[] = [];
  const staff: StaffProfile[] = [];
  const availability: Availability[] = [];
  const bookings: Booking[] = [];
  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  const notifications: Notification[] = [];

  const now = new Date().toISOString();

  // -------- Super-admin --------
  const superAdmin: User = {
    id: "user_superadmin",
    email: "platform@booklypro.app",
    displayName: "Platform Admin",
    timezone: TZ_NY,
    roles: ["superadmin"],
    avatar: STOCK.avatars[7],
    createdAt: now,
  };
  users.push(superAdmin);

  // -------- Customer (cross-business) --------
  const customer: User = {
    id: "user_customer_demo",
    email: "ada@example.com",
    displayName: "Ada Reyes",
    phone: "+1 555 0123",
    timezone: TZ_NY,
    roles: ["customer"],
    avatar: STOCK.avatars[0],
    createdAt: now,
  };
  users.push(customer);

  // Extra customers for coverage
  const extraCustomers: User[] = [
    { id: id("user"), email: "marcus@example.com", displayName: "Marcus Lee", phone: "+1 555 0144", timezone: TZ_NY, roles: ["customer"], avatar: STOCK.avatars[4], createdAt: now },
    { id: id("user"), email: "priya@example.com", displayName: "Priya Patel", phone: "+1 555 0188", timezone: TZ_NY, roles: ["customer"], avatar: STOCK.avatars[5], createdAt: now },
    { id: id("user"), email: "noah@example.com", displayName: "Noah Brooks", phone: "+1 555 0177", timezone: TZ_LA, roles: ["customer"], avatar: STOCK.avatars[6], createdAt: now },
  ];
  users.push(...extraCustomers);

  // ---------------- Business 1: Bloom & Co. Salon (Team tier, NYC) ----------------
  const salonOwner: User = {
    id: id("user"),
    email: "owner@bloomandco.salon",
    displayName: "Maya Bloom",
    phone: "+1 555 0200",
    timezone: TZ_NY,
    roles: ["admin", "staff", "customer"],
    avatar: STOCK.avatars[0],
    createdAt: now,
  };
  const salonStylist1: User = {
    id: id("user"),
    email: "rosa@bloomandco.salon",
    displayName: "Rosa Mendez",
    phone: "+1 555 0201",
    timezone: TZ_NY,
    roles: ["staff", "customer"],
    avatar: STOCK.avatars[2],
    createdAt: now,
  };
  const salonStylist2: User = {
    id: id("user"),
    email: "kai@bloomandco.salon",
    displayName: "Kai Tanaka",
    phone: "+1 555 0202",
    timezone: TZ_NY,
    roles: ["staff", "customer"],
    avatar: STOCK.avatars[1],
    createdAt: now,
  };
  users.push(salonOwner, salonStylist1, salonStylist2);

  const salon: Business = {
    id: id("biz"),
    slug: "bloom-and-co",
    name: "Bloom & Co. Salon",
    description: "A small Brooklyn salon focused on healthy hair, color expertise, and an unhurried chair. Walk in tired, walk out lit up.",
    logo: undefined,
    heroImage: STOCK.salon,
    timezone: TZ_NY,
    address: "412 Atlantic Ave, Brooklyn, NY 11217",
    phone: "+1 718 555 0200",
    ownerUserId: salonOwner.id,
    staffUserIds: [salonOwner.id, salonStylist1.id, salonStylist2.id],
    status: "active",
    tier: "team",
    subscriptionStatus: "active",
    stripeCustomerId: "cus_demo_salon",
    brandColors: { hue: 12 }, // coral-leaning
    cancellationPolicy: { hoursBefore: 24, chargePercent: 50 },
    showPlatformFooter: true,
    createdAt: now,
  };
  businesses.push(salon);
  salonOwner.memberOf = [salon.id];
  salonStylist1.memberOf = [salon.id];
  salonStylist2.memberOf = [salon.id];

  const salonLoc: Location = {
    id: id("loc"),
    businessId: salon.id,
    name: "Atlantic Ave Studio",
    address: "412 Atlantic Ave, Brooklyn, NY 11217",
    timezone: TZ_NY,
    active: true,
  };
  locations.push(salonLoc);

  const salonServices: Service[] = [
    {
      id: id("svc"), businessId: salon.id, name: "Cut & Style",
      description: "Precision cut, blow-out finish. Includes a deep-conditioning rinse.",
      durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 15,
      priceCents: 9500, depositType: "percent", depositAmount: 25,
      eligibleStaffIds: [salonOwner.id, salonStylist1.id, salonStylist2.id],
      eligibleLocationIds: [salonLoc.id],
      color: "primary", active: true, sortOrder: 0,
    },
    {
      id: id("svc"), businessId: salon.id, name: "Single-Process Color",
      description: "Root touch-up or all-over color with bond-builder finish.",
      durationMinutes: 90, bufferBeforeMinutes: 0, bufferAfterMinutes: 15,
      priceCents: 14500, depositType: "percent", depositAmount: 25,
      eligibleStaffIds: [salonOwner.id, salonStylist1.id],
      eligibleLocationIds: [salonLoc.id],
      color: "accent", active: true, sortOrder: 1,
    },
    {
      id: id("svc"), businessId: salon.id, name: "Balayage",
      description: "Hand-painted lightening for a soft, lived-in finish. Includes gloss.",
      durationMinutes: 180, bufferBeforeMinutes: 0, bufferAfterMinutes: 15,
      priceCents: 28500, depositType: "flat", depositAmount: 5000,
      eligibleStaffIds: [salonOwner.id],
      eligibleLocationIds: [salonLoc.id],
      color: "rescheduled", active: true, sortOrder: 2,
    },
    {
      id: id("svc"), businessId: salon.id, name: "Express Trim",
      description: "Quick clean-up between full cuts.",
      durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 5,
      priceCents: 4500, depositType: "none", depositAmount: 0,
      eligibleStaffIds: [salonOwner.id, salonStylist1.id, salonStylist2.id],
      eligibleLocationIds: [salonLoc.id],
      color: "completed", active: true, sortOrder: 3,
    },
  ];
  services.push(...salonServices);

  staff.push(
    { id: id("staff"), userId: salonOwner.id, businessId: salon.id, displayName: "Maya Bloom", bio: "Owner. 15 years behind the chair. Color specialist.", avatar: STOCK.avatars[0], serviceIds: salonServices.map((s) => s.id), locationIds: [salonLoc.id], active: true, sortOrder: 0 },
    { id: id("staff"), userId: salonStylist1.id, businessId: salon.id, displayName: "Rosa Mendez", bio: "Senior stylist. Curls, fringe, and fearless cuts.", avatar: STOCK.avatars[2], serviceIds: [salonServices[0].id, salonServices[1].id, salonServices[3].id], locationIds: [salonLoc.id], active: true, sortOrder: 1 },
    { id: id("staff"), userId: salonStylist2.id, businessId: salon.id, displayName: "Kai Tanaka", bio: "Junior stylist. Loves a clean classic cut.", avatar: STOCK.avatars[1], serviceIds: [salonServices[0].id, salonServices[3].id], locationIds: [salonLoc.id], active: true, sortOrder: 2 }
  );

  for (const u of [salonOwner, salonStylist1, salonStylist2]) {
    availability.push({
      id: u.id,
      businessId: salon.id,
      weeklySchedule: defaultWeekly(),
      specialDates: {},
      timeOff: [],
    });
  }

  // ---------------- Business 2: Stillwater Yoga (Pro tier, LA) ----------------
  const yogaOwner: User = { id: id("user"), email: "owner@stillwateryoga.com", displayName: "Devi Saito", phone: "+1 555 0301", timezone: TZ_LA, roles: ["admin", "staff", "customer"], avatar: STOCK.avatars[3], createdAt: now };
  const yogaInst: User = { id: id("user"), email: "river@stillwateryoga.com", displayName: "River Okafor", phone: "+1 555 0302", timezone: TZ_LA, roles: ["staff", "customer"], avatar: STOCK.avatars[4], createdAt: now };
  users.push(yogaOwner, yogaInst);

  const yoga: Business = {
    id: id("biz"),
    slug: "stillwater",
    name: "Stillwater Yoga",
    description: "A neighborhood studio in Silver Lake. Slow flow, breath-led, no mirrors, no judgment.",
    heroImage: STOCK.yoga,
    timezone: TZ_LA,
    address: "2014 Sunset Blvd, Los Angeles, CA 90026",
    phone: "+1 213 555 0300",
    ownerUserId: yogaOwner.id,
    staffUserIds: [yogaOwner.id, yogaInst.id],
    status: "active",
    tier: "pro",
    subscriptionStatus: "active",
    stripeCustomerId: "cus_demo_yoga",
    brandColors: { hue: 152 },
    cancellationPolicy: { hoursBefore: 12, chargePercent: 100 },
    showPlatformFooter: false,
    createdAt: now,
  };
  businesses.push(yoga);
  yogaOwner.memberOf = [yoga.id];
  yogaInst.memberOf = [yoga.id];

  const yogaLoc: Location = { id: id("loc"), businessId: yoga.id, name: "Silver Lake Studio", address: "2014 Sunset Blvd, LA 90026", timezone: TZ_LA, active: true };
  locations.push(yogaLoc);

  const yogaServices: Service[] = [
    { id: id("svc"), businessId: yoga.id, name: "Drop-in Class", description: "60-min slow flow class for all levels.", durationMinutes: 60, bufferBeforeMinutes: 10, bufferAfterMinutes: 10, priceCents: 2400, depositType: "flat", depositAmount: 2400, eligibleStaffIds: [yogaOwner.id, yogaInst.id], eligibleLocationIds: [yogaLoc.id], color: "primary", active: true, sortOrder: 0 },
    { id: id("svc"), businessId: yoga.id, name: "Private Session", description: "1:1 instruction tailored to your goals.", durationMinutes: 75, bufferBeforeMinutes: 15, bufferAfterMinutes: 15, priceCents: 11500, depositType: "percent", depositAmount: 50, eligibleStaffIds: [yogaOwner.id, yogaInst.id], eligibleLocationIds: [yogaLoc.id], color: "accent", active: true, sortOrder: 1 },
    { id: id("svc"), businessId: yoga.id, name: "Beginner Series Intake", description: "30-min consultation for first-time students.", durationMinutes: 30, bufferBeforeMinutes: 5, bufferAfterMinutes: 10, priceCents: 0, depositType: "none", depositAmount: 0, eligibleStaffIds: [yogaOwner.id], eligibleLocationIds: [yogaLoc.id], color: "completed", active: true, sortOrder: 2 },
  ];
  services.push(...yogaServices);

  staff.push(
    { id: id("staff"), userId: yogaOwner.id, businessId: yoga.id, displayName: "Devi Saito", bio: "RYT-500. Founded Stillwater in 2018.", avatar: STOCK.avatars[3], serviceIds: yogaServices.map((s) => s.id), locationIds: [yogaLoc.id], active: true, sortOrder: 0 },
    { id: id("staff"), userId: yogaInst.id, businessId: yoga.id, displayName: "River Okafor", bio: "Yin and restorative specialist.", avatar: STOCK.avatars[4], serviceIds: [yogaServices[0].id, yogaServices[1].id], locationIds: [yogaLoc.id], active: true, sortOrder: 1 }
  );

  for (const u of [yogaOwner, yogaInst]) {
    availability.push({ id: u.id, businessId: yoga.id, weeklySchedule: defaultWeekly(), specialDates: {}, timeOff: [] });
  }

  // ---------------- Business 3: Northbridge Tutors (Solo tier, Chicago) ----------------
  const tutorOwner: User = { id: id("user"), email: "owner@northbridgetutors.com", displayName: "Daniel Park", phone: "+1 555 0401", timezone: TZ_CHI, roles: ["admin", "staff", "customer"], avatar: STOCK.avatars[5], createdAt: now };
  users.push(tutorOwner);

  const tutoring: Business = {
    id: id("biz"),
    slug: "northbridge-tutors",
    name: "Northbridge Tutors",
    description: "Math and SAT prep for high schoolers in Chicago's North Shore. One-on-one, no scripts.",
    heroImage: STOCK.tutor,
    timezone: TZ_CHI,
    address: "Online + 1532 Sherman Ave, Evanston, IL 60201",
    phone: "+1 312 555 0400",
    ownerUserId: tutorOwner.id,
    staffUserIds: [tutorOwner.id],
    status: "active",
    tier: "solo",
    subscriptionStatus: "trialing",
    stripeCustomerId: "cus_demo_tutor",
    brandColors: { hue: 220 },
    cancellationPolicy: { hoursBefore: 24, chargePercent: 0 },
    showPlatformFooter: true,
    createdAt: now,
  };
  businesses.push(tutoring);
  tutorOwner.memberOf = [tutoring.id];

  const tutorLoc: Location = { id: id("loc"), businessId: tutoring.id, name: "Online (Zoom)", address: "Remote", timezone: TZ_CHI, active: true };
  locations.push(tutorLoc);

  const tutorServices: Service[] = [
    { id: id("svc"), businessId: tutoring.id, name: "Math Tutoring", description: "Algebra II through calculus. 60-min sessions.", durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, priceCents: 8500, depositType: "none", depositAmount: 0, eligibleStaffIds: [tutorOwner.id], eligibleLocationIds: [tutorLoc.id], color: "primary", active: true, sortOrder: 0 },
    { id: id("svc"), businessId: tutoring.id, name: "SAT Prep Block", description: "90-min focused SAT prep with weekly practice plan.", durationMinutes: 90, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, priceCents: 12000, depositType: "none", depositAmount: 0, eligibleStaffIds: [tutorOwner.id], eligibleLocationIds: [tutorLoc.id], color: "accent", active: true, sortOrder: 1 },
  ];
  services.push(...tutorServices);

  staff.push({ id: id("staff"), userId: tutorOwner.id, businessId: tutoring.id, displayName: "Daniel Park", bio: "Former Kumon instructor. UChicago math '17.", avatar: STOCK.avatars[5], serviceIds: tutorServices.map((s) => s.id), locationIds: [tutorLoc.id], active: true, sortOrder: 0 });
  availability.push({ id: tutorOwner.id, businessId: tutoring.id, weeklySchedule: { sun: [], mon: [{ start: "16:00", end: "20:00" }], tue: [{ start: "16:00", end: "20:00" }], wed: [{ start: "16:00", end: "20:00" }], thu: [{ start: "16:00", end: "20:00" }], fri: [{ start: "16:00", end: "20:00" }], sat: [{ start: "10:00", end: "14:00" }] }, specialDates: {}, timeOff: [] });

  // ---------------- Business 4: Wagging Trail Pet Spa (Team tier, NYC) ----------------
  const groomerOwner: User = { id: id("user"), email: "owner@waggingtrail.com", displayName: "Sam Chen", phone: "+1 555 0501", timezone: TZ_NY, roles: ["admin", "staff", "customer"], avatar: STOCK.avatars[6], createdAt: now };
  const groomer2: User = { id: id("user"), email: "lex@waggingtrail.com", displayName: "Lex Howard", phone: "+1 555 0502", timezone: TZ_NY, roles: ["staff", "customer"], avatar: STOCK.avatars[7], createdAt: now };
  users.push(groomerOwner, groomer2);

  const grooming: Business = {
    id: id("biz"),
    slug: "wagging-trail",
    name: "Wagging Trail Pet Spa",
    description: "Calm, low-stress grooming for dogs of every size. Private suites, no kennel cages.",
    heroImage: STOCK.groomer,
    timezone: TZ_NY,
    address: "88 Bedford Ave, Brooklyn, NY 11211",
    phone: "+1 718 555 0500",
    ownerUserId: groomerOwner.id,
    staffUserIds: [groomerOwner.id, groomer2.id],
    status: "active",
    tier: "team",
    subscriptionStatus: "active",
    stripeCustomerId: "cus_demo_groomer",
    brandColors: { hue: 36 },
    cancellationPolicy: { hoursBefore: 12, chargePercent: 50 },
    showPlatformFooter: true,
    createdAt: now,
  };
  businesses.push(grooming);
  groomerOwner.memberOf = [grooming.id];
  groomer2.memberOf = [grooming.id];

  const groomLoc: Location = { id: id("loc"), businessId: grooming.id, name: "Williamsburg Spa", address: "88 Bedford Ave, Brooklyn, NY 11211", timezone: TZ_NY, active: true };
  locations.push(groomLoc);

  const groomServices: Service[] = [
    { id: id("svc"), businessId: grooming.id, name: "Bath & Brush", description: "Bath, blow-dry, brush-out, ear cleaning.", durationMinutes: 60, bufferBeforeMinutes: 10, bufferAfterMinutes: 10, priceCents: 6500, depositType: "percent", depositAmount: 25, eligibleStaffIds: [groomerOwner.id, groomer2.id], eligibleLocationIds: [groomLoc.id], color: "primary", active: true, sortOrder: 0 },
    { id: id("svc"), businessId: grooming.id, name: "Full Groom", description: "Bath plus haircut to breed standard or owner preference.", durationMinutes: 120, bufferBeforeMinutes: 10, bufferAfterMinutes: 15, priceCents: 11500, depositType: "flat", depositAmount: 2500, eligibleStaffIds: [groomerOwner.id, groomer2.id], eligibleLocationIds: [groomLoc.id], color: "accent", active: true, sortOrder: 1 },
    { id: id("svc"), businessId: grooming.id, name: "Nail Trim", description: "Quick nail trim with grinding finish.", durationMinutes: 20, bufferBeforeMinutes: 5, bufferAfterMinutes: 5, priceCents: 2500, depositType: "none", depositAmount: 0, eligibleStaffIds: [groomerOwner.id, groomer2.id], eligibleLocationIds: [groomLoc.id], color: "completed", active: true, sortOrder: 2 },
  ];
  services.push(...groomServices);

  staff.push(
    { id: id("staff"), userId: groomerOwner.id, businessId: grooming.id, displayName: "Sam Chen", bio: "Owner, certified groomer.", avatar: STOCK.avatars[6], serviceIds: groomServices.map((s) => s.id), locationIds: [groomLoc.id], active: true, sortOrder: 0 },
    { id: id("staff"), userId: groomer2.id, businessId: grooming.id, displayName: "Lex Howard", bio: "Specialist in anxious dogs and rescues.", avatar: STOCK.avatars[7], serviceIds: groomServices.map((s) => s.id), locationIds: [groomLoc.id], active: true, sortOrder: 1 }
  );

  for (const u of [groomerOwner, groomer2]) {
    availability.push({ id: u.id, businessId: grooming.id, weeklySchedule: defaultWeekly(), specialDates: {}, timeOff: [] });
  }

  // ---------------- Bookings — 30 across businesses, varied statuses, varied dates ----------------
  function pushBooking(args: {
    businessId: string; serviceId: string; staffUserId: string; locationId: string;
    customerUserId: string; customerName: string; customerEmail: string; customerPhone: string;
    daysFromToday: number; tz: string; hour: number; minute: number;
    durationMinutes: number; priceCents: number; status: BookingStatus;
    depositPaidCents?: number; notesFromCustomer?: string;
  }) {
    const startAt = dateOffset(args.daysFromToday, args.tz, args.hour, args.minute);
    const endAt = addMinutesIso(startAt, args.durationMinutes);
    const createdAt = addMinutesIso(startAt, -60 * 24 * 5);
    bookings.push({
      id: id("bkg"),
      businessId: args.businessId,
      serviceId: args.serviceId,
      staffUserId: args.staffUserId,
      locationId: args.locationId,
      customerUserId: args.customerUserId,
      customerSnapshot: { name: args.customerName, email: args.customerEmail, phone: args.customerPhone },
      startAt, endAt, durationMinutes: args.durationMinutes,
      status: args.status,
      priceCents: args.priceCents,
      depositPaidCents: args.depositPaidCents ?? 0,
      stripePaymentIntentId: args.depositPaidCents ? `pi_demo_${nanoid(8)}` : null,
      notesFromCustomer: args.notesFromCustomer,
      createdAt,
      statusHistory: [{ status: "confirmed", at: createdAt, byUserId: args.customerUserId }],
      reminderSentAt: {},
    });
  }

  // Salon
  pushBooking({ businessId: salon.id, serviceId: salonServices[0].id, staffUserId: salonOwner.id, locationId: salonLoc.id, customerUserId: customer.id, customerName: customer.displayName, customerEmail: customer.email, customerPhone: customer.phone!, daysFromToday: 1, tz: TZ_NY, hour: 11, minute: 0, durationMinutes: 60, priceCents: 9500, status: "confirmed", depositPaidCents: 2375 });
  pushBooking({ businessId: salon.id, serviceId: salonServices[1].id, staffUserId: salonStylist1.id, locationId: salonLoc.id, customerUserId: extraCustomers[0].id, customerName: extraCustomers[0].displayName, customerEmail: extraCustomers[0].email, customerPhone: extraCustomers[0].phone!, daysFromToday: 2, tz: TZ_NY, hour: 14, minute: 30, durationMinutes: 90, priceCents: 14500, status: "confirmed", depositPaidCents: 3625 });
  pushBooking({ businessId: salon.id, serviceId: salonServices[3].id, staffUserId: salonStylist2.id, locationId: salonLoc.id, customerUserId: extraCustomers[1].id, customerName: extraCustomers[1].displayName, customerEmail: extraCustomers[1].email, customerPhone: extraCustomers[1].phone!, daysFromToday: 3, tz: TZ_NY, hour: 10, minute: 0, durationMinutes: 30, priceCents: 4500, status: "confirmed" });
  pushBooking({ businessId: salon.id, serviceId: salonServices[2].id, staffUserId: salonOwner.id, locationId: salonLoc.id, customerUserId: extraCustomers[2].id, customerName: extraCustomers[2].displayName, customerEmail: extraCustomers[2].email, customerPhone: extraCustomers[2].phone!, daysFromToday: 5, tz: TZ_NY, hour: 13, minute: 0, durationMinutes: 180, priceCents: 28500, status: "confirmed", depositPaidCents: 5000 });
  pushBooking({ businessId: salon.id, serviceId: salonServices[0].id, staffUserId: salonStylist1.id, locationId: salonLoc.id, customerUserId: extraCustomers[0].id, customerName: extraCustomers[0].displayName, customerEmail: extraCustomers[0].email, customerPhone: extraCustomers[0].phone!, daysFromToday: 7, tz: TZ_NY, hour: 16, minute: 0, durationMinutes: 60, priceCents: 9500, status: "confirmed", depositPaidCents: 2375 });
  pushBooking({ businessId: salon.id, serviceId: salonServices[0].id, staffUserId: salonOwner.id, locationId: salonLoc.id, customerUserId: customer.id, customerName: customer.displayName, customerEmail: customer.email, customerPhone: customer.phone!, daysFromToday: -3, tz: TZ_NY, hour: 11, minute: 0, durationMinutes: 60, priceCents: 9500, status: "completed", depositPaidCents: 2375 });
  pushBooking({ businessId: salon.id, serviceId: salonServices[3].id, staffUserId: salonStylist2.id, locationId: salonLoc.id, customerUserId: extraCustomers[2].id, customerName: extraCustomers[2].displayName, customerEmail: extraCustomers[2].email, customerPhone: extraCustomers[2].phone!, daysFromToday: -7, tz: TZ_NY, hour: 9, minute: 0, durationMinutes: 30, priceCents: 4500, status: "no_show" });
  pushBooking({ businessId: salon.id, serviceId: salonServices[1].id, staffUserId: salonOwner.id, locationId: salonLoc.id, customerUserId: extraCustomers[1].id, customerName: extraCustomers[1].displayName, customerEmail: extraCustomers[1].email, customerPhone: extraCustomers[1].phone!, daysFromToday: -10, tz: TZ_NY, hour: 14, minute: 0, durationMinutes: 90, priceCents: 14500, status: "cancelled_by_customer" });

  // Yoga
  pushBooking({ businessId: yoga.id, serviceId: yogaServices[0].id, staffUserId: yogaOwner.id, locationId: yogaLoc.id, customerUserId: customer.id, customerName: customer.displayName, customerEmail: customer.email, customerPhone: customer.phone!, daysFromToday: 0, tz: TZ_LA, hour: 18, minute: 30, durationMinutes: 60, priceCents: 2400, status: "confirmed", depositPaidCents: 2400 });
  pushBooking({ businessId: yoga.id, serviceId: yogaServices[1].id, staffUserId: yogaInst.id, locationId: yogaLoc.id, customerUserId: extraCustomers[0].id, customerName: extraCustomers[0].displayName, customerEmail: extraCustomers[0].email, customerPhone: extraCustomers[0].phone!, daysFromToday: 1, tz: TZ_LA, hour: 10, minute: 0, durationMinutes: 75, priceCents: 11500, status: "confirmed", depositPaidCents: 5750 });
  pushBooking({ businessId: yoga.id, serviceId: yogaServices[2].id, staffUserId: yogaOwner.id, locationId: yogaLoc.id, customerUserId: extraCustomers[1].id, customerName: extraCustomers[1].displayName, customerEmail: extraCustomers[1].email, customerPhone: extraCustomers[1].phone!, daysFromToday: 2, tz: TZ_LA, hour: 9, minute: 0, durationMinutes: 30, priceCents: 0, status: "confirmed" });
  pushBooking({ businessId: yoga.id, serviceId: yogaServices[0].id, staffUserId: yogaInst.id, locationId: yogaLoc.id, customerUserId: extraCustomers[2].id, customerName: extraCustomers[2].displayName, customerEmail: extraCustomers[2].email, customerPhone: extraCustomers[2].phone!, daysFromToday: 4, tz: TZ_LA, hour: 17, minute: 30, durationMinutes: 60, priceCents: 2400, status: "confirmed", depositPaidCents: 2400 });
  pushBooking({ businessId: yoga.id, serviceId: yogaServices[1].id, staffUserId: yogaOwner.id, locationId: yogaLoc.id, customerUserId: extraCustomers[0].id, customerName: extraCustomers[0].displayName, customerEmail: extraCustomers[0].email, customerPhone: extraCustomers[0].phone!, daysFromToday: -5, tz: TZ_LA, hour: 11, minute: 0, durationMinutes: 75, priceCents: 11500, status: "completed", depositPaidCents: 5750 });
  pushBooking({ businessId: yoga.id, serviceId: yogaServices[0].id, staffUserId: yogaInst.id, locationId: yogaLoc.id, customerUserId: extraCustomers[1].id, customerName: extraCustomers[1].displayName, customerEmail: extraCustomers[1].email, customerPhone: extraCustomers[1].phone!, daysFromToday: -8, tz: TZ_LA, hour: 18, minute: 30, durationMinutes: 60, priceCents: 2400, status: "completed", depositPaidCents: 2400 });

  // Tutoring
  pushBooking({ businessId: tutoring.id, serviceId: tutorServices[0].id, staffUserId: tutorOwner.id, locationId: tutorLoc.id, customerUserId: extraCustomers[0].id, customerName: extraCustomers[0].displayName, customerEmail: extraCustomers[0].email, customerPhone: extraCustomers[0].phone!, daysFromToday: 1, tz: TZ_CHI, hour: 17, minute: 0, durationMinutes: 60, priceCents: 8500, status: "confirmed", notesFromCustomer: "Working through Chapter 7 of Larson Calculus." });
  pushBooking({ businessId: tutoring.id, serviceId: tutorServices[1].id, staffUserId: tutorOwner.id, locationId: tutorLoc.id, customerUserId: extraCustomers[1].id, customerName: extraCustomers[1].displayName, customerEmail: extraCustomers[1].email, customerPhone: extraCustomers[1].phone!, daysFromToday: 2, tz: TZ_CHI, hour: 18, minute: 30, durationMinutes: 90, priceCents: 12000, status: "confirmed" });
  pushBooking({ businessId: tutoring.id, serviceId: tutorServices[0].id, staffUserId: tutorOwner.id, locationId: tutorLoc.id, customerUserId: extraCustomers[0].id, customerName: extraCustomers[0].displayName, customerEmail: extraCustomers[0].email, customerPhone: extraCustomers[0].phone!, daysFromToday: 8, tz: TZ_CHI, hour: 17, minute: 0, durationMinutes: 60, priceCents: 8500, status: "confirmed" });
  pushBooking({ businessId: tutoring.id, serviceId: tutorServices[0].id, staffUserId: tutorOwner.id, locationId: tutorLoc.id, customerUserId: extraCustomers[1].id, customerName: extraCustomers[1].displayName, customerEmail: extraCustomers[1].email, customerPhone: extraCustomers[1].phone!, daysFromToday: -2, tz: TZ_CHI, hour: 17, minute: 0, durationMinutes: 60, priceCents: 8500, status: "completed" });
  pushBooking({ businessId: tutoring.id, serviceId: tutorServices[0].id, staffUserId: tutorOwner.id, locationId: tutorLoc.id, customerUserId: extraCustomers[2].id, customerName: extraCustomers[2].displayName, customerEmail: extraCustomers[2].email, customerPhone: extraCustomers[2].phone!, daysFromToday: -9, tz: TZ_CHI, hour: 16, minute: 0, durationMinutes: 60, priceCents: 8500, status: "completed" });

  // Grooming
  pushBooking({ businessId: grooming.id, serviceId: groomServices[1].id, staffUserId: groomerOwner.id, locationId: groomLoc.id, customerUserId: customer.id, customerName: customer.displayName, customerEmail: customer.email, customerPhone: customer.phone!, daysFromToday: 4, tz: TZ_NY, hour: 11, minute: 0, durationMinutes: 120, priceCents: 11500, status: "confirmed", depositPaidCents: 2500, notesFromCustomer: "Mochi gets nervous with hairdryers — please go slow." });
  pushBooking({ businessId: grooming.id, serviceId: groomServices[0].id, staffUserId: groomer2.id, locationId: groomLoc.id, customerUserId: extraCustomers[0].id, customerName: extraCustomers[0].displayName, customerEmail: extraCustomers[0].email, customerPhone: extraCustomers[0].phone!, daysFromToday: 1, tz: TZ_NY, hour: 14, minute: 0, durationMinutes: 60, priceCents: 6500, status: "confirmed", depositPaidCents: 1625 });
  pushBooking({ businessId: grooming.id, serviceId: groomServices[2].id, staffUserId: groomer2.id, locationId: groomLoc.id, customerUserId: extraCustomers[1].id, customerName: extraCustomers[1].displayName, customerEmail: extraCustomers[1].email, customerPhone: extraCustomers[1].phone!, daysFromToday: 0, tz: TZ_NY, hour: 16, minute: 0, durationMinutes: 20, priceCents: 2500, status: "confirmed" });
  pushBooking({ businessId: grooming.id, serviceId: groomServices[1].id, staffUserId: groomerOwner.id, locationId: groomLoc.id, customerUserId: extraCustomers[2].id, customerName: extraCustomers[2].displayName, customerEmail: extraCustomers[2].email, customerPhone: extraCustomers[2].phone!, daysFromToday: 6, tz: TZ_NY, hour: 9, minute: 30, durationMinutes: 120, priceCents: 11500, status: "confirmed", depositPaidCents: 2500 });
  pushBooking({ businessId: grooming.id, serviceId: groomServices[0].id, staffUserId: groomer2.id, locationId: groomLoc.id, customerUserId: extraCustomers[0].id, customerName: extraCustomers[0].displayName, customerEmail: extraCustomers[0].email, customerPhone: extraCustomers[0].phone!, daysFromToday: -4, tz: TZ_NY, hour: 13, minute: 0, durationMinutes: 60, priceCents: 6500, status: "completed", depositPaidCents: 1625 });
  pushBooking({ businessId: grooming.id, serviceId: groomServices[1].id, staffUserId: groomerOwner.id, locationId: groomLoc.id, customerUserId: extraCustomers[1].id, customerName: extraCustomers[1].displayName, customerEmail: extraCustomers[1].email, customerPhone: extraCustomers[1].phone!, daysFromToday: -12, tz: TZ_NY, hour: 10, minute: 0, durationMinutes: 120, priceCents: 11500, status: "no_show" });
  pushBooking({ businessId: grooming.id, serviceId: groomServices[0].id, staffUserId: groomer2.id, locationId: groomLoc.id, customerUserId: customer.id, customerName: customer.displayName, customerEmail: customer.email, customerPhone: customer.phone!, daysFromToday: -14, tz: TZ_NY, hour: 11, minute: 0, durationMinutes: 60, priceCents: 6500, status: "completed", depositPaidCents: 1625 });

  // Pad with a few more bookings to hit ~30
  for (const i of range(4)) {
    pushBooking({
      businessId: salon.id, serviceId: salonServices[i % salonServices.length].id,
      staffUserId: [salonOwner.id, salonStylist1.id, salonStylist2.id][i % 3],
      locationId: salonLoc.id, customerUserId: extraCustomers[i % extraCustomers.length].id,
      customerName: extraCustomers[i % extraCustomers.length].displayName,
      customerEmail: extraCustomers[i % extraCustomers.length].email,
      customerPhone: extraCustomers[i % extraCustomers.length].phone!,
      daysFromToday: 9 + i, tz: TZ_NY, hour: 10 + i, minute: 0,
      durationMinutes: salonServices[i % salonServices.length].durationMinutes,
      priceCents: salonServices[i % salonServices.length].priceCents,
      status: "confirmed",
      depositPaidCents: salonServices[i % salonServices.length].depositType === "percent"
        ? Math.round(salonServices[i % salonServices.length].priceCents * salonServices[i % salonServices.length].depositAmount / 100)
        : salonServices[i % salonServices.length].depositAmount,
    });
  }

  // ---------------- Conversations + Messages (5 threads) ----------------
  const conversationsToSeed = bookings.slice(0, 5).map((b, idx) => {
    const conv: Conversation = {
      id: id("conv"),
      businessId: b.businessId,
      bookingId: b.id,
      participantIds: [b.customerUserId, businesses.find((biz) => biz.id === b.businessId)!.ownerUserId],
      lastMessageAt: addMinutesIso(b.createdAt, 60 * 24),
      lastMessagePreview: idx % 2 === 0 ? "Looking forward to it!" : "Quick question — can I bring my dog water?",
      unreadCounts: idx % 2 === 0 ? {} : { [businesses.find((biz) => biz.id === b.businessId)!.ownerUserId]: 1 },
    };
    return conv;
  });
  conversations.push(...conversationsToSeed);

  conversationsToSeed.forEach((conv, idx) => {
    const initiator = conv.participantIds[0];
    const responder = conv.participantIds[1];
    messages.push({
      id: id("msg"), conversationId: conv.id, senderId: initiator,
      body: idx % 2 === 0 ? "Hi! Just confirming our appointment — should I bring anything?" : "Hi — is parking on Bedford easy in the afternoon?",
      createdAt: addMinutesIso(bookings[idx].createdAt, 60), readBy: [initiator, responder],
    });
    messages.push({
      id: id("msg"), conversationId: conv.id, senderId: responder,
      body: idx % 2 === 0 ? "All set! No need to bring anything. See you soon." : "Yep, the meter spots on Bedford are usually free after 4pm.",
      createdAt: addMinutesIso(bookings[idx].createdAt, 120), readBy: [responder],
    });
  });

  // Notifications for the demo customer
  notifications.push(
    { id: id("notif"), userId: customer.id, kind: "booking_reminder", title: "Tomorrow at Bloom & Co.", body: "Your Cut & Style is at 11:00 AM EST.", link: "/me/bookings", createdAt: addMinutesIso(now, -120), readAt: null },
    { id: id("notif"), userId: customer.id, kind: "message", title: "New message from Wagging Trail", body: "All set! No need to bring anything.", link: "/me/messages", createdAt: addMinutesIso(now, -60), readAt: null }
  );

  return { users, businesses, services, locations, staff, availability, bookings, conversations, messages, notifications };
}
