import { describe, it, expect } from "vitest";
import { computeAvailability, computeDeposit, cancellationCharge } from "../availability";
import type { Availability, Booking, Service } from "../types";
import { wallClockToUtc } from "../time";

const TZ = "America/New_York";

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: "svc1", businessId: "biz1", name: "Test", description: "",
    durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
    priceCents: 5000, depositType: "none", depositAmount: 0,
    eligibleStaffIds: ["staff1"], eligibleLocationIds: ["loc1"],
    color: "primary", active: true, sortOrder: 0,
    ...overrides,
  };
}

function makeAvail(overrides: Partial<Availability> = {}): Availability {
  return {
    id: "staff1", businessId: "biz1",
    weeklySchedule: { sun: [], mon: [{ start: "09:00", end: "17:00" }], tue: [{ start: "09:00", end: "17:00" }], wed: [{ start: "09:00", end: "17:00" }], thu: [{ start: "09:00", end: "17:00" }], fri: [{ start: "09:00", end: "17:00" }], sat: [] },
    specialDates: {}, timeOff: [],
    ...overrides,
  };
}

function makeBooking(args: { ymd: string; hh: string }): Booking {
  const startAt = wallClockToUtc(`${args.ymd}T${args.hh}`, TZ);
  return {
    id: "b1", businessId: "biz1", serviceId: "svc1",
    staffUserId: "staff1", locationId: "loc1",
    customerUserId: "u1", customerSnapshot: { name: "x", email: "x@x.com", phone: "" },
    startAt, endAt: new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString(),
    durationMinutes: 60, status: "confirmed", priceCents: 5000, depositPaidCents: 0,
    createdAt: new Date().toISOString(), statusHistory: [],
  };
}

describe("computeAvailability", () => {
  it("returns slots within weekly schedule", () => {
    const start = new Date(); start.setUTCDate(start.getUTCDate() + 1); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    const slots = computeAvailability({
      service: makeService(),
      staffIds: ["staff1"],
      locationId: "loc1",
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      timezone: TZ,
      staffSchedules: new Map([["staff1", makeAvail()]]),
      bookings: [],
      blackouts: [],
    });
    expect(slots.length).toBeGreaterThan(0);
  });

  it("excludes slots that overlap existing confirmed bookings", () => {
    const start = new Date(); start.setUTCDate(start.getUTCDate() + 1); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    const ymd = start.toISOString().slice(0, 10);
    const slots = computeAvailability({
      service: makeService(),
      staffIds: ["staff1"], locationId: "loc1",
      rangeStart: start.toISOString(), rangeEnd: end.toISOString(),
      timezone: TZ,
      staffSchedules: new Map([["staff1", makeAvail()]]),
      bookings: [makeBooking({ ymd, hh: "10:00" })],
      blackouts: [],
    });
    const conflictUtc = wallClockToUtc(`${ymd}T10:00`, TZ);
    expect(slots.find((s) => s.startAt === conflictUtc)).toBeUndefined();
  });

  it("respects buffers", () => {
    const start = new Date(); start.setUTCDate(start.getUTCDate() + 1); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    const ymd = start.toISOString().slice(0, 10);
    const slots = computeAvailability({
      service: makeService({ bufferAfterMinutes: 30 }),
      staffIds: ["staff1"], locationId: "loc1",
      rangeStart: start.toISOString(), rangeEnd: end.toISOString(),
      timezone: TZ,
      staffSchedules: new Map([["staff1", makeAvail()]]),
      bookings: [makeBooking({ ymd, hh: "10:00" })], // 10–11, +30m buffer = blocks until 11:30
      blackouts: [],
    });
    const elevenUtc = wallClockToUtc(`${ymd}T11:00`, TZ);
    expect(slots.find((s) => s.startAt === elevenUtc)).toBeUndefined();
  });
});

describe("computeDeposit", () => {
  it("returns 0 for none", () => {
    expect(computeDeposit(makeService({ depositType: "none", depositAmount: 0, priceCents: 5000 }))).toBe(0);
  });
  it("calculates percent", () => {
    expect(computeDeposit(makeService({ depositType: "percent", depositAmount: 25, priceCents: 10000 }))).toBe(2500);
  });
  it("returns flat", () => {
    expect(computeDeposit(makeService({ depositType: "flat", depositAmount: 1500 }))).toBe(1500);
  });
});

describe("cancellationCharge", () => {
  it("charges within window", () => {
    const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h away
    const r = cancellationCharge(makeBooking({ ymd: "2099-01-01", hh: "10:00" }), { hoursBefore: 24, chargePercent: 50 }, Date.now());
    // overwrite startAt
    const adjusted = cancellationCharge({ ...makeBooking({ ymd: "2099-01-01", hh: "10:00" }), startAt }, { hoursBefore: 24, chargePercent: 50 }, Date.now());
    expect(adjusted.withinWindow).toBe(true);
    expect(adjusted.chargeCents).toBe(2500);
    void r;
  });
  it("does not charge outside window", () => {
    const startAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const r = cancellationCharge({ ...makeBooking({ ymd: "2099-01-01", hh: "10:00" }), startAt }, { hoursBefore: 24, chargePercent: 50 }, Date.now());
    expect(r.withinWindow).toBe(false);
    expect(r.chargeCents).toBe(0);
  });
});
