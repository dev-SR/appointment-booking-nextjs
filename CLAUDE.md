# CLAUDE.md — Project Memory

## Project Overview
Doctor Appointment Booking System for the Bangladesh market.
Next.js 16 App Router + TypeScript + Prisma 7 + SQLite (dev) / PostgreSQL (prod).

---

## Tech Stack

| Layer         | Technology                | Rule                                                                              |
| ------------- | ------------------------- | --------------------------------------------------------------------------------- |
| Framework     | Next.js 16 App Router     | Server Components default. `"use client"` only for interactivity/hooks/GSAP.      |
| Language      | TypeScript strict         | No `any`. Explicit interfaces everywhere.                                         |
| Styling       | Tailwind CSS v4           | No inline styles. Dark mode on all portals.                                       |
| UI            | shadcn/ui                 | All UI from shadcn primitives.                                                    |
| Forms         | React Hook Form + Zod     | `zodResolver` on every form. Schemas in `lib/zod-schemas/`.                       |
| Server State  | TanStack Query            | All API calls via RQ hooks. Never raw `fetch` in components.                      |
| Client State  | Zustand                   | Auth, permissions, booking flow, UI modals/toasts.                                |
| Auth          | NextAuth.js v5            | Google/Facebook OAuth + credentials. JWT only. No OTP.                            |
| DB (dev)      | SQLite via better-sqlite3 | `DB_TYPE=sqlite`. Prisma adapter: `PrismaBetterSqlite3`.                          |
| DB (prod)     | PostgreSQL via pg         | `DB_TYPE=postgres`. Prisma adapter: `PrismaPg`. Dockerized.                       |
| ORM           | Prisma 7                  | Client output: `app/generated/prisma`. Singleton in `lib/prisma.ts`.              |
| Auth/Perms    | PBAC                      | Never check role names. Always check permission keys (`resource:action[:scope]`). |
| Notifications | Modular                   | Always via `NotificationService`. Never call providers directly.                  |
| Payments      | Modular                   | Always via `PaymentService`. Never call providers directly.                       |
| i18n          | next-i18next              | `useTranslation()` everywhere. Default locale: `bn`.                              |
| Animation     | GSAP                      | All animation via `lib/animations/gsap.ts`. Never Framer Motion.                  |

---

## Authorization (PBAC) — Core Rules

**NEVER check role names. ALWAYS check permission keys.**

- Permission format: `resource:action[:scope]` — e.g. `appointments:cancel:any`
- Auth service: `lib/services/authorization.service.ts`
- Frontend hook: `lib/hooks/usePermissions.ts`
- Permission constants: `lib/services/authorization.types.ts` → `PERMISSIONS`
- Permission cache: `lib/services/permission-cache.ts` (LRU, 60s TTL)
- Super admin has `*` wildcard — grants all permissions
- Scope hierarchy: `:any` includes `:own`; `:all` includes `:own` and `:assigned`
- Client checks only hide/show UI — every API route and server action enforces server-side

---

## API Route Pattern (always follow this order)

```
1. Rate limit (on public endpoints)
2. const session = await auth()
3. Zod validate body/params
4. requirePermission(userId, 'resource:action:scope')
5. Call service
6. Return { success: true, data } or { success: false, error }
```

## Response Shapes

```typescript
{ success: true, data: T }
{ success: false, error: 'PERMISSION_DENIED' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'RATE_LIMITED' }
{ success: false, validationErrors: ZodIssue[] }  // HTTP 400
```

---

## Currency

All money stored in **paisa** (integer). Display as `৳ {amount / 100}` or `Tk {amount / 100}`.

---

## Prisma Import

```typescript
import prisma from '@/lib/prisma'  // DEFAULT export, singleton
```

---

## File Structure

```
app/
├── (public)/        # Landing, /doctors, /about, /contact, /booking
├── (auth)/          # /login, /register, /complete-profile, /unauthorized, /inactive
├── (portal)/        # /admin, /receptionist, /doctor, /accountant, /patient
├── display/         # Queue TV screen — public, no auth
└── api/             # Route handlers (thin controllers: validate → service)
    ├── auth/          # Permissions, profile
    ├── admin/         # Users, roles, permissions
    ├── appointments/  # CRUD + cancel/check-in/complete/reschedule
    ├── doctors/       # CRUD
    ├── slots/         # GET available slots/dates
    ├── queue/         # Queue display + management
    ├── payments/      # Initiate, webhook, refund
    └── reports/       # Financial + operational

lib/
├── prisma.ts
├── auth.ts
├── services/         # authorization, appointment, slot-engine, pricing, booking-rules, queue, report
├── notifications/    # NotificationService + providers (SMS/email/push)
├── payments/         # PaymentService + providers (bKash/Nagad/Stripe)
├── audit/            # AuditService (append-only, fire-and-forget)
├── hooks/            # React Query hooks (client only)
├── zod-schemas/
└── animations/       # GSAP setup + animation patterns

components/
├── ui/              # shadcn primitives
├── providers/       # QueryClient, Zustand, i18n ("use client")
├── animations/      # FadeIn, StaggerList, CountUp, AnimatedCard, RevealText
├── booking/         # 7-step wizard components
├── landing/         # Landing page sections
└── layouts/         # Portal sidebars + shell layouts

store/
├── auth.store.ts    # Auth state + permissions (Set<string>)
├── booking.store.ts # Booking wizard state
└── ui.store.ts      # Modals, toasts, sidebar

tests/
└── booking-flow.test.ts

public/locales/bn/
public/locales/en/
```

---

## Phase Order

```
Phase 1  · Foundation         ✅ Done
Phase 2  · Auth & PBAC        ✅ Done
Phase 3  · Portal Dashboards  ✅ Done
Phase 4  · Audit Log          Next
Phase 5  · Core Entities      Doctor · Patient · Chamber · Schedule
Phase 6  · Slot Engine        Slot generation · Exceptions · Availability API
Phase 7  · Booking Flow       Appointment create → pricing → payment initiation → confirmation
Phase 8  · Queue              QueueEntry · Walk-in · Display screen
Phase 9  · Payments           bKash/Nagad/Stripe · Cash/Offline · Receipt generation
Phase 10 · Notifications      SMS · Email · Templates
Phase 11 · Portal UIs         Receptionist · Doctor · Accountant · Patient full screens
Phase 12 · Reports            Financial + Operational · PDF/Excel export
Phase 13 · Animations/UI      GSAP · Landing page · Portal animations
Phase 14 · Optional           Redis · S3 · Calendar sync · WhatsApp · Web Push
Phase 15 · Deployment         Dockerfile · docker-compose · CI/CD
```

---

## Completed Phases

### Phase 1 — Foundation ✅
- Prisma schema (`prisma/schema.prisma`) with all models
- DB adapter factory pattern (`lib/prisma.ts`) — SQLite/PostgreSQL via env
- Seed data (`prisma/seed.ts`)

### Phase 2 — Auth & PBAC ✅
- PBAC authorization service (`lib/services/authorization.service.ts`)
- NextAuth v5 config (`lib/auth.ts`) — Google/Facebook OAuth + credentials. No OTP.
- Permission constants, LRU cache, and `usePermissions` hook

### Phase 3 — Portal Dashboards ✅
- Portal route guards (`requirePortalAccess`) — server-side, permission-based
- Dashboard shells for Admin, Receptionist, Doctor, Accountant, Patient with permission-aware widgets
- Role & Permission Management UI (`/admin/roles`) — permission matrix, create/clone roles, preview-as-role
- Portal switcher for multi-role users
- Auth routes: `/login`, `/register`, `/complete-profile`, `/unauthorized`, `/inactive`
- Post-login redirect by permission priority (no role-name checks)

### Phase 5 (Core Entities) ✅ — *built as original Phase 2*
- Doctor, Patient, Chamber, Schedule services (`lib/services/`)
- Full CRUD API routes (`app/api/`)
- Zod schemas (`lib/zod-schemas/`)

### Phase 6 (Slot Engine) ✅ — *built as original Phase 3*
- `lib/services/slot-engine.service.ts`
- API: `GET /api/slots?doctorId=&date=` and `GET /api/slots/dates?doctorId=&from=&to=`
- Fix: Memoized date ranges in `StepDate.tsx` to prevent infinite request loops

### Phase 7 (Booking Flow) ✅ — *built as original Phase 4*
- `lib/services/booking-rules.service.ts`, `pricing.service.ts`, `appointment.service.ts`
- API: `/api/appointments` (GET, POST), `[id]/cancel`, `[id]/check-in`, `[id]/complete`
- Booking wizard: 7-step flow at `/booking` (`components/booking/`)
- Zustand store: `store/booking.store.ts`
- Auto-selection via `?doctorId=` search param
- Cash/Pay Later implemented. Online payment deferred to Phase 9.
- Fix: Data mapping in `StepDoctor.tsx` (`data.data` path correction)

### Phase 13 (Animations/UI) ✅ — *jumped ahead*
- GSAP animation system (`lib/animations/`)
- Hybrid i18n setup (next-i18next, default locale `bn`)
- Landing page with all 9 sections, `/about`, `/contact`, `/doctors`

### Testing ✅
- `tests/booking-flow.test.ts` — end-to-end booking flow. Run with `npx tsx tests/booking-flow.test.ts`.

---

## Remaining Phases

### Phase 4 — Audit Log (next)
- Schema: `AuditLog` + `AuditLogSetting` models
- `lib/audit/audit.service.ts` — append-only, fire-and-forget, never throws
- `lib/audit/audit-settings.cache.ts` — per-resource on/off + retention days (5 min cache refresh)
- `lib/audit/audit-retention.cron.ts` — nightly purge past retention period
- Admin UI to toggle per resource and set retention
- Must audit: login events (staff), role changes, permission grant/revoke, account activation/deactivation, failed portal access, appointment mutations, payment actions, refunds
- Never log: payment secrets, OAuth tokens, full patient medical notes

### Phase 8 — Queue
- `QueueEntry` model — walk-ins get token numbers; booked patients auto-inserted at appointment time
- Doctor marks "Next" → triggers notification to next patient
- `/display` — public, no auth, polls every 10s, large text, configurable per chamber

### Phase 9 — Payments
- `lib/payments/payment.service.ts` — public API only; never call providers directly
- Providers: bKash, Nagad, Stripe; factory from `PAYMENT_PROVIDERS` env
- Single webhook handler; `gatewayTrxId` idempotency enforced
- All payment events audited

### Phase 10 — Notifications
- `lib/notifications/notification.service.ts` — public API only
- SMS: BulkSMS BD (default) + Twilio fallback; Email: SMTP/SES/SendGrid; Push: FCM
- Template engine with variable substitution + locale (bn/en)
- Failures log and continue — never fail a booking

### Phase 11 — Portal UIs (full screens)
- Receptionist: Fast Booking command palette, Today's Board, Walk-in, Check-in panel
- Doctor: Today's Patients, Schedule Calendar (read-only), Availability Manager, Profile Editor
- Accountant: Daily Collection, Outstanding Payments, Cash Register, Refunds, Invoice Generator
- Patient: 8-step booking wizard, My Appointments, Family Members, Favourite Doctors
- Admin: Doctor/Staff/Settings management, Master Calendar, Batch Operations

### Phase 12 — Reports
- Financial: revenue by period, refund rate, unpaid tracking
- Operational: booking volume, no-show rate, doctor load, peak hours
- Export PDF and Excel

### Phase 14 — Optional Modules
Redis · S3 · Google/Outlook Calendar · WhatsApp · Web Push · Sentry — all via env vars, all degrade gracefully.

### Phase 15 — Deployment
Multi-stage Dockerfile, docker-compose with PostgreSQL 16, CI/CD pipeline.