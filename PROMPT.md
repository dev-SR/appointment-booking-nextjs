# Doctor Appointment Booking System — Development Context

You are building a **Doctor Appointment & Scheduling Platform** for the Bangladesh market. Follow every rule in this document exactly. Read existing files before creating new ones.

---

## IMPLEMENTATION ORDER (follow this sequence — each phase depends on the prior)

```
Phase 1 · Foundation       DB schema → Prisma client → PBAC service → Auth (NextAuth)
Phase 2 · Core Entities    Doctor · Patient · Chamber · Schedule models + APIs
Phase 3 · Slot Engine      Slot generation · Exceptions · Availability API
Phase 4 · Booking Flow     Appointment create → pricing → payment initiation → confirmation
Phase 5 · Queue            QueueEntry · Walk-in · Display screen
Phase 6 · Payments         PaymentService · bKash/Nagad/Stripe · Cash counter/Offline payment · Receipt generation
Phase 7 · Notifications    NotificationService · SMS · Email adapters · Templates
Phase 8 · Portals UI       Admin · Receptionist · Doctor · Accountant · Patient (shadcn)
Phase 9 · Audit Log        AuditLog schema · AuditService · Retention cron
Phase 10 · Reports         Financial + Operational reports · PDF/Excel export
Phase 11 · Animations      GSAP setup · Landing page · Portal UI animations
Phase 12 · Optional        Redis · S3 · Calendar sync · WhatsApp · Web Push
Phase 13 · Deployment      Dockerfile · docker-compose · CI/CD
```

---
## COMPLETED PHASES & TASKS

- **Phase 1 (Foundation):** DB schema, Prisma client, PBAC service, and Auth (NextAuth) setup completed.
- **Phase 2 (Core Entities):** Doctor, Patient, Chamber, and Schedule models & APIs completed.
- **Phase 11 (Animations/UI):** GSAP animation system, hybrid i18n setup, and the complete Landing Page (`/`, `/about`, `/contact`, `/doctors`) implemented.

---
## PART 1: AUTHORIZATION ARCHITECTURE

### 1.1 Dynamic Permission-Based Access Control (PBAC)

**Do NOT use simple role-based access control (RBAC).** This system uses a fully dynamic, policy-driven authorization model where:

- **Permissions** are the atomic unit (not roles)
- **Roles** are named bundles of permissions — editable by Super Admin at runtime
- **Users** are assigned one or more roles
- **Every protected action** in the system is checked against a permission, not a role name
- The Super Admin can create new roles, rename existing ones, and reassign permissions — all from the Admin UI with zero code changes

#### Permission Model

Every permission is identified by a string in the format:
```
resource:action[:scope]
```

Examples:
```
appointments:create
appointments:read:own          # only own appointments
appointments:read:all          # all appointments in the system
appointments:cancel:own
appointments:cancel:any
doctors:read
doctors:update:own             # doctor editing their own profile
doctors:update:any             # admin editing any doctor profile
payments:read:own
payments:read:all
payments:refund
reports:view:financial
reports:view:operational
settings:manage
roles:manage                   # who can edit the permission system itself
patients:read:assigned         # doctor sees only their own patients
patients:read:all
queue:manage
invoices:generate
staff:manage
```

#### Database Schema for PBAC

```prisma
model Permission {
  id          String   @id @default(cuid())
  key         String   @unique  // e.g. "appointments:cancel:any"
  displayName String            // e.g. "Cancel Any Appointment"
  group       String            // e.g. "Appointments" — for UI grouping
  description String?
  createdAt   DateTime @default(now())

  rolePermissions RolePermission[]
}

model Role {
  id          String   @id @default(cuid())
  name        String   @unique  // e.g. "receptionist", "doctor", "accountant"
  displayName String            // e.g. "Receptionist"
  isSystem    Boolean  @default(false)  // system roles cannot be deleted, only modified
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  rolePermissions RolePermission[]
  userRoles       UserRole[]
}

model RolePermission {
  roleId       String
  permissionId String
  grantedAt    DateTime @default(now())
  grantedBy    String   // userId of admin who granted

  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
}

model UserRole {
  userId      String
  roleId      String
  assignedAt  DateTime @default(now())
  assignedBy  String   // userId of admin who assigned

  user        User @relation(fields: [userId], references: [id])
  role        Role @relation(fields: [roleId], references: [id])

  @@id([userId, roleId])
}

model User {
  id         String     @id @default(cuid())
  // ... other fields
  userRoles  UserRole[]
}
```

#### Authorization Service

File: `lib/services/authorization.service.ts`

```typescript
// The ONLY place permission checks happen on the server.
// Never check role names in business logic — always check permission keys.

export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true }
          }
        }
      }
    }
  });

  const permissions = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.key);
    }
  }
  return permissions;
}

export async function can(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.has(permission);
}

export async function canAny(userId: string, permissions: string[]): Promise<boolean> {
  const userPerms = await getUserPermissions(userId);
  return permissions.some(p => userPerms.has(p));
}

export async function requirePermission(userId: string, permission: string): Promise<void> {
  const allowed = await can(userId, permission);
  if (!allowed) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}
```

#### API Route Protection Pattern

```typescript
// app/api/appointments/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/services/authorization.service';
import { cancelAppointment } from '@/lib/services/appointment.service';
import { CancelAppointmentSchema } from '@/lib/zod-schemas/appointment.schema';
import { rateLimit } from '@/lib/middleware/rate-limit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Rate limit
  const limited = await rateLimit(req, { limit: 20, windowMs: 60_000 });
  if (limited) return NextResponse.json({ success: false, error: 'RATE_LIMITED' }, { status: 429 });

  // Auth
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });

  // Validate body
  const body = CancelAppointmentSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ success: false, validationErrors: body.error.errors }, { status: 400 });

  // Scope-aware permission check
  const appointment = await getAppointment(params.id);
  const isOwn = appointment.patientId === session.user.id;
  await requirePermission(session.user.id, isOwn ? 'appointments:cancel:own' : 'appointments:cancel:any');

  const result = await cancelAppointment(params.id, session.user.id, body.data.reason, req);
  return NextResponse.json({ success: true, data: result });
}
```

#### Frontend Permission Hook

```typescript
// lib/hooks/usePermissions.ts
// Permissions are fetched once after login and stored in Zustand.
// Components use this hook — never check role names in the UI.

export function usePermissions() {
  const permissions = useAuthStore(s => s.permissions); // Set<string> from Zustand
  return {
    can: (permission: string) => permissions.has(permission),
    canAny: (perms: string[]) => perms.some(p => permissions.has(p)),
  };
}

// Usage in component:
const { can } = usePermissions();
{can('appointments:cancel:any') && <CancelButton />}
```

#### Permission Caching

Cache the user permission set in the JWT payload (refreshed on role change) and in a short-lived server-side cache (Redis if available, otherwise in-memory LRU with 60s TTL). When an admin changes a role's permissions, invalidate the cache for all users who hold that role.

#### Default System Roles & Permissions (Seed Data)

Seed these on first run. Admins can modify permissions but cannot delete system roles.

| Role             | Key Permissions                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Super Admin**  | All permissions (`*`)                                                                                                                               |
| **Receptionist** | `appointments:create`, `appointments:read:all`, `appointments:cancel:any`, `queue:manage`, `patients:read:all`, `doctors:read`, `invoices:generate` |
| **Doctor**       | `appointments:read:own`, `appointments:update:own`, `patients:read:assigned`, `doctors:update:own`, `schedule:manage:own`                           |
| **Accountant**   | `payments:read:all`, `payments:refund`, `reports:view:financial`, `invoices:generate`                                                               |
| **Patient**      | `appointments:create`, `appointments:read:own`, `appointments:cancel:own`, `payments:read:own`                                                      |

Super Admin can create additional custom roles (e.g., "Senior Receptionist", "Head Doctor", "Department Manager") and assign any combination of permissions.

#### Admin UI for Permission Management

Route: `/admin/roles`

Features:
- List all roles with user count
- Create / rename / clone a role
- Permission matrix: rows = permission groups, columns = roles, cells = toggle checkboxes
- Cannot uncheck permissions from Super Admin role
- Cannot delete system roles (isSystem=true)
- Activity log of all permission changes (who changed what, when)
- "Preview as role" — see any portal as if you held that role

---

## PART 2: UI PORTALS BY PERMISSION

The application renders **one unified Next.js app** with dynamic navigation and page access controlled by permissions. There is no separate codebase per role — the layout adapts based on `usePermissions()`.

### 2.1 Portal Layout System

```
app/
├── admin/          # Requires: settings:manage OR reports:view:* OR staff:manage
├── doctor/         # Requires: doctors:update:own OR appointments:read:own
├── receptionist/   # Requires: appointments:create AND queue:manage
├── accountant/     # Requires: payments:read:all OR reports:view:financial
└── patient/        # Requires: authenticated + patient role
```

Each portal has its own layout component in `components/layouts/`. Navigation items are filtered at render time by `usePermissions()` — no hardcoded role checks.

### 2.2 Super Admin Portal (`/admin`)

**Sidebar navigation** (shown only if user has the relevant permission):

| Nav Item           | Required Permission                                    |
| ------------------ | ------------------------------------------------------ |
| Dashboard          | `reports:view:operational`                             |
| Doctors            | `doctors:read`                                         |
| Patients           | `patients:read:all`                                    |
| Staff & Roles      | `staff:manage`                                         |
| Role Permissions   | `roles:manage`                                         |
| Appointments       | `appointments:read:all`                                |
| Calendar (Master)  | `appointments:read:all`                                |
| Queue Management   | `queue:manage`                                         |
| Payments & Billing | `payments:read:all`                                    |
| Reports            | `reports:view:financial` or `reports:view:operational` |
| Settings           | `settings:manage`                                      |
| Audit Logs         | `settings:manage`                                      |

**Key admin UI screens**:
- **Dashboard**: KPI cards (today's bookings, revenue, check-ins, no-shows), peak hour chart, doctor load heatmap
- **Doctor Management**: List, create, edit, deactivate doctors; assign chambers; manage schedules
- **Staff Management**: Create staff accounts, assign roles, view activity logs
- **Role & Permission Matrix**: Full CRUD on roles; permission toggle grid grouped by resource
- **Master Calendar**: All doctors, all slots, color-coded by status; drag-to-reschedule
- **Batch Operations**: Batch cancel, doctor substitution, bulk notification send
- **System Settings**: Clinic branding, booking rules, fee configuration, holiday list, notification templates, payment provider config

### 2.3 Receptionist Portal (`/receptionist`)

**Purpose**: High-speed booking operations. Optimized for keyboard use.

| Nav Item         | Required Permission     |
| ---------------- | ----------------------- |
| Fast Booking     | `appointments:create`   |
| Today's Schedule | `appointments:read:all` |
| Walk-in Queue    | `queue:manage`          |
| Check-in         | `queue:manage`          |
| Patient Search   | `patients:read:all`     |
| Cash Register    | `payments:create`       |
| Appointments     | `appointments:read:all` |

**Key UI screens**:
- **Fast Booking ("Command Palette")**: `/` key opens a full-screen modal. Type to search doctor, specialty, or patient name. Arrow keys navigate. Enter selects. Tab moves between doctor → date → slot → confirm. Entire booking in < 10 seconds.
- **Today's Board**: Split view — left: appointment list by time, right: real-time queue display. Color-coded rows by status.
- **Walk-in Entry**: Quick-add walk-in patients to queue with estimated wait time shown immediately.
- **Check-in & Payment Panel**: Scan QR or search patient name/phone. Register cash received at counter, mark as "Paid", and one-click check-in. Late arrival flagging with override.

### 2.4 Doctor Portal (`/doctor`)

**Purpose**: View schedule, manage availability, see patient notes before sessions.

| Nav Item         | Required Permission      |
| ---------------- | ------------------------ |
| My Schedule      | `appointments:read:own`  |
| Today's Patients | `appointments:read:own`  |
| My Availability  | `schedule:manage:own`    |
| My Profile       | `doctors:update:own`     |
| Patient Notes    | `patients:read:assigned` |

**Key UI screens**:
- **Today's Patients**: List of today's appointments in time order. Expandable rows showing patient name, reason/symptoms (if provided), medical history snapshot, and appointment notes.
- **My Schedule Calendar**: Week view of own appointments. Click slot to view details. Cannot create/edit appointments (that's receptionist).
- **Availability Manager**: Set weekly template, block leave days, configure break times. Changes immediately reflected in the live slot engine.
- **Profile Editor**: Update bio, qualifications, photo. Chamber assignments managed by admin.

### 2.5 Accountant Portal (`/accountant`)

**Purpose**: Financial records only. No access to clinical data.

| Nav Item             | Required Permission      |
| -------------------- | ------------------------ |
| Daily Collection     | `payments:read:all`      |
| Outstanding Payments | `payments:read:all`      |
| Cash Register        | `payments:create`        |
| Refunds              | `payments:refund`        |
| Invoices             | `invoices:generate`      |
| Financial Reports    | `reports:view:financial` |

**Key UI screens**:
- **Daily Collection Summary**: Breakdown by payment method (bKash/Nagad/Cash/Card), by doctor, totals. Date picker.
- **Outstanding Payments**: List of "Pay Later" appointments not yet settled. Filter by doctor, date range.
- **Cash Register**: Screen to register offline/cash payments collected at the counter for outstanding invoices.
- **Refund Processing**: List of cancellations eligible for refund. Approve/reject with reason. Auto-triggers payment gateway refund call.
- **Invoice Generator**: Select appointment(s) → generate branded PDF invoice → download or email to patient.
- **Reports**: Revenue chart by period, refund rate, unpaid tracking. Export to PDF/Excel.

### 2.6 Patient Portal (`/patient`)

**Purpose**: Self-service. Clean, mobile-first design.

| Nav Item         | Required Permission     |
| ---------------- | ----------------------- |
| Book Appointment | `appointments:create`   |
| My Appointments  | `appointments:read:own` |
| My Family        | authenticated           |
| Payments         | `payments:read:own`     |
| Profile          | authenticated           |

**Key UI screens**:
- **Booking Flow** (multi-step wizard):
  1. Select specialty / doctor (searchable, filterable, shows rating and fee)
  2. Select chamber/location
  3. Pick date (calendar, grayed-out unavailable dates)
  4. Pick time slot (show estimated duration)
  5. Add appointment notes / symptoms (optional)
  6. Select family member or self
  7. Payment (bKash / Nagad / Card / Pay Later)
  8. Confirmation screen with QR code, Google Maps link, add-to-calendar button
- **My Appointments**: Upcoming and past. Upcoming: reschedule/cancel buttons (within policy). Past: download receipt, rebook button.
- **Favourite Doctors**: One-tap to start a booking with a previously visited doctor.
- **Family Members**: Add/remove sub-accounts. Book on their behalf.

### 2.7 Queue Display Screen (`/display`)

**Purpose**: Public TV/kiosk screen in the waiting room. No authentication required. Read-only.

- Shows: "Now Serving" (patient token), next 3 tokens in queue
- Auto-refreshes every 10 seconds via polling or SSE
- Full-screen mode, large text, high contrast
- Configurable per chamber/room

---

## PART 3 — NOTIFICATION SYSTEM

Business logic ONLY calls `NotificationService` — never providers directly.

```
lib/notifications/
├── notification.service.ts    # Public API
├── types.ts
├── template.engine.ts         # Variable substitution + locale (bn/en)
└── providers/
    ├── sms/
    │   ├── sms.interface.ts   # ISmsProvider
    │   ├── bulk-sms-bd.ts     # Default (Bangladesh)
    │   ├── twilio.ts          # Fallback
    │   └── index.ts           # Factory → env SMS_PROVIDER
    ├── email/
    │   ├── smtp.ts / ses.ts / sendgrid.ts
    │   └── index.ts           # Factory → env EMAIL_PROVIDER
    └── push/
        ├── fcm.ts
        └── index.ts
```

**Notification failures**: log and continue. Never fail a booking because SMS/email failed. Queue retries.

**Triggers**: `appointment.confirmed`, `appointment.reminder` (24h + 2h before), `appointment.cancelled`, `appointment.rescheduled`, `queue.next_patient`, `payment.received`, `payment.refunded`

---

## PART 4 — PAYMENT SYSTEM

Business logic ONLY calls `PaymentService` — never providers directly. All operations are idempotent.

```
lib/payments/
├── payment.service.ts         # Public API
├── types.ts                   # PaymentRequest, PaymentIntent, PaymentResult
└── providers/
    ├── payment.interface.ts   # IPaymentProvider
    ├── bkash.ts               # Primary
    ├── nagad.ts               # Secondary
    ├── stripe.ts              # International
    └── index.ts               # Factory → env PAYMENT_PROVIDERS
```

### PaymentService Public Methods
```typescript
getEnabledProviders(): EnabledProvider[]
initiatePayment(appointmentId, provider, amount): Promise<{ redirectUrl, paymentRecordId }>
confirmPayment(gatewayTrxId, webhookData): Promise<void>   // idempotent by gatewayTrxId
refund(paymentRecordId, reason, initiatedBy): Promise<RefundResult>
queryStatus(paymentRecordId): Promise<PaymentStatus>
```

### Webhook Endpoint
```typescript
// app/api/payments/webhook/route.ts — single handler for ALL gateways
// Provider identified from ?provider= query param
// Raw body required for signature verification
```

### Env Vars
```bash
PAYMENT_PROVIDERS=bkash,nagad,stripe
BKASH_APP_KEY= BKASH_APP_SECRET= BKASH_USERNAME= BKASH_PASSWORD= BKASH_BASE_URL=
NAGAD_MERCHANT_ID= NAGAD_MERCHANT_PRIVATE_KEY= NAGAD_BASE_URL=
STRIPE_SECRET_KEY= STRIPE_WEBHOOK_SECRET= STRIPE_PUBLISHABLE_KEY=
```

---

## PART 5 — TECH STACK

| Layer         | Technology                | Rule                                                                         |
| ------------- | ------------------------- | ---------------------------------------------------------------------------- |
| Framework     | Next.js 16 App Router     | Server Components default. `"use client"` only for interactivity/hooks/GSAP. |
| Language      | TypeScript strict         | No `any`. Explicit interfaces everywhere.                                    |
| Styling       | Tailwind CSS v4           | No inline styles. Dark mode on all portals.                                  |
| UI            | shadcn/ui                 | **All UI from shadcn primitives.** See `.agents/skills/shadcn/SKILL.md`.     |
| Forms         | React Hook Form + Zod     | `zodResolver` on every form. Schemas in `lib/zod-schemas/`.                  |
| Server State  | TanStack Query            | All API calls via RQ hooks. Never raw `fetch` in components.                 |
| Client State  | Zustand                   | Auth, permissions, booking flow, UI modals/toasts.                           |
| Auth          | NextAuth.js v5            | Phone OTP + Google/Facebook OAuth. JWT only.                                 |
| DB (dev)      | SQLite via better-sqlite3 | `DB_TYPE=sqlite`. Prisma adapter: `PrismaBetterSqlite3`.                     |
| DB (prod)     | PostgreSQL via pg         | `DB_TYPE=postgres`. Prisma adapter: `PrismaPg`. Dockerized.                  |
| ORM           | Prisma 7+                 | Client output: `app/generated/prisma`. Singleton in `lib/prisma.ts`.         |
| Auth/Perms    | PBAC (Part 1)             | Never check role names. Always check permission keys.                        |
| Notifications | Modular (Part 3)          | Always via `NotificationService`.                                            |
| Payments      | Modular (Part 4)          | Always via `PaymentService`.                                                 |
| i18n          | next-i18next              | `useTranslation()` everywhere. Default locale: `bn`.                         |
| Animation     | GSAP                      | All animation via `lib/animations/gsap.ts`. Never Framer Motion.             |

---

## PART 6 — DATA ARCHITECTURE

### Data Flow
```
Server Component → auth() + getUserPermissions() → Service → Prisma → DB
Client Component → usePermissions() → React Query hook → Route Handler → Service → Prisma → DB
```
Add `"use client"` only when the component needs hooks, browser APIs, or event listeners.

### Key Prisma Config
```typescript
// prisma.config.ts
import "dotenv/config"
import { defineConfig, env } from "prisma/config"
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: `tsx prisma/seed.ts` },
  datasource: { url: env("DATABASE_URL") },
})

// schema.prisma — switch provider based on environment
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}
datasource db {
  provider = env("DB_PROVIDER")   // "sqlite" or "postgresql"
}
```

```typescript
// lib/prisma.ts — adapter factory pattern
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaPg } from "@prisma/adapter-pg"
const adapter = process.env.DB_TYPE === "sqlite"
  ? new PrismaBetterSqlite3({ url: process.env.DATABASE_URL })
  : new PrismaPg({ connectionString: process.env.DATABASE_URL })
// singleton export with globalForPrisma pattern
```

### Project Structure
```
app/
├── (public)/        landing, /doctors, /book
├── (auth)/          /login, /register
├── (portal)/        /admin, /doctor, /receptionist, /accountant, /patient
├── display/         queue TV screen
└── api/             route handlers (thin controllers — validate → call service)

lib/
├── prisma.ts
├── auth.ts
├── services/        authorization, appointment, booking-rules, slot-engine, queue, report
├── notifications/   (Part 3)
├── payments/        (Part 4)
├── audit/           (Part 9)
├── animations/      gsap.ts, constants.ts, landing.animations.ts
├── zod-schemas/
└── hooks/           React Query hooks (client only)

components/
├── ui/              shadcn primitives
├── providers/       QueryClient, Zustand, i18n ("use client")
├── animations/      FadeIn, StaggerList, CountUp, AnimatedCard, RevealText
└── [feature]/

store/               auth.store.ts, booking.store.ts, ui.store.ts

public/locales/bn/   en/
```

---

## PART 7 — SECURITY CHECKLIST

Before generating any API code:
- [ ] Zod validation on body AND query params
- [ ] `await auth()` + `requirePermission()` before any data access
- [ ] Scope check: own vs any (based on resource ownership)
- [ ] Rate limiting on public endpoints (booking, OTP, payment webhooks)
- [ ] OTP re-verified for: cancellation, reschedule, payment, account deletion
- [ ] Audit log entry for: permission changes, appointment mutations, payment events
- [ ] No PII in logs or error messages
- [ ] Payment webhook signature verified before processing
- [ ] `gatewayTrxId` idempotency check before creating Payment record
- [ ] File uploads: images/PDF only, max 5MB
- [ ] CORS: no wildcard in production

---

## PART 8 — FEATURE SPECIFICATIONS

### Booking Flow (server-side)
1. Check `BookingRule` (lead time, same-day cutoff, cancellation deadline)
2. Check `PricingRule` (peak/off-peak, new/returning patient) + apply `Coupon` + `PatientCredit`
3. `finalFee = baseFee + adjustments - discounts - credits`
4. Create `Appointment { status: PENDING }` → Create `Payment { status: PENDING }`
5. Online payment → `paymentService.initiatePayment()` → return `redirectUrl`
6. Webhook → `paymentService.confirmPayment()` → `Payment=PAID`, `Appointment=CONFIRMED`
7. `notificationService.send({ templateKey: 'appointment.confirmed', ... })`

### Slot Engine
1. Load `Schedule` (weekly template) for doctor
2. Apply `ScheduleException` overrides (leave, holidays)
3. Generate raw slots using `slotInterval`
4. Subtract `pre_buffer_minutes` / `post_buffer_minutes` per `DoctorService`
5. Exclude slots with existing `Appointment` (status not in `[CANCELLED, NO_SHOW]`)
6. Cache result `slots:{doctorId}:{date}` — 5 min TTL (Redis if enabled, LRU otherwise)

### Queue Management
- Walk-ins get token number (`QueueEntry`). Booked patients auto-inserted at appointment time.
- Doctor marks "Next" → triggers SMS to next patient
- Display screen polls `/api/queue/display?chamberId=` every 10s

### Recurring Bookings
- `RecurringRule { frequency, interval, daysOfWeek, occurrences | endDate }`
- Cron generates instances 30 days ahead
- Edit scope: "This only" | "This and following" | "All"

---

## PART 9 — BANGLADESH-SPECIFIC

- **Phone**: `+8801[3-9]XXXXXXXX`. Primary identifier. Email optional.
- **Currency**: BDT. Store in paisa (integer). Display as Tk.
- **SMS**: Unicode Bengali. BulkSMS BD default, Twilio fallback.
- **Names/Addresses**: All entities have `nameEn` + `nameBn`, `addressEn` + `addressBn`.
- **Holidays**: Configurable BD public holiday list; auto-blocked in schedule.

---

## PART 10 — OPTIONAL MODULES

| Module            | Env Var                         | Default  |
| ----------------- | ------------------------------- | -------- |
| Redis Cache       | `REDIS_URL`                     | disabled |
| S3 Storage        | `STORAGE_PROVIDER=s3`           | `local`  |
| CDN               | `ASSET_PREFIX`                  | unset    |
| Google Calendar   | `GOOGLE_CALENDAR_ENABLED=true`  | false    |
| Outlook Calendar  | `OUTLOOK_CALENDAR_ENABLED=true` | false    |
| WhatsApp Business | `WHATSAPP_PROVIDER=meta`        | disabled |
| Web Push (FCM)    | `PUSH_PROVIDER=fcm`             | disabled |
| Error Tracking    | `SENTRY_DSN`                    | unset    |

All optional modules must degrade gracefully if disabled.

---

## PART 11 — DEPLOYMENT

### Local Dev (SQLite)
```bash
DB_TYPE=sqlite
DB_PROVIDER=sqlite
DATABASE_URL=file:./dev.db
```

### Production (Dockerized PostgreSQL)
```bash
DB_TYPE=postgres
DB_PROVIDER=postgresql
DATABASE_URL=postgresql://user:pass@db:5432/appointments
```

```dockerfile
# Dockerfile — multi-stage
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.9'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: appointments
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      retries: 10

  app:
    build: { context: ., target: runner }
    ports: ["3000:3000"]
    depends_on:
      db: { condition: service_healthy }
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/appointments
      DB_TYPE: postgres
    command: >
      sh -c "npx prisma migrate deploy && node server.js"

volumes:
  pgdata:
```

---

## PART 12 — TESTING

| Layer       | Tool                     | Coverage Target                                       |
| ----------- | ------------------------ | ----------------------------------------------------- |
| Unit        | Vitest + RTL + MSW       | 70%+ services, hooks, components, permissions         |
| Integration | Vitest + node-mocks-http | 60%+ API routes, DB queries, payment flows            |
| E2E         | Playwright               | 30%+ booking flow, check-in, payment, role management |

- Mock external APIs (payments, SMS, email). Never mock Prisma — use a real test DB.
- Permission system: dedicated tests for every permission key combination.

---

## PART 13 — ERROR HANDLING

```typescript
// API response shapes (always follow these):
{ success: true, data: T }
{ success: false, error: 'PERMISSION_DENIED' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'RATE_LIMITED', message?: string }
{ success: false, validationErrors: ZodIssue[] }  // HTTP 400
```

- **Payment failures**: idempotent. Log full gateway response. Never expose raw gateway errors to client.
- **Notification failures**: log and continue. Never fail a booking.
- **Frontend**: React Query error state + shadcn `AlertDestructive`. Unknown errors → generic message.

---

## PART 14 — PERFORMANCE

- `next/image` with proper `sizes` on all images
- `next/dynamic` for heavy components (calendar, report charts)
- Prisma: select only needed fields; never N+1; paginate all list endpoints (default 20, max 100)
- Permission set: cached in JWT + 60s in-memory LRU
- Slot availability: cached 5 min (Redis if enabled, in-memory LRU otherwise)

---

## PART 15 — AUDIT LOG SYSTEM

```prisma
model AuditLogSetting {
  id            String   @id @default(cuid())
  resourceType  String   @unique
  isEnabled     Boolean  @default(true)
  retentionDays Int?                      // null = keep forever
  updatedAt     DateTime @updatedAt
  updatedBy     String
}

model AuditLog {
  id             String      @id @default(cuid())
  createdAt      DateTime    @default(now())
  actorId        String?
  actorName      String?
  actorRole      String?
  actorIp        String?
  action         AuditAction
  resourceType   String
  resourceId     String
  resourceLabel  String?
  previousValue  Json?
  newValue       Json?
  changedFields  String[]
  metadata       Json?
  requestId      String?
  @@index([resourceType, resourceId])
  @@index([actorId])
  @@index([createdAt])
}

enum AuditAction {
  APPOINTMENT_CREATED APPOINTMENT_CONFIRMED APPOINTMENT_RESCHEDULED
  APPOINTMENT_CANCELLED APPOINTMENT_COMPLETED APPOINTMENT_NO_SHOW
  APPOINTMENT_CHECKED_IN APPOINTMENT_BATCH_CANCELLED
  PAYMENT_INITIATED PAYMENT_COMPLETED PAYMENT_FAILED
  PAYMENT_REFUND_INITIATED PAYMENT_REFUND_COMPLETED
  USER_REGISTERED USER_LOGIN USER_LOGOUT USER_LOGIN_FAILED
  USER_PROFILE_UPDATED USER_DEACTIVATED
  ROLE_CREATED ROLE_UPDATED ROLE_DELETED
  PERMISSION_GRANTED PERMISSION_REVOKED USER_ROLE_ASSIGNED USER_ROLE_REMOVED
  DOCTOR_PROFILE_UPDATED DOCTOR_SCHEDULE_UPDATED DOCTOR_STATUS_CHANGED
  NOTIFICATION_TEMPLATE_UPDATED SETTING_UPDATED AUDIT_SETTING_UPDATED
  SYSTEM_CRON_PURGE
}
```

```
lib/audit/
├── audit.service.ts           # Public API — ONLY entry for writing logs
├── audit-settings.cache.ts    # In-memory cache of settings (5 min refresh)
├── audit-retention.cron.ts    # Nightly purge of records past retention period
└── audit.types.ts
```

**Rules**: Append-only. Never throws (fire-and-forget). Admin can disable per resource type. Purge only via retention cron, never by user action.

```typescript
// Usage in any service:
await auditService.log({
  action: AuditAction.APPOINTMENT_CANCELLED,
  resourceType: 'appointment', resourceId: appointment.id,
  actorId: session.user.id,
  previousValue: { status: 'CONFIRMED' }, newValue: { status: 'CANCELLED' },
  changedFields: ['status'], req,
});
```

---

## PART 16 — GSAP ANIMATION SYSTEM

### Setup
```typescript
// lib/animations/gsap.ts — ONLY import source for GSAP in the entire app
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };
export const DURATION = { fast: 0.25, base: 0.45, slow: 0.8 };
export const EASE = { smooth: 'power2.out', bounce: 'back.out(1.4)', snappy: 'power3.out' };
```

### Reusable Animated Components (`components/animations/`)
`FadeIn` · `StaggerList` · `CountUp` · `AnimatedCard` · `RevealText` · `PageTransitionWrapper`

### Rules — Non-Negotiable
- ✅ Import GSAP **only** from `lib/animations/gsap.ts`
- ✅ Always use `gsap.context()` and return `ctx.revert()` in useEffect cleanup
- ✅ Respect `prefers-reduced-motion` — check `window.matchMedia('(prefers-reduced-motion: reduce)')` and skip animations if true
- ✅ `clearProps: 'all'` on enter animations after completion
- ✅ `useRef` for targets — never `document.querySelector` inside React
- ✅ Animate GPU-accelerated properties only: `x`, `y`, `scale`, `opacity`, `rotation`
- ❌ Never Framer Motion — GSAP is the sole animation library
- ❌ Never create tweens at module level (outside useEffect) — SSR crash
- ❌ Never import ScrollTrigger in server-side code

### Portal Animation Patterns
- **Tables**: rows fade+stagger in on React Query success
- **Modals/Drawers**: GSAP enter/exit overrides shadcn CSS transitions
- **KPI cards**: CountUp for numbers, border-pulse on data refresh
- **Calendar slots**: stagger fade-in on render or month change
- **Booking wizard**: slide out (x:-30, opacity:0) → slide in (x:30→0) on step change

---

## PART 17 — LANDING PAGE (`app/(public)/page.tsx`)

The public landing page is the primary marketing surface and the patient's entry point to booking. It is a **Server Component** with a single `"use client"` animation wrapper. Mobile-first, bilingual (bn/en toggle), SEO-optimised.

### Page Sections (in order)

```
1. Navbar
2. Hero
3. Stats Bar
4. How It Works
5. Featured Doctors
6. Why Choose Us
7. Testimonials
8. CTA Banner
9. Footer
```

---

### 1 — Navbar

**File**: `components/landing/Navbar.tsx` (`"use client"` — needs scroll state + GSAP)

- **Left**: Clinic logo + name (from `NEXT_PUBLIC_CLINIC_NAME`)
- **Centre**: Nav links — Home, Doctors, About, Contact (use `TransitionLink` from `next-transition-router`)
- **Right**: Language toggle (bn/en) · Dark mode toggle · **"Book Appointment"** CTA button (primary, shadcn `Button`)
- **Scroll behaviour**: Background becomes `bg-background/80 backdrop-blur` after 60px scroll (GSAP ScrollTrigger `onEnter`/`onLeaveBack`)
- **Mobile**: Hamburger → full-height slide-down sheet (GSAP, not CSS transition). Nav items stagger in.
- **Active route**: Underline indicator animates position with GSAP (not CSS)

---

### 2 — Hero Section

**File**: `components/landing/Hero.tsx` (`"use client"` — GSAP)

**Layout**: Two-column on desktop, stacked on mobile.

**Left column**:
- Small badge pill: "🇧🇩 বাংলাদেশের বিশ্বস্ত স্বাস্থ্যসেবা" / "Trusted Healthcare in Bangladesh"
- H1 heading (large, bold): "আপনার সুস্বাস্থ্যের জন্য সঠিক ডাক্তার খুঁজুন" / "Find the Right Doctor for Your Health"
- Subtext (muted): "ঘরে বসেই অ্যাপয়েন্টমেন্ট বুক করুন — bKash, Nagad বা ক্যাশে পেমেন্ট করুন" / "Book appointments from home — pay with bKash, Nagad, or cash"
- **Quick Search Bar** (shadcn `Command`-style input): Search specialty or doctor name → redirects to `/doctors?q=`
- Two CTA buttons: **"অ্যাপয়েন্টমেন্ট বুক করুন"** (primary) · "ডাক্তারদের দেখুন" (outline)
- Trust chips: ✅ `500+ ডাক্তার` · ⚡ `তাৎক্ষণিক কনফার্মেশন` · 🔒 `নিরাপদ পেমেন্ট`

**Right column**:
- Medical illustration or clinic photo (`next/image`, priority, LCP-optimised)
- Floating card overlays (GSAP float animation, infinite loop):
  - "✅ অ্যাপয়েন্টমেন্ট কনফার্ম হয়েছে" — slides in from right
  - "⭐ 4.9 — Dr. Rahman, Cardiology" — slides in from bottom-left

**GSAP**: Hero timeline animates on mount (badge → h1 → subtext → CTAs → image). See `lib/animations/landing.animations.ts`.

**CSS classes** (for GSAP targeting): `.hero-badge`, `.hero-heading`, `.hero-sub`, `.hero-cta`, `.hero-image`, `.hero-float-card`

---

### 3 — Stats Bar

**File**: `components/landing/StatsBar.tsx` (Server Component — data fetched server-side)

Four stat cards in a horizontal strip, full-width, subtle background:

| Stat      | Label (bn) | Label (en)          |
| --------- | ---------- | ------------------- |
| `10,000+` | নিবন্ধিত রোগী   | Registered Patients |
| `500+`    | বিশেষজ্ঞ ডাক্তার | Specialist Doctors  |
| `50+`     | বিশেষত্ব      | Medical Specialties |
| `4.9★`    | গড় রেটিং      | Average Rating      |

Numbers fetched from DB via `prisma` in the Server Component (count queries). GSAP CountUp animation fires on scroll (`.stat-number` + `data-target` attribute). CSS class: `.stats-section`, `.stat-card`, `.stat-number`.

---

### 4 — How It Works

**File**: `components/landing/HowItWorks.tsx` (Server Component)

Section heading: "কীভাবে কাজ করে?" / "How It Works"

Three steps in a horizontal flow (desktop) / vertical (mobile):

| Step | Icon | Title (bn) | Title (en)    | Description                                                                       |
| ---- | ---- | ---------- | ------------- | --------------------------------------------------------------------------------- |
| 1    | 🔍    | ডাক্তার খুঁজুন   | Find a Doctor | Search by specialty, location, or name. View ratings, fees, and available slots.  |
| 2    | 📅    | সময় বেছে নিন  | Pick a Time   | Choose your preferred date and time slot. Same-day and advance booking available. |
| 3    | ✅    | বুক করুন     | Book & Pay    | Confirm your appointment. Pay instantly via bKash, Nagad, or pay at the clinic.   |

SVG connector line between steps on desktop. GSAP draw-on animation for the connector. Each step card: `.step-card`. Connectors: `.step-connector path`.

---

### 5 — Featured Doctors

**File**: `components/landing/FeaturedDoctors.tsx` (Server Component — fetches top-rated doctors)

Section heading: "আমাদের বিশেষজ্ঞ ডাক্তারগণ" / "Our Specialist Doctors"

**Filter tabs** (shadcn `Tabs`): All · Cardiology · Neurology · Orthopedics · Dermatology · Pediatrics (specialties from DB)

**Doctor card** (`components/landing/DoctorCard.tsx`, CSS class `.doctor-card`):
```
┌─────────────────────────────────┐
│  [Avatar 80px]                  │
│  Dr. Ahmed Rahman               │
│  MBBS, MD — Cardiologist        │
│  ⭐ 4.8  (124 reviews)          │
│  📍 Dhaka Medical Chamber       │
│  💰 Tk 800 consultation fee     │
│  [Book Appointment →] button    │
└─────────────────────────────────┘
```
Grid: 4 columns desktop / 2 tablet / 1 mobile. Max 8 cards shown. "সকল ডাক্তার দেখুন →" link to `/doctors`.

Data: `prisma.doctor.findMany({ where: { isFeatured: true }, take: 8, include: { specialty, chambers } })`

---

### 6 — Why Choose Us

**File**: `components/landing/WhyUs.tsx` (Server Component)

Section heading: "কেন আমাদের বেছে নেবেন?" / "Why Choose Us?"

Six feature cards in a 3×2 grid:

| Icon | Title (en)           | Description                                                 |
| ---- | -------------------- | ----------------------------------------------------------- |
| ⚡    | Instant Confirmation | Get confirmed in seconds, not hours. No phone calls needed. |
| 💳    | Pay Your Way         | bKash, Nagad, card, or cash at clinic — your choice.        |
| 📱    | Mobile First         | Book from anywhere, on any device, in under 2 minutes.      |
| 🔔    | Smart Reminders      | SMS + app reminders so you never miss an appointment.       |
| 👨‍👩‍👧    | Family Accounts      | Book for your entire family from a single account.          |
| 🔒    | Secure & Private     | Your medical data is encrypted and never shared.            |

Each card: shadcn `Card` with icon, title, description. Hover: subtle lift (GSAP, not CSS `hover:`).

---

### 7 — Testimonials

**File**: `components/landing/Testimonials.tsx` (`"use client"` — carousel)

Section heading: "রোগীরা যা বলছেন" / "What Our Patients Say"

Carousel using `embla-carousel-react` (already in dependencies). Auto-plays, pauses on hover.

**Testimonial card** (CSS class `.testimonial-card`):
```
┌─────────────────────────────────────┐
│  ⭐⭐⭐⭐⭐                          │
│  "খুবই সহজে অ্যাপয়েন্টমেন্ট নিতে │
│   পারলাম। ডাক্তার সাহেব অনেক ভালো │
│   দেখলেন।"                          │
│                                     │
│  [Avatar] Fatema Begum              │
│           Dhaka                     │
└─────────────────────────────────────┘
```

Show 3 cards visible on desktop, 1 on mobile. GSAP: alternating slide-in (odd cards from left, even from right) on scroll.

Seed 6 testimonials in `prisma/seed.ts` (model: `Testimonial { id, nameEn, nameBn, bodyEn, bodyBn, rating, location, avatarUrl, isVisible }`).

---

### 8 — CTA Banner

**File**: `components/landing/CtaBanner.tsx` (Server Component, CSS class `.cta-section`)

Full-width section with gradient background (`bg-primary`):

- Heading: "আজই আপনার অ্যাপয়েন্টমেন্ট বুক করুন" / "Book Your Appointment Today"
- Subtext: "হাজারো রোগীর বিশ্বাসের প্ল্যাটফর্মে যোগ দিন" / "Join thousands of patients who trust us"
- Two buttons: **"এখনই বুক করুন"** (white, solid) · "আরও জানুন" (white, outline)

GSAP: scale + fade in on scroll.

---

### 9 — Footer

**File**: `components/landing/Footer.tsx` (Server Component)

Four columns:

| Column           | Content                                                         |
| ---------------- | --------------------------------------------------------------- |
| **Logo + About** | Clinic name, 1-line tagline, social icons (Facebook, WhatsApp)  |
| **Quick Links**  | Home · Doctors · Book Appointment · About Us · Contact          |
| **Specialties**  | Cardiology · Neurology · Orthopedics · Dermatology · Pediatrics |
| **Contact**      | 📞 Phone · 📧 Email · 📍 Address (bilingual) · 🕐 Hours             |

Bottom bar: Copyright · Privacy Policy · Terms of Service · Language toggle

---

### SEO

```typescript
// app/(public)/page.tsx — Server Component
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'ডাক্তার অ্যাপয়েন্টমেন্ট | YourClinic',
  description: 'বাংলাদেশের সেরা ডাক্তারদের সাথে অনলাইনে অ্যাপয়েন্টমেন্ট বুক করুন।',
  keywords: ['doctor appointment', 'ডাক্তার', 'appointment booking', 'bangladesh'],
  openGraph: { title: '...', description: '...', images: ['/og-image.jpg'] },
}
```

---

### GSAP Animation Map (Landing)

All timelines defined in `lib/animations/landing.animations.ts`, called from a single `"use client"` wrapper:

```typescript
// components/landing/LandingAnimations.tsx
"use client"
import { useRef, useEffect } from 'react'
import { initLandingAnimations } from '@/lib/animations/landing.animations'
export function LandingAnimations({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    return initLandingAnimations(ref.current) // returns ctx.revert()
  }, [])
  return <div ref={ref}>{children}</div>
}

// app/(public)/page.tsx — wrap the whole page:
export default function LandingPage() {
  return (
    <LandingAnimations>
      <Navbar />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <FeaturedDoctors />
      <WhyUs />
      <Testimonials />
      <CtaBanner />
      <Footer />
    </LandingAnimations>
  )
}
```

| Section      | CSS Class                                                | Animation                                |
| ------------ | -------------------------------------------------------- | ---------------------------------------- |
| Navbar       | —                                                        | Slide down + stagger items on mount      |
| Hero left    | `.hero-badge`, `.hero-heading`, `.hero-sub`, `.hero-cta` | Staggered fade-up timeline on mount      |
| Hero right   | `.hero-image`, `.hero-float-card`                        | Fade-in from right + infinite float loop |
| Stats        | `.stats-section`, `.stat-number`                         | CountUp on scroll enter (once)           |
| Steps        | `.step-card`, `.step-connector path`                     | Fade-up per card + SVG draw-on           |
| Doctors      | `.doctor-card`                                           | Stagger fade-up on scroll                |
| Testimonials | `.testimonial-card`                                      | Alternate slide-in (left/right)          |
| CTA          | `.cta-section`                                           | Scale + fade on scroll                   |

---

## DELIVERABLE STANDARD

Produce production-grade, type-safe, i18n-ready, animated code. Every file must:
- Pass `npm run typecheck` with zero errors
- Have Zod validation on all inputs
- Use shadcn primitives (see `.agents/skills/shadcn/SKILL.md`)
- Have a corresponding test file
- Follow the PBAC pattern — zero role-name checks

**Do not introduce patterns not defined in this document.**