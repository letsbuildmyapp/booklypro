# BooklyPro

A multi-tenant booking and reservation SaaS — public booking pages, four role surfaces, deposits via Stripe, AI scheduling assistance, reminders.

Built as the third agency-portfolio showcase for [letsbuildmyapp.com](https://letsbuildmyapp.com), alongside CourseStack (memberships) and TalentBoard (recruiting). This one is the SaaS proof: the agency can ship multi-tenant scheduling that fits salons, studios, tutors, repair shops, restaurants — anywhere appointments drive revenue.

---

## Quick start

```bash
cd booklypro
npm install
npm run dev
```

Open <http://localhost:5173>. The app seeds 4 demo businesses, ~30 bookings, and 6 user accounts on first run (stored in `localStorage`).

### Demo accounts

All passwords are accepted in demo mode (auth is mocked client-side — see "Production wiring" below). Sign in at `/login` with any of these emails:

| Email | Role | Notes |
|---|---|---|
| `ada@example.com` | Customer | Bookings across 2 businesses; cross-tenant demo |
| `owner@bloomandco.salon` | Admin (Bloom & Co. Salon, Team tier) | Full admin surface |
| `rosa@bloomandco.salon` | Staff (Bloom & Co.) | Calendar + hours |
| `owner@stillwateryoga.com` | Admin (Stillwater Yoga, Pro tier) | AI assistant unlocked |
| `owner@northbridgetutors.com` | Admin (Northbridge Tutors, Solo tier) | Single-staff flow |
| `platform@booklypro.app` | Super-admin | Tenants table, MRR, suspension |

To reset seed data, in browser devtools: `localStorage.removeItem('booklypro:store:v1')` then refresh.

---

## What's in here

```
booklypro/
├── src/
│   ├── components/         # ui/, tutorial/, ProtectedRoute, ThemeToggle, Logo
│   ├── lib/                # types, api, store, availability, time, ai, auth, theme
│   └── routes/             # Landing, Login, SignUp, booking/, customer/, staff/, admin/, platform/, onboarding/
├── functions/              # Cloud Functions (TypeScript, Node 20)
│   └── src/
│       ├── ai/             # 4 Anthropic-backed handlers
│       ├── stripe/         # Checkout + Customer Portal + webhook
│       ├── triggers/       # onBookingCreated, onBookingStatusChanged
│       ├── scheduled/      # 24h/2h reminders, daily staff digest
│       └── availability.ts # server mirror of slot computation
├── firebase.json           # Hosting (staging+prod), Firestore, Storage, Functions, Emulators
├── firestore.rules         # First-class multi-tenant + role rules
└── firestore.indexes.json
```

---

## Stack

Per `STACK.md`. Specifics for this project:

- **Vite + React 18 + TypeScript** (also tested through `tsc -b`)
- **Tailwind v3** + custom shadcn-style primitives in `src/components/ui/*`
- **General Sans** display + text (loaded from Fontshare with `font-display: swap`)
- **OKLCH-derived palette** in HSL CSS vars (Tailwind v3 limitation; OKLCH source values noted in `src/index.css`)
- **rounded-3xl** primary radius (`--radius: 1.5rem`)
- **Soft consumer** archetype — generous whitespace, big touch targets (48px on the public booking flow), gentle Framer Motion springs
- **date-fns + date-fns-tz** for all booking timezone math
- **@dnd-kit** for the admin master-calendar drag-to-reassign
- **Recharts** for the dashboard
- **Vitest** for unit tests
- **Firebase**: Hosting (two sites), Functions (Node 20), Firestore, Storage
- **Anthropic SDK** in Cloud Functions only — `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`, prompt caching enabled
- **Stripe** subscriptions (Checkout + Customer Portal) + deposit PaymentIntents at booking time
- **Resend** for transactional email; **Twilio** integration is a documented stub

---

## Visual differentiation vs prior portfolio apps

| | CourseStack | TalentBoard | **BooklyPro** |
|---|---|---|---|
| Archetype | Editorial / paper | Dense pro-tool | **Soft consumer** |
| Type | Fraunces + Inter | Geist + Geist Mono | **General Sans + General Sans** |
| Radius | rounded-md | rounded-none | **rounded-3xl** |
| Modes | Light only | Light + dark | **Light + dark** |
| Primary hue | Terracotta / aubergine | Electric green / cyan | **Soft sage green** |
| Accent | — | — | **Warm coral** |

---

## Architecture decisions worth knowing

### Data layer

The frontend uses an **in-memory + localStorage store** (`src/lib/store.ts`) that mirrors Firestore collection shapes. Every public function in `src/lib/api.ts` is named after the Firestore operation it would perform in production. Swap-to-Firestore is mechanical — for each function, replace the `getStore()` / `mutate()` calls with `getDocs()` / `setDoc()` / `updateDoc()`. The data shapes already match.

### Availability computation

`src/lib/availability.ts` is the source of truth. The function:

1. Walks the date range in the business timezone
2. Resolves each day's windows from: weekly schedule → special-date overrides → time-off subtraction → blackout exclusion
3. Slots within those windows in step minutes (`min(30, service duration)`)
4. Excludes any slot where (candidate ± buffers) overlaps an existing confirmed booking ± buffers
5. For "any staff" mode, deduplicates by start time

The same algorithm is mirrored in `functions/src/availability.ts` so server-side `getAvailability()` returns identical results, with a 60-second cache in `_availabilityCache/{hashKey}` Firestore docs.

DST: handled by `date-fns-tz`; we never do `new Date()` math on bookings without going through `wallClockToUtc` / `utcToZoned`.

### Multi-tenant security

`firestore.rules` enforces tenant isolation at the database layer:

- Customers read/write only their own bookings + their own conversations
- Staff read bookings they own; can update status fields only
- Owners (admin) read/write everything in their business
- Super-admin reads all; writes are gated except for status changes
- Public booking page reads are restricted to `active === true` rows

### AI features

All four AI features go through Cloud Functions. The frontend calls `VITE_FUNCTIONS_URL/<name>`; if unset, `src/lib/ai.ts` falls back to deterministic mock output that matches the model's response shape. This lets the demo run end-to-end without an Anthropic key, but flipping to real responses is a single env var.

| Feature | Model | Why |
|---|---|---|
| Service description writer | `claude-sonnet-4-6` | Streaming, 2-4 sentence copywriting |
| No-show risk score | `claude-haiku-4-5-20251001` | Cheap classification with cached system prompt |
| Reschedule suggestions | `claude-sonnet-4-6` | Pattern recognition over past bookings |
| Smart scheduling assistant | `claude-opus-4-7` | Tool-use, multi-step reasoning, confirmation gating |

Prompt caching is enabled on system prompts and any context block over 1k tokens.

---

## Production wiring

The demo runs against an in-memory store with mocked Stripe / Anthropic / SMS. Wiring real services:

### Firebase

1. `firebase login`, `firebase use --add` to attach the project ID
2. Enable Firestore, Storage, Authentication (Email/password + Google) in the console
3. Create two Hosting sites: `booklypro-staging` and `booklypro`. Map them in `.firebaserc`.
4. Fill `.env.local` from `.env.example` (Firebase web config — these are public)
5. Replace the in-memory store calls in `src/lib/api.ts` with Firestore SDK calls (TODO marker)

### Cloud Functions

1. `cd functions && npm install`
2. Copy `.env.example` → `.env`, fill secrets (never put these in `VITE_*`)
3. `firebase deploy --only functions`
4. Set `VITE_FUNCTIONS_URL` in `.env.local` to the deployed URL
5. AI features and Stripe become real

### Stripe

1. Create three Products + Prices in Stripe (Solo $19, Team $59, Pro $149)
2. Set `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_PRO` in functions config
3. Add a webhook endpoint pointing at `stripeWebhook` Cloud Function URL; capture the signing secret as `STRIPE_WEBHOOK_SECRET`
4. Use test cards (`4242 4242 4242 4242`) for the deposit flow

### Resend

`RESEND_API_KEY` in functions/.env. Verify the sending domain (`booklypro.app` in code — change to yours).

### Twilio (SMS reminders) — **stub by design**

For the demo, SMS messages are written to a `smsLog` Firestore collection and surfaced under **Admin → SMS log** with a banner. To enable live sending, add `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID`, `TWILIO_FROM_NUMBER` and replace the `db.collection("smsLog").add(...)` call in `functions/src/scheduled/send-reminders.ts` with a Twilio API call.

### Stripe Connect — **out of scope**

Deposits in this demo go to a single platform Stripe account, with `businessId` in payment metadata. A real product would use Stripe Connect to settle directly to each business's bank account. Documented as a follow-up.

---

## Deploying

```bash
# 1. build the frontend
npm run build

# 2. staging
firebase deploy --only hosting:booklypro-staging,functions,firestore:rules,storage

# 3. smoke test the staging URL — book with a deposit, check SMS log, run the AI assistant

# 4. prod
firebase deploy --only hosting:booklypro,functions,firestore:rules,storage
```

Always staging-first.

---

## Testing

```bash
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run build      # full prod build
```

Coverage focuses on the most error-prone code: the availability engine (DST, buffers, time-off subtraction, double-booking prevention) and cancellation policy charge math.

Playwright e2e on the customer golden path is scaffolded (TODO: add `tests/customer-golden.spec.ts`) but not run in CI for the demo.

---

## Decisions to revisit with Alex

These are autonomous calls made during build that are worth a second look:

1. **Tier names + pricing** — went with **Solo $19 / Team $59 / Pro $149** monthly. Names are placeholders; pricing is in the right zip code for the segment but not market-tested.
2. **Primary palette hue** — soft sage green (~`oklch(0.65 0.085 160)` light, `oklch(0.78 0.09 160)` dark). Coral accent (~`oklch(0.72 0.18 28)`). Distinct from CourseStack's terracotta/aubergine and TalentBoard's electric green/cyan, but the exact saturation could land warmer or cooler depending on Alex's brand preference.
3. **Booking status color scale** — confirmed (sage), completed (slate), no-show (coral), cancelled (muted gray), rescheduled (amber). The amber/coral distinction is intentional but worth a second eye for AA contrast in dark mode.
4. **Soft consumer + rounded-3xl** as the archetype — chose this to differentiate from TalentBoard's dense-pro feel and to match the *target customer* (small-business owners who would balk at a "professional tool" aesthetic). If Alex's audience research suggests admins want a denser surface, the admin layout can be tightened to rounded-2xl + 14px body without touching the public booking flow.
5. **Single platform Stripe account** vs Stripe Connect — went single-account with `businessId` metadata for the demo. Real product needs Connect for direct deposits to business bank accounts. **High-priority real-product gap.**
6. **SMS as Firestore stub log** vs live Twilio — stub by design; toggled by `TWILIO_AUTH_TOKEN` env var. Documented as a real-product gap. Not a hidden mock — there's a banner in the admin SMS log.
7. **Four seeded businesses** — Bloom & Co. Salon (Team), Stillwater Yoga (Pro), Northbridge Tutors (Solo), Wagging Trail Pet Spa (Team). Real-feeling copy and Unsplash imagery. Picked variety: salon (multi-staff, deposits), yoga (drop-in classes, restorative private), tutoring (online-only, single-staff), pet spa (anxiety-aware copy, multi-staff).
8. **Tour storage keys** — `booklypro:tutorial_seen:{customer|staff|admin|superadmin}`. One key per role per device per spec.
9. **Marketing copy tone** — calm, plain-spoken, "respect everyone's time." Avoids exclamation points, superlatives, growth-hacker energy. If Alex wants something punchier for the front page, the Landing.tsx hero is a 5-minute rewrite.
10. **Cross-tenant customer demo** — Ada Reyes has bookings at Bloom & Co. *and* Wagging Trail to demonstrate the multi-business "Saved" flow. If reviewers find this confusing during demos, the customer can be split.
11. **Frontend in-memory store** as the demo data layer — call this out in any walkthrough so reviewers don't assume Firestore is wired. The migration is mechanical (every function in `src/lib/api.ts` maps 1:1 to a Firestore op).

---

## Tech that is *not* in here

- **PostHog + Sentry instrumentation** — `.env.example` has the keys; wire calls in `main.tsx` after the demo lands.
- **i18n** — copy is en-US only.
- **Customer recurring bookings** (rrule is installed but only used by demo for future use) — common ask in this space; would land as `services/{id}.recurrence` + `bookings/{id}.recurrenceId`.
- **Waitlist** — when a desired slot is full, customer joins waitlist, gets notified if it opens. ~3 days of work; common follow-up.
- **Multi-language booking pages** — businesses serving non-English customers will want this.
