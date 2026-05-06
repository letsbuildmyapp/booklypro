# BooklyPro

A booking & reservation platform for a hair salon chain. Portfolio piece for [letsbuildmyapp.com](https://letsbuildmyapp.com).

## Visual archetype (locked)

- **Archetype:** Soft consumer (mint/sage primary, blush accent, off-white background, `rounded-3xl`, generous padding, soft shadows — calm Calendly-adjacent vibe).
- **Type:** DM Serif Display (display) + DM Sans (body). 16px body floor; HIG-derived scale.
- **Palette:** sage (primary), blush (accent), cream (background), ink (text). Light & dark.

## Quick start (full stack, local)

```bash
# 1. Install deps
npm install
cd functions && npm install && cd ..

# 2. Start Firebase emulators (auth + firestore + functions + hosting on :5050)
firebase emulators:start --project demo-booklypro --only auth,firestore,functions

# 3. In a second terminal, seed demo data
npm run seed

# 4. In a third terminal, start the Vite dev server
npm run dev
# → http://localhost:5173
```

## Demo accounts

All passwords: `demo1234`

| Role     | Email                       |
|----------|-----------------------------|
| customer | maya@booklypro.demo         |
| customer | theo@booklypro.demo         |
| staff    | jordan@booklypro.demo       |
| staff    | priya@booklypro.demo        |
| admin    | admin@booklypro.demo        |

The login screen has one-click sign-in tiles for each role.

## What's seeded

- Business: **Bloom & Bough Salon**
- 3 locations (Mission, Hayes Valley, Temescal)
- 4 stylists with weekly availability windows
- 6 services (haircut, color, balayage, trim, blowout, curly cut)
- 15 sample bookings spanning past, today, and the next 8 days

## Architecture

- **Frontend:** React 18 + TypeScript + Vite, Tailwind, Framer Motion, TanStack Query, React Router v6, sonner, lucide-react.
- **Backend:** Firebase Auth, Firestore (with role-aware rules), Cloud Functions (TS, Node 20).
- **Email:** Resend (Cloud Function `sendBookingEmail`). Falls back to console-log fixture mode when `RESEND_API_KEY` isn't set in `functions/.env`.
- **Default Firebase projectId:** `demo-booklypro` (works against emulators out of the box).

## Roles

- **customer** — books services, picks staff (or "any"), picks a time slot, sees upcoming + past bookings, cancels.
- **staff** — sees today's appointments grouped by time, sees the rest of the week, marks complete.
- **admin** — day-by-day calendar across all staff, manages services & pricing, manages staff & weekly availability.

## Onboarding tour

First-run spotlight tour, per role, per device. Storage key: `booklypro:tutorial_seen:<role>`.

- customer: 4 steps
- staff: 4 steps
- admin: 6 steps

## Email function (Resend)

Set `functions/.env`:

```
RESEND_API_KEY=re_xxxx
BOOKING_FROM_EMAIL=BooklyPro <hi@yourdomain.com>
```

Without a key, the function logs a preview to the emulator console and returns `{ delivered: false, mocked: true }`.

## Deploy (when ready)

```bash
npm run build
firebase deploy --only hosting:staging
# confirm staging looks right, then:
firebase deploy --only hosting:production
```

Built by [letsbuildmyapp.com](https://letsbuildmyapp.com).
