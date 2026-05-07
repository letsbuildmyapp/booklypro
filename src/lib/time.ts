import { format, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export type IsoString = string;

export function nowIso(): IsoString {
  return new Date().toISOString();
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function fmtInTz(iso: IsoString, tz: string, pattern: string) {
  return formatInTimeZone(parseISO(iso), tz, pattern);
}

export function fmtTime(iso: IsoString, tz: string) {
  return fmtInTz(iso, tz, "h:mm a");
}

export function fmtDay(iso: IsoString, tz: string) {
  return fmtInTz(iso, tz, "EEEE, MMM d");
}

export function fmtShortDay(iso: IsoString, tz: string) {
  return fmtInTz(iso, tz, "MMM d");
}

export function fmtFullDateTime(iso: IsoString, tz: string) {
  return fmtInTz(iso, tz, "EEE, MMM d · h:mm a zzz");
}

export function fmtRelative(iso: IsoString, tz: string) {
  const now = Date.now();
  const t = parseISO(iso).getTime();
  const diff = t - now;
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (Math.abs(days) < 1) {
    const hours = Math.round(diff / (1000 * 60 * 60));
    if (hours === 0) return "just now";
    return hours > 0 ? `in ${hours}h` : `${Math.abs(hours)}h ago`;
  }
  if (days > 0 && days < 7) return `in ${days}d`;
  if (days < 0 && days > -7) return `${Math.abs(days)}d ago`;
  return fmtShortDay(iso, tz);
}

/** Convert "YYYY-MM-DDTHH:mm" wall-clock in a tz to UTC ISO */
export function wallClockToUtc(local: string, tz: string): IsoString {
  return fromZonedTime(local, tz).toISOString();
}

/** Convert UTC ISO to a Date in the target tz (for date math) */
export function utcToZoned(iso: IsoString, tz: string): Date {
  return toZonedTime(parseISO(iso), tz);
}

export function dayKey(iso: IsoString, tz: string) {
  return fmtInTz(iso, tz, "yyyy-MM-dd");
}

export function timeOfDayKey(iso: IsoString, tz: string) {
  return fmtInTz(iso, tz, "HH:mm");
}

export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export function weekdayInTz(iso: IsoString, tz: string): Weekday {
  const idx = Number(fmtInTz(iso, tz, "i")) % 7; // 1..7 Mon..Sun
  // i: 1=Mon ... 7=Sun. Convert to sun=0..sat=6.
  const map: Record<number, Weekday> = {
    1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat", 0: "sun",
  };
  return map[idx];
}

export function ymdInTz(iso: IsoString, tz: string) {
  return fmtInTz(iso, tz, "yyyy-MM-dd");
}

export function localDateToIso(ymd: string, hhmm: string, tz: string): IsoString {
  return wallClockToUtc(`${ymd}T${hhmm}`, tz);
}

export function addMinutesIso(iso: IsoString, minutes: number): IsoString {
  return new Date(parseISO(iso).getTime() + minutes * 60_000).toISOString();
}

export function diffMinutes(a: IsoString, b: IsoString) {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 60_000);
}

export function startOfDayInTz(iso: IsoString, tz: string): IsoString {
  const ymd = ymdInTz(iso, tz);
  return wallClockToUtc(`${ymd}T00:00`, tz);
}

export function todayYmd(tz: string) {
  return formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
}

export function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

export function fmtCents(cents: number) {
  return (cents / 100).toFixed(2);
}

export { format, parseISO };
