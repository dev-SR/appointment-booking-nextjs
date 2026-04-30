# CLAUDE.md — Project Memory

## Project Overview
Doctor Appointment Booking System for the Bangladesh market. Next.js 16 App Router + TypeScript + Prisma 7 + SQLite (dev) / PostgreSQL (prod).

## Tech Stack
- **Framework**: Next.js 16 App Router (Server Components default, `"use client"` only for interactivity)
- **UI**: shadcn/ui primitives + Tailwind CSS v4
- **Forms**: React Hook Form + Zod (`zodResolver`)
- **Server State**: TanStack Query (React Query)
- **Client State**: Zustand (auth, booking, UI)
- **Auth**: NextAuth.js v5 — Phone OTP + Google/Facebook OAuth, JWT strategy
- **DB**: SQLite (dev via better-sqlite3) / PostgreSQL (prod via pg). Prisma 7 with adapter pattern
- **ORM**: Prisma 7 — client output: `app/generated/prisma`, singleton in `lib/prisma.ts`
- **Animation**: GSAP only (never Framer Motion). Import from `lib/animations/gsap.ts`
- **i18n**: Hybrid (next-i18next). Default locale: `bn`

## Authorization (PBAC)
**NEVER check role names. ALWAYS check permission keys.**
- Permission format: `resource:action[:scope]` (e.g., `appointments:cancel:any`)
- Auth service: `lib/services/authorization.service.ts`
- Frontend hook: `lib/hooks/usePermissions.ts` 
- Permission constants: `lib/services/authorization.types.ts` → `PERMISSIONS`
- Cache: `lib/services/permission-cache.ts` (LRU, 60s TTL)
- Super admin has `*` wildcard permission
- Scope hierarchy: `:any` includes `:own`; `:all` includes `:own` and `:assigned`

## Completed Phases
### Phase 1 — Foundation ✅
- Prisma schema (`prisma/schema.prisma`) with all models
- DB adapter pattern (`lib/prisma.ts`)
- PBAC authorization service
- NextAuth v5 config (`lib/auth.ts`)
- Seed data (`prisma/seed.ts`)

### Phase 2 — Core Entities ✅
- Doctor, Patient, Chamber, Schedule services (`lib/services/`)
- Full CRUD API routes (`app/api/`)
- Zod schemas (`lib/zod-schemas/`)

### Phase 3 — Slot Engine ✅
- `lib/services/slot-engine.service.ts` — generates available slots
- Flow: Load Schedule → Apply ScheduleException → Check Holiday → Generate slots → Exclude booked → Return
- No caching (per user decision)
- API: `GET /api/slots?doctorId=&date=` and `GET /api/slots/dates?doctorId=&from=&to=`
- Zod schemas: `lib/zod-schemas/slot.ts`

### Phase 4 — Booking Flow ✅
- `lib/services/booking-rules.service.ts` — validates booking constraints
- `lib/services/pricing.service.ts` — calculates fees (base + rules + coupons + credits)
- `lib/services/appointment.service.ts` — full lifecycle (create → cancel → check-in → complete → no-show)
- API routes: `/api/appointments` (GET, POST), `/api/appointments/[id]`, `[id]/cancel`, `[id]/check-in`, `[id]/complete`
- Zod schemas: `lib/zod-schemas/appointment.ts`
- Booking wizard: 7-step flow at `/booking` (components/booking/)
- Zustand store: `store/booking.store.ts`
- React Query hooks: `lib/hooks/use-slots.ts`, `lib/hooks/use-appointments.ts`
- Payment: Cash/Pay Later implemented. Online payment (bKash/Nagad/Stripe) deferred to Phase 6

### Phase 11 — Animations/UI ✅ (jumped ahead)
- GSAP animation system (`lib/animations/`)
- Landing page (`app/(public)/page.tsx`) with all sections
- `/about`, `/contact`, `/doctors` pages

## Portal Layouts
- Admin portal: `app/(portal)/admin/` with sidebar (`components/layouts/PortalSidebar.tsx`)
- Dashboard redirects to `/admin/appointments`
- Appointments dashboard with data table, filters, pagination

## Key Patterns
### API Route Pattern
```typescript
// 1. Rate limit (on public endpoints)
// 2. Auth: const session = await auth()
// 3. Zod validate body/params
// 4. Permission check: await requirePermission(userId, 'resource:action:scope')
// 5. Call service
// 6. Return { success: true, data } or { success: false, error }
```

### Response Shapes
```typescript
{ success: true, data: T }
{ success: false, error: 'PERMISSION_DENIED' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'RATE_LIMITED' }
{ success: false, validationErrors: ZodIssue[] }
```

### Currency
- All money in **paisa** (integer). Display as `৳ {amount / 100}`

### Prisma Import
```typescript
import prisma from '@/lib/prisma' // DEFAULT export
```

## File Structure Quick Reference
```
app/
├── (public)/        # Landing, /doctors, /about, /contact, /booking
├── (portal)/admin/  # Admin dashboard with sidebar
├── api/             # Route handlers
│   ├── appointments/  # CRUD + cancel/check-in/complete
│   ├── doctors/       # CRUD
│   ├── slots/         # GET available slots/dates
│   └── ...
lib/
├── services/        # Business logic (authorization, appointment, slot-engine, pricing, booking-rules)
├── hooks/           # React Query hooks (use-slots, use-appointments, usePermissions)
├── zod-schemas/     # Validation schemas
├── animations/      # GSAP setup
├── prisma.ts        # DB singleton
└── auth.ts          # NextAuth config
components/
├── booking/         # 7-step wizard components
├── layouts/         # PortalSidebar
├── landing/         # Landing page sections
├── providers/       # QueryProvider, I18nProvider, etc.
└── ui/              # shadcn primitives
store/
├── auth.store.ts    # Auth state + permissions
└── booking.store.ts # Booking wizard state
```

## Remaining Phases
- **Phase 5**: Queue (QueueEntry, walk-in, display screen)
- **Phase 6**: Payments (bKash/Nagad/Stripe providers, webhooks, refunds)
- **Phase 7**: Notifications (SMS/email providers, templates)
- **Phase 8**: Portal UIs (Receptionist, Doctor, Accountant, Patient portals)
- **Phase 9**: Audit Log system
- **Phase 10**: Reports (financial + operational, PDF/Excel)
- **Phase 12**: Optional modules (Redis, S3, calendar sync)
- **Phase 13**: Deployment (Docker, CI/CD)
