/* ---------------------------------------------------------------------
   In-memory + localStorage data store. Seeds rich demo content on first
   load; persists session edits to localStorage. The Reset demo button
   clears every booklypro:* key and reloads.
--------------------------------------------------------------------- */

import { nanoid } from "@/lib/id";
import type {
  Availability,
  Blackout,
  Booking,
  Business,
  Conversation,
  EmailLogEntry,
  Location,
  Message,
  Notification,
  Service,
  SmsLogEntry,
  StaffProfile,
  User,
} from "./types";
import { seedAll } from "./seed";

const STORAGE_KEY = "booklypro:store:v2";
const KEY_PREFIX = "booklypro:";

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
  emailLog: EmailLogEntry[];
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
    emailLog: [],
    currentUserId: null,
  };
}

function load(): Store {
  if (memory) return memory;
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<Store>;
        // Fill in any collections added since this store was first persisted.
        memory = { ...emptyStore(), ...parsed } as Store;
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
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
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
