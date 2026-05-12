# BooklyPro

A multi-tenant booking and reservation SaaS — public booking pages, four role surfaces, deposits at checkout, AI scheduling assistance, reminders.

Built as a portfolio showcase for [letsbuildmyapp.com](https://letsbuildmyapp.com). This repo is the source of the live demo prospects walk through during sales calls.

---

## Quick start

```bash
cd booklypro
npm install
npm run dev
```

Open <http://localhost:5173>. The app self-seeds 4 businesses, ~30 bookings, ~70 SMS / email log entries, conversations, and notifications on first load. No setup. No env vars. No backend to provision.

## What this is

Every flow the app advertises works end-to-end against a local store. Stripe checkouts process. AI assistants stream their answers character by character. Reminders log to the SMS & email outboxes. Tier upgrades, refunds, branding tweaks — they all persist for the rest of the session and reset on demand.

A prospect's session never collides with anyone else's. There is no shared backend, no shared database, no account to create.

## Role tiles

`/login` shows three tiles. Each drops the prospect straight into a populated workspace:

| Tile | Lands on | Highlights |
|---|---|---|
| **Ada Reyes** · Customer | `/me/discover` | Two-business cross-tenant view, message threads, reschedule/cancel, saved businesses |
| **Rosa Mendez** · Staff | `/staff/bloom-and-co` | Staff-only view — own calendar, own hours, customer messages |
| **Maya Bloom** · Admin | `/admin/bloom-and-co` | Salon admin — multi-stylist calendar with drag-to-reassign, deposits, AI service descriptions, billing, branding |

There is no email / password / Google / signup flow. Tiles only.

The super-admin surface still exists at `/platform` (seeded data, MRR, tenants) for Adam to demo manually if a prospect asks about the platform side.

## Reset demo

Bottom-right of every authenticated page (and the role-picker) is a small **Reset demo** pill. It clears every `booklypro:*` key in `localStorage` — the seeded store, the per-role tour flags, the theme — and reloads. Useful between sales calls.

The tour replays automatically on next sign-in after a reset.

## Architecture

- **Vite + React 19 + TypeScript**, single-page app.
- **Tailwind v3** with a soft-consumer archetype — `rounded-3xl`, General Sans, sage primary + warm coral accent, light + dark.
- **`src/lib/store.ts`** — the entire application database. In-memory mirror, persisted to `localStorage` under `booklypro:store:v1`. Subscribers re-render on mutate.
- **`src/lib/seed.ts`** — fresh seed produced on first load. 4 businesses, 6 users, ~30 bookings (mix of past, upcoming, no-shows, cancellations), 5 conversation threads, SMS + email logs derived from the booking history.
- **`src/lib/api.ts`** — every read/write the UI does. Each function is named for what it does, not where it lives.
- **`src/lib/availability.ts`** — single source of truth for slot computation: weekly schedule → special-date overrides → time-off → blackout, with buffer math and DST-safe via `date-fns-tz`.
- **`src/lib/ai.ts`** — local simulation for all four AI features. Service descriptions stream character-by-character from a fixture library; the scheduling assistant matches against ~6 prompt patterns + a polite fallback; no-show risk and reschedule suggestions are deterministic heuristics shaped like the real model output.
- **`src/components/ProcessingModal.tsx`** — the 1.2 s "Processing payment" → check overlay used by the deposit step and tier switching.
- **`src/components/ResetDemo.tsx`** — the reset pill.

## External services

There are none. Stripe, Anthropic, Resend, Twilio — every external dependency is simulated locally:

| Real service | Demo behavior |
|---|---|
| Stripe Checkout (deposits) | Brief "Processing payment" modal, deposit recorded on the booking |
| Stripe Subscription tier switch | Brief processing modal, business tier flips |
| Stripe Customer Portal | Inline modal with fake invoices + a Visa ending in 4242 |
| Stripe refund | Status flips on cancellation, refund implied by policy |
| Anthropic streaming (service descriptions) | Fixture text streamed at ~30 chars/sec |
| Anthropic tool use (scheduling assistant) | Keyword-matched proposals against ~6 prompt patterns |
| Resend booking emails | Written to `s.emailLog`; surfaced nowhere by default |
| Twilio reminder SMS | Written to `s.smsLog`; surfaced under **Admin → SMS log** |

The UX matches what the real call would deliver — including the cadence and timing — so a prospect can't tell the difference.

## Deploying

The demo lives on two Firebase Hosting sites: `booklypro-lbma-staging` and `booklypro-lbma-prod`. Hosting is the only Firebase service in use; there's no Firestore, no Cloud Functions, no Auth, no Storage.

```bash
npm install -g firebase-tools          # one-time, if you don't have it
firebase login                          # one-time

npm run deploy:staging                  # builds and pushes to booklypro-lbma-staging
# → https://booklypro-lbma-staging.web.app

npm run deploy:prod                     # builds and pushes to booklypro-lbma-prod
# → https://booklypro-lbma-prod.web.app
```

Always staging first; click through every role tile before pushing prod.

## Testing

```bash
npm test           # vitest run — focused on availability + cancellation math
npm run typecheck  # tsc --noEmit
npm run build      # full prod build
```

## Layout

```
booklypro/
├── src/
│   ├── components/         # ui/, tutorial/, Logo, ThemeToggle, ProcessingModal, ResetDemo
│   ├── lib/                # types, api, store, availability, time, ai, auth, seed, theme
│   └── routes/             # Landing, Login (role tiles), booking/, customer/, staff/, admin/, platform/, onboarding/
├── firebase.json           # Hosting (staging + prod)
├── .firebaserc             # target → site mapping
└── tailwind.config.js
```
