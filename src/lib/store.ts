/* ---------------------------------------------------------------------
   In-memory + localStorage data store. Models Firestore collections.
   Production: replace each collection access with a Firestore query.
   The shape and access patterns here mirror Firestore idioms so the
   migration is mechanical (see src/lib/api.ts for the public surface).
--------------------------------------------------------------------- */

import { nanoid } from "@/lib/id";
import type {
  Availability,
  Blackout,
  Booking,
  Business,
  Conversation,
  Location,
  Message,
  Notification,
  Service,
  SmsLogEntry,
  StaffProfile,
  User,
} from "./types";
import { seedAll } from "./seed";

const STORAGE_KEY = "booklypro:store:v1";

export interface Store {
  users: User[];
  businesses: Business[];
  services: Service[];
  locations: Location[];
  staff: StaffProfile[];
  availability: Availability[];
  bookings: Booking[];
  blackouts: Blackout[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  smsLog: SmsLogEntry[];
  // session
  currentUserId: string | null;
}

let memory: Store | null = null;
const listeners = new Set<() => void>();

function emptyStore(): Store {
  return {
    users: [],
    businesses: [],
    services: [],
    locations: [],
    staff: [],
    availability: [],
    bookings: [],
    blackouts: [],
    conversations: [],
    messages: [],
    notifications: [],
    smsLog: [],
    currentUserId: null,
  };
}

function load(): Store {
  if (memory) return memory;
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        memory = JSON.parse(raw) as Store;
        return memory;
      } catch {
        /* fall through */
      }
    }
  }
  // first run — seed
  const seeded = seedAll();
  memory = { ...emptyStore(), ...seeded, currentUserId: null };
  persist();
  return memory;
}

function persist() {
  if (!memory || typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    /* quota — silently ignore for demo */
  }
}

function notify() {
  for (const fn of listeners) fn();
}

export function getStore(): Store {
  return load();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function mutate<T>(fn: (s: Store) => T): T {
  const s = load();
  const result = fn(s);
  persist();
  notify();
  return result;
}

export function resetStore() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  memory = null;
  load();
  notify();
}

// ---------- Identity helpers ----------

export function setCurrentUser(userId: string | null) {
  mutate((s) => {
    s.currentUserId = userId;
  });
}

export function currentUser(): User | null {
  const s = getStore();
  return s.users.find((u) => u.id === s.currentUserId) ?? null;
}

export function newId(prefix?: string) {
  return prefix ? `${prefix}_${nanoid()}` : nanoid();
}
