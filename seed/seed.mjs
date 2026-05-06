// Seeds the local Firebase emulators with realistic BooklyPro demo data.
// Run: `npm run seed` (after `npm run emulators` in another terminal).
//
// Niche: hair salon chain — "Bloom & Bough Salon".

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';

const app = initializeApp({ projectId: 'demo-booklypro', apiKey: 'demo-api-key' });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

// ---------- helpers ----------
const dayMs = 24 * 60 * 60 * 1000;
const startOfTodayLocal = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();

function at(dayOffset, hour, minute = 0) {
  return startOfTodayLocal + dayOffset * dayMs + (hour * 60 + minute) * 60 * 1000;
}

async function clearCollection(name) {
  const snap = await getDocs(collection(db, name));
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
}

// ---------- 1) demo users in Auth + users docs ----------
const SEED_USERS = [
  { uid: 'user-customer-1', email: 'maya@booklypro.demo', password: 'demo1234', name: 'Maya Goldberg', role: 'customer' },
  { uid: 'user-customer-2', email: 'theo@booklypro.demo',  password: 'demo1234', name: 'Theo Park',     role: 'customer' },
  { uid: 'user-staff-1',    email: 'jordan@booklypro.demo',password: 'demo1234', name: 'Jordan Rivera', role: 'staff', staffId: 'staff-jordan' },
  { uid: 'user-staff-2',    email: 'priya@booklypro.demo', password: 'demo1234', name: 'Priya Vasudevan',role: 'staff', staffId: 'staff-priya' },
  { uid: 'user-admin-1',    email: 'admin@booklypro.demo', password: 'demo1234', name: 'Sage Thompson', role: 'admin' },
];

console.log('• Creating Auth users…');
const realUidByEmail = {};
for (const u of SEED_USERS) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, u.email, u.password);
    realUidByEmail[u.email] = cred.user.uid;
  } catch (e) {
    if (String(e.message).includes('email-already-in-use') || e.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, u.email, u.password);
      realUidByEmail[u.email] = cred.user.uid;
    } else {
      throw e;
    }
  }
}

// Map seed-user logical uid → real auth uid (since emulator generates random uids).
const uidMap = {};
for (const u of SEED_USERS) uidMap[u.uid] = realUidByEmail[u.email];

console.log('• Writing user profile docs…');
for (const u of SEED_USERS) {
  const realUid = uidMap[u.uid];
  await setDoc(doc(db, 'users', realUid), {
    uid: realUid,
    email: u.email,
    name: u.name,
    role: u.role,
    ...(u.staffId ? { staffId: u.staffId } : {}),
    createdAt: Date.now(),
  });
}

// ---------- 2) Business ----------
console.log('• Writing business…');
await setDoc(doc(db, 'business', 'main'), {
  id: 'main',
  name: 'Bloom & Bough Salon',
  tagline: 'A calm corner for the cut you love.',
  niche: 'salon',
});

// ---------- 3) Locations ----------
console.log('• Writing locations…');
const LOCATIONS = [
  { id: 'loc-mission',  name: 'Mission Studio',  address: '2245 Valencia St, San Francisco, CA' },
  { id: 'loc-hayes',    name: 'Hayes Valley',    address: '510 Hayes St, San Francisco, CA' },
  { id: 'loc-oakland',  name: 'Temescal',        address: '4810 Telegraph Ave, Oakland, CA' },
];
for (const l of LOCATIONS) await setDoc(doc(db, 'locations', l.id), l);

// ---------- 4) Staff ----------
console.log('• Writing staff…');
// Default availability: Tue–Sat, 9am–6pm
const stdAvail = [2, 3, 4, 5, 6].map((dow) => ({ dow, startMin: 9 * 60, endMin: 18 * 60 }));
const partAvail = [3, 4, 5, 6].map((dow) => ({ dow, startMin: 11 * 60, endMin: 19 * 60 }));

const STAFF = [
  { id: 'staff-jordan', name: 'Jordan Rivera',     title: 'Senior Stylist',  bio: 'Specializes in modern cuts and balayage.',     locationId: 'loc-mission', availability: stdAvail,  avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop' },
  { id: 'staff-priya',  name: 'Priya Vasudevan',   title: 'Color Specialist',bio: 'Color science nerd. Bright reds, soft balayage.', locationId: 'loc-hayes',   availability: stdAvail,  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop' },
  { id: 'staff-noor',   name: 'Noor Hassan',       title: 'Stylist',         bio: 'Curly hair specialist. Devacurl certified.',     locationId: 'loc-oakland', availability: stdAvail,  avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop' },
  { id: 'staff-arlo',   name: 'Arlo Chen',         title: 'Junior Stylist',  bio: 'Quick precision cuts and beard work.',           locationId: 'loc-mission', availability: partAvail, avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop' },
];
for (const s of STAFF) await setDoc(doc(db, 'staff', s.id), s);

// ---------- 5) Services ----------
console.log('• Writing services…');
const SERVICES = [
  { id: 'svc-haircut',  name: "Haircut & Style",     description: 'Consultation, shampoo, cut, and finish.',  durationMin: 60,  priceCents: 8500,  color: 'sage',  staffIds: ['staff-jordan','staff-noor','staff-arlo'] },
  { id: 'svc-color',    name: 'Single-Process Color',description: 'All-over color refresh, glaze, and blow-dry.', durationMin: 120, priceCents: 18500, color: 'blush', staffIds: ['staff-jordan','staff-priya'] },
  { id: 'svc-balayage', name: 'Balayage',            description: 'Hand-painted lights, toner, and finish.',  durationMin: 180, priceCents: 28500, color: 'sage',  staffIds: ['staff-priya','staff-jordan'] },
  { id: 'svc-trim',     name: 'Quick Trim',          description: 'Dry trim — no shampoo, in and out.',       durationMin: 30,  priceCents: 4500,  color: 'sage',  staffIds: ['staff-arlo','staff-jordan','staff-noor'] },
  { id: 'svc-blowout',  name: 'Blowout',             description: 'Shampoo and blow-dry styling.',            durationMin: 45,  priceCents: 6500,  color: 'blush', staffIds: ['staff-noor','staff-arlo','staff-priya'] },
  { id: 'svc-curly',    name: 'Curly Cut',           description: 'Dry-cut shaping for curly and coily hair.',durationMin: 75,  priceCents: 11500, color: 'sage',  staffIds: ['staff-noor'] },
];
for (const s of SERVICES) await setDoc(doc(db, 'services', s.id), s);

// ---------- 6) Bookings (clear first) ----------
console.log('• Clearing existing bookings…');
await clearCollection('bookings');

console.log('• Writing bookings…');
const customerMaya = { uid: uidMap['user-customer-1'], name: 'Maya Goldberg', email: 'maya@booklypro.demo' };
const customerTheo = { uid: uidMap['user-customer-2'], name: 'Theo Park',     email: 'theo@booklypro.demo' };
const guestPool = [
  { uid: 'guest-anya', name: 'Anya Reyes',  email: 'anya.r@example.com' },
  { uid: 'guest-dan',  name: 'Dan Ulrich',  email: 'dan.u@example.com' },
  { uid: 'guest-sara', name: 'Sara Chen',   email: 'sara.c@example.com' },
  { uid: 'guest-leo',  name: 'Leo Martín',  email: 'leo.m@example.com' },
  { uid: 'guest-tess', name: 'Tess Bauer',  email: 'tess.b@example.com' },
  { uid: 'guest-omar', name: 'Omar Diallo', email: 'omar.d@example.com' },
];

function svc(id) { return SERVICES.find((s) => s.id === id); }

const BOOKINGS = [
  // Past — completed
  { svc: 'svc-haircut', staff: 'staff-jordan', loc: 'loc-mission', cust: customerMaya, dayOff: -10, hour: 11, status: 'completed' },
  { svc: 'svc-color',   staff: 'staff-priya',  loc: 'loc-hayes',   cust: customerMaya, dayOff: -3,  hour: 14, status: 'completed' },
  { svc: 'svc-trim',    staff: 'staff-arlo',   loc: 'loc-mission', cust: customerTheo, dayOff: -7,  hour: 17, status: 'completed' },
  { svc: 'svc-blowout', staff: 'staff-noor',   loc: 'loc-oakland', cust: guestPool[0], dayOff: -2,  hour: 12, status: 'completed' },
  // Past — canceled / no-show
  { svc: 'svc-balayage',staff: 'staff-priya',  loc: 'loc-hayes',   cust: guestPool[1], dayOff: -5,  hour: 10, status: 'canceled' },
  { svc: 'svc-haircut', staff: 'staff-jordan', loc: 'loc-mission', cust: guestPool[2], dayOff: -4,  hour: 9,  status: 'no_show' },
  // Today — confirmed
  { svc: 'svc-haircut', staff: 'staff-jordan', loc: 'loc-mission', cust: guestPool[3], dayOff: 0, hour: 10 },
  { svc: 'svc-trim',    staff: 'staff-jordan', loc: 'loc-mission', cust: guestPool[4], dayOff: 0, hour: 13 },
  { svc: 'svc-color',   staff: 'staff-priya',  loc: 'loc-hayes',   cust: customerMaya, dayOff: 0, hour: 14 },
  { svc: 'svc-curly',   staff: 'staff-noor',   loc: 'loc-oakland', cust: guestPool[5], dayOff: 0, hour: 11 },
  // Future — confirmed
  { svc: 'svc-blowout', staff: 'staff-noor',   loc: 'loc-oakland', cust: customerTheo, dayOff: 1, hour: 12 },
  { svc: 'svc-haircut', staff: 'staff-arlo',   loc: 'loc-mission', cust: guestPool[0], dayOff: 2, hour: 14 },
  { svc: 'svc-balayage',staff: 'staff-priya',  loc: 'loc-hayes',   cust: customerMaya, dayOff: 4, hour: 10 },
  { svc: 'svc-haircut', staff: 'staff-jordan', loc: 'loc-mission', cust: customerTheo, dayOff: 6, hour: 11 },
  { svc: 'svc-trim',    staff: 'staff-arlo',   loc: 'loc-mission', cust: guestPool[1], dayOff: 8, hour: 17 },
];

let i = 0;
for (const b of BOOKINGS) {
  const s = svc(b.svc);
  if (!s) continue;
  const startAt = at(b.dayOff, b.hour);
  const endAt = startAt + s.durationMin * 60 * 1000;
  const id = `bk_${i++}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, 'bookings', id), {
    id,
    serviceId: s.id,
    staffId: b.staff,
    locationId: b.loc,
    customerUid: b.cust.uid,
    customerName: b.cust.name,
    customerEmail: b.cust.email,
    startAt,
    endAt,
    status: b.status ?? 'confirmed',
    priceCents: s.priceCents,
    createdAt: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 7),
  });
}

console.log(`\n✅ Seeded ${BOOKINGS.length} bookings, ${STAFF.length} staff, ${SERVICES.length} services, ${LOCATIONS.length} locations, ${SEED_USERS.length} users.`);
console.log('\nDemo accounts (all password demo1234):');
for (const u of SEED_USERS) console.log(`  ${u.role.padEnd(8)} → ${u.email}`);
process.exit(0);
