# Doctor Appointment Booking System — Development Context

You are building a **Doctor Appointment & Scheduling Platform** for the Bangladesh market. Follow every rule in this document exactly. Read existing files before creating new ones.

---

## IMPLEMENTATION ORDER

```
Phase 1  · Foundation         DB schema → Prisma client → seed data
Phase 1.2  · Core Entities      Doctor · Patient · Chamber · Schedule models + APIs
Phase 2  · Auth & PBAC        NextAuth (OAuth + credentials) · PBAC service · Permission constants · usePermissions hook
Phase 3  · Portal Dashboards  Auth routes · Portal route guards · Dashboard shells · Permission-aware navigation · Role management UI
Phase 4 · Portal UIs         Receptionist · Doctor · Accountant · Patient full screens
Phase 5  · Audit Log          AuditLog schema · AuditService · Retention cron · Admin settings UI
Phase 6  · Slot Engine        Slot generation · Exceptions · Availability API
Phase 7  · Booking Flow       Appointment create → pricing → payment initiation → confirmation
Phase 8  · Queue              QueueEntry · Walk-in · Display screen
Phase 9  · Payments           PaymentService · bKash/Nagad/Stripe · Cash/Offline · Receipt generation
Phase 10 · Notifications      NotificationService · SMS · Email adapters · Templates
Phase 12 · Reports            Financial + Operational · PDF/Excel export
Phase 13 · Animations/UI      GSAP setup · Landing page · Portal UI animations
Phase 14 · Optional           Redis · S3 · Calendar sync · WhatsApp · Web Push
Phase 15 · Deployment         Dockerfile · docker-compose · CI/CD
```

---

## COMPLETED PHASES & TASKS

- **Phase 1 (Foundation):** DB schema, Prisma client, seed data completed.
- **Phase 2 (Auth & PBAC):** NextAuth v5 with Google/Facebook OAuth + credentials, PBAC authorization service, permission constants, cache, and `usePermissions` hook completed. No OTP.
- **Phase 3 (Portal Dashboards):** Auth routes, portal route guards, dashboard shells with permission-aware widgets, Role & Permission Management UI, portal switcher, and post-login redirect logic completed.
- **Phase 5 (Core Entities):** Doctor, Patient, Chamber, and Schedule models & APIs completed.
- **Phase 6 (Slot Engine):** Slot generation engine, availability APIs, and fix for infinite request loops in `StepDate.tsx` completed.
- **Phase 7 (Booking Flow):** 7-step booking wizard with auto-selection support (`?doctorId=`) and full appointment lifecycle APIs completed. Cash/Pay Later implemented; online payment deferred to Phase 9.
- **Phase 13 (Animations/UI):** GSAP animation system, hybrid i18n setup, and the complete Landing Page (`/`, `/about`, `/contact`, `/doctors`) implemented.

---

## PART 1: AUTHORIZATION ARCHITECTURE

### 1.1 Dynamic Permission-Based Access Control (PBAC)

**Do NOT use role-based access control.** This system is fully dynamic and policy-driven:

- **Permissions** are the atomic unit, not roles.
- **Roles** are named bundles of permissions — editable by Super Admin at runtime.
- **Users** are assigned one or more roles.
- Every protected action is checked against a permission key, never a role name.
- The Super Admin can create roles, rename them, and reassign permissions from the Admin UI with zero code changes.

#### Permission Format

```
resource:action[:scope]
```

Examples: `appointments:create`, `appointments:read:own`, `appointments:cancel:any`, `doctors:update:own`, `payments:refund`, `reports:view:financial`, `roles:manage`, `patients:read:assigned`

#### Database Schema for PBAC

```prisma
model Permission {
  id          String   @id @default(cuid())
  key         String   @unique
  displayName String
  group       String
  description String?
  createdAt   DateTime @default(now())
  rolePermissions RolePermission[]
}

model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  displayName String
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  rolePermissions RolePermission[]
  userRoles       UserRole[]
}

model RolePermission {
  roleId       String
  permissionId String
  grantedAt    DateTime @default(now())
  grantedBy    String
  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])
  @@id([roleId, permissionId])
}

model UserRole {
  userId     String
  roleId     String
  assignedAt DateTime @default(now())
  assignedBy String
  user       User @relation(fields: [userId], references: [id])
  role       Role @relation(fields: [roleId], references: [id])
  @@id([userId, roleId])
}
```

#### Authorization Service

`lib/services/authorization.service.ts` — the ONLY place permission checks happen server-side. Exports:
- `getUserPermissions(userId): Promise<Set<string>>`
- `can(userId, permission): Promise<boolean>`
- `canAny(userId, permissions[]): Promise<boolean>`
- `requirePermission(userId, permission): Promise<void>` — throws `ForbiddenError` if denied

#### Frontend Permission Hook

`lib/hooks/usePermissions.ts` — permissions loaded once after login, stored in Zustand as `Set<string>`. Exposes `can(permission)` and `canAny(permissions[])`. Never check role names in the UI.

#### Permission Caching

Cache the permission set in the JWT payload. Refresh on role changes. Server-side: LRU with 60s TTL (Redis if enabled). When an admin changes a role's permissions, invalidate the cache for all users who hold that role.

#### Default System Roles & Permissions

| Role             | Key Permissions                                                                                                                                                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Super Admin**  | `*` (all)                                                                                                                                                                                                                                                                                                        |
| **Receptionist** | `appointments:create`, `appointments:read:all`, `appointments:cancel:any`, `appointments:reschedule:any`, `appointments:checkin:any`, `queue:manage`, `patients:create`, `patients:read:all`, `patients:update:any`, `doctors:read`, `chambers:read`, `specialties:read`, `payments:create`, `invoices:generate` |
| **Doctor**       | `appointments:read:own`, `appointments:update:own`, `appointments:complete:own`, `patients:read:assigned`, `doctors:update:own`, `schedule:manage:own`                                                                                                                                                           |
| **Accountant**   | `payments:read:all`, `payments:create`, `payments:update:any`, `payments:refund`, `reports:view:financial`, `invoices:generate`                                                                                                                                                                                  |
| **Patient**      | `appointments:create`, `appointments:read:own`, `appointments:cancel:own`, `appointments:reschedule:own`, `payments:read:own`, `patients:read:own`, `patients:update:own`, `invoices:view:own`                                                                                                                   |

System roles cannot be deleted. Super Admin permissions cannot be unchecked.

#### Full Permission Key Reference

```
appointments:create           appointments:read:own          appointments:read:all
appointments:cancel:own       appointments:cancel:any        appointments:reschedule:own
appointments:reschedule:any   appointments:checkin:any       appointments:complete:own
appointments:update:own       doctors:read                   doctors:create
doctors:update:own            doctors:update:any             doctors:read:all
patients:create               patients:read:own              patients:read:all
patients:read:assigned        patients:update:own            patients:update:any
queue:manage                  payments:create                payments:read:own
payments:read:all             payments:update:any            payments:refund
invoices:generate             invoices:view:own              reports:view:financial
reports:view:operational      settings:manage                roles:manage
staff:manage                  audit:view                     chambers:read
chambers:manage               specialties:read               specialties:manage
schedule:manage:own           notifications:send             notifications:templates:manage
dashboard:view:admin          dashboard:view:receptionist    dashboard:view:doctor
dashboard:view:accountant     dashboard:view:patient
```

---

## PART 2: PHASE 2 — AUTH & PBAC

### Authentication

**No OTP.** Authentication uses:
- Google OAuth
- Facebook OAuth
- Credentials (email + password) for staff accounts created by admins

Rules:
- New public users registering via OAuth or credentials receive the Patient role and a Patient profile automatically.
- Staff accounts are created only by users with `staff:manage`. Staff cannot self-register into privileged portals.
- `User.isActive=false` blocks all portal access → `/inactive`.
- Login must update `lastLoginAt`, session permissions, and preferred locale.
- Logout clears: Zustand auth store, React Query protected cache, NextAuth session.

### Session Claims

NextAuth JWT exposes only:
```typescript
session.user = {
  id, email, nameEn, nameBn,
  profileImageUrl, preferredLocale, permissions
}
```

JWT permissions are loaded from `getUserPermissions(userId)` on sign-in. The client auth store mirrors these as a `Set<string>`. Client checks only hide/show UI — every API route and server action enforces server-side.

The wildcard `*` grants all permissions through the Super Admin role only. Scope hierarchy: `:any` includes `:own`; `:all` includes `:own` and `:assigned`.

---

## PART 3: PHASE 3 — PORTAL DASHBOARDS & AUTH ROUTES

### Auth Routes (`app/(auth)/`)

| Route               | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `/login`            | OAuth + credentials login                                   |
| `/register`         | Patient self-registration                                   |
| `/complete-profile` | Required for missing name/locale/profile fields after OAuth |
| `/unauthorized`     | Authenticated but missing required permission               |
| `/inactive`         | Account exists but `isActive=false`                         |

### Portal Route Guards

One reusable server-side guard:
```typescript
await requirePortalAccess({
  session,
  any: ["dashboard:view:admin", "settings:manage"],
  redirectTo: "/unauthorized"
})
```

Guard behavior:
- No session → `/login?callbackUrl=<current path>`
- Missing permission → `/unauthorized`
- Inactive user → `/inactive`
- Missing required profile fields → `/complete-profile`
- Public pages and `/display` remain accessible without login

| Portal          | Access Requirement                                                                          |
| --------------- | ------------------------------------------------------------------------------------------- |
| `/admin`        | `dashboard:view:admin` OR `settings:manage` OR `roles:manage` OR `reports:view:operational` |
| `/receptionist` | `dashboard:view:receptionist` OR (`appointments:create` AND `queue:manage`)                 |
| `/doctor`       | `dashboard:view:doctor` OR `appointments:read:own` OR `schedule:manage:own`                 |
| `/accountant`   | `dashboard:view:accountant` OR `payments:read:all` OR `reports:view:financial`              |
| `/patient`      | `dashboard:view:patient` OR authenticated with `appointments:read:own`                      |

### Post-Login Dashboard Redirect (permission-based, never role-name-based)

1. `dashboard:view:admin` or `settings:manage` → `/admin`
2. `dashboard:view:receptionist` → `/receptionist`
3. `dashboard:view:doctor` → `/doctor`
4. `dashboard:view:accountant` → `/accountant`
5. `dashboard:view:patient` or `appointments:read:own` → `/patient`
6. otherwise → `/unauthorized`

Users with multiple dashboards see a portal switcher in the sidebar showing only destinations they have permission for.

### Dashboard Widget Permission Matrix

Dashboard pages render each widget independently. Holding the dashboard route permission does not grant access to all widgets — each widget checks its own permission.

**Admin Dashboard (`/admin`):**

| Widget                  | Required Permission                          |
| ----------------------- | -------------------------------------------- |
| Operational KPI cards   | `reports:view:operational`                   |
| Revenue KPI cards       | `reports:view:financial`                     |
| Today's bookings table  | `appointments:read:all`                      |
| Doctor load heatmap     | `doctors:read:all` + `appointments:read:all` |
| Queue status            | `queue:manage`                               |
| Payment summary         | `payments:read:all`                          |
| Pending staff invites   | `staff:manage`                               |
| Role change alerts      | `roles:manage`                               |
| Audit activity feed     | `audit:view`                                 |
| System setting warnings | `settings:manage`                            |

**Receptionist Dashboard (`/receptionist`):**

| Widget                    | Required Permission           |
| ------------------------- | ----------------------------- |
| Fast booking launcher     | `appointments:create`         |
| Today's appointment board | `appointments:read:all`       |
| Walk-in queue             | `queue:manage`                |
| Check-in action           | `appointments:checkin:any`    |
| Patient quick search      | `patients:read:all`           |
| Create patient            | `patients:create`             |
| Cash collection panel     | `payments:create`             |
| Generate invoice          | `invoices:generate`           |
| Reschedule appointment    | `appointments:reschedule:any` |
| Cancel appointment        | `appointments:cancel:any`     |

**Doctor Dashboard (`/doctor`):**

| Widget                          | Required Permission         |
| ------------------------------- | --------------------------- |
| Today's patients                | `appointments:read:own`     |
| Patient notes snapshot          | `patients:read:assigned`    |
| My schedule calendar            | `appointments:read:own`     |
| Availability editor             | `schedule:manage:own`       |
| Complete appointment            | `appointments:complete:own` |
| Update appointment notes/status | `appointments:update:own`   |
| Profile editor                  | `doctors:update:own`        |

**Accountant Dashboard (`/accountant`):**

| Widget                            | Required Permission      |
| --------------------------------- | ------------------------ |
| Daily collection summary          | `payments:read:all`      |
| Outstanding payments              | `payments:read:all`      |
| Cash register                     | `payments:create`        |
| Payment correction/reconciliation | `payments:update:any`    |
| Refund queue                      | `payments:refund`        |
| Invoice generation                | `invoices:generate`      |
| Financial reports                 | `reports:view:financial` |
| Export report                     | `reports:view:financial` |

**Patient Dashboard (`/patient`):**

| Widget                     | Required Permission           |
| -------------------------- | ----------------------------- |
| Book appointment CTA       | `appointments:create`         |
| Upcoming appointments      | `appointments:read:own`       |
| Cancel appointment         | `appointments:cancel:own`     |
| Reschedule appointment     | `appointments:reschedule:own` |
| Payment history            | `payments:read:own`           |
| Download invoice           | `invoices:view:own`           |
| Profile and family members | `patients:update:own`         |
| Favourite doctors          | authenticated patient         |

### Navigation Config

A single `portalNavigation` config object drives sidebar, mobile nav, breadcrumbs, command menu, quick actions, and portal switcher. Navigation items filtered at render time by `usePermissions()`. Never hardcode role checks in navigation. Use shadcn `Skeleton` for loading state, shadcn `Alert` for authorization failures.

### Admin Sidebar Nav Items (shown only if user holds the required permission)

| Nav Item           | Required Permission                                    |
| ------------------ | ------------------------------------------------------ |
| Dashboard          | `reports:view:operational`                             |
| Doctors            | `doctors:read`                                         |
| Patients           | `patients:read:all`                                    |
| Staff & Roles      | `staff:manage`                                         |
| Role Permissions   | `roles:manage`                                         |
| Appointments       | `appointments:read:all`                                |
| Master Calendar    | `appointments:read:all`                                |
| Queue              | `queue:manage`                                         |
| Payments & Billing | `payments:read:all`                                    |
| Reports            | `reports:view:financial` OR `reports:view:operational` |
| Settings           | `settings:manage`                                      |
| Audit Logs         | `audit:view`                                           |

### Role & Permission Management UI (`/admin/roles`)

- List all roles with user count.
- Create / rename / clone a role.
- Permission matrix: rows = permission groups, columns = roles, cells = toggle checkboxes.
- Cannot uncheck Super Admin permissions. Cannot delete system roles (`isSystem=true`).
- "Preview as role" — renders any portal as if the viewer held that role.
- Activity log of all permission changes (who changed what, when).

### Auth & Permissions API Endpoints

| Endpoint                        | Method       | Rule                                           |
| ------------------------------- | ------------ | ---------------------------------------------- |
| `/api/auth/permissions`         | GET          | authenticated                                  |
| `/api/auth/refresh-permissions` | POST         | authenticated                                  |
| `/api/auth/complete-profile`    | POST         | authenticated                                  |
| `/api/admin/users`              | GET/POST     | `staff:manage`                                 |
| `/api/admin/users/[id]/roles`   | PUT          | `staff:manage` + `roles:manage`                |
| `/api/admin/roles`              | GET/POST     | `roles:manage`                                 |
| `/api/admin/roles/[id]`         | PATCH/DELETE | `roles:manage`; system roles cannot be deleted |
| `/api/admin/permissions`        | GET          | `roles:manage`                                 |

### Phase 3 Acceptance Criteria

- Login redirects to the correct dashboard by permission priority.
- Each portal layout blocks unauthorized access server-side.
- Each dashboard renders only permitted widgets.
- No role-name checks anywhere in client navigation.
- API routes enforce the same permissions as their widgets.
- Admin can assign roles; permission changes affect navigation and API access after cache invalidation.
- Tests cover: login redirect priority, portal guards, permission refresh, role changes, at least one allowed/denied widget per portal.

---

## PART 4: PHASE 4 — AUDIT LOG SYSTEM

### Schema

```prisma
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

model AuditLogSetting {
  id            String   @id @default(cuid())
  resourceType  String   @unique
  isEnabled     Boolean  @default(true)
  retentionDays Int?
  updatedAt     DateTime @updatedAt
  updatedBy     String
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

### Service Structure

```
lib/audit/
├── audit.service.ts           # Public API — ONLY entry for writing logs
├── audit-settings.cache.ts    # In-memory cache of settings (5 min refresh)
├── audit-retention.cron.ts    # Nightly purge of records past retention period
└── audit.types.ts
```

### Rules

- Append-only. Never throws (fire-and-forget). Never deletes records except via retention cron.
- Admin can disable audit per resource type and configure retention days from the Admin UI.
- Always audit: login success/failure (staff users), role assignment/removal, permission grant/revoke, account activation/deactivation, failed forbidden portal access, appointment mutations, payment actions, refund approvals.
- Never log: payment secrets, OAuth tokens, full patient medical notes.

---

## PART 5: BOOKING FLOW (Phase 7)

### Server-Side Flow

1. Check `BookingRule` (lead time, same-day cutoff, cancellation deadline)
2. Check `PricingRule` (peak/off-peak, new/returning patient) + apply `Coupon` + `PatientCredit`
3. `finalFee = baseFee + adjustments - discounts - credits`
4. Create `Appointment { status: PENDING }` → Create `Payment { status: PENDING }`
5. Online payment → `paymentService.initiatePayment()` → return `redirectUrl`
6. Webhook → `paymentService.confirmPayment()` → `Payment=PAID`, `Appointment=CONFIRMED`
7. `notificationService.send({ templateKey: 'appointment.confirmed', ... })`

### Slot Engine (Phase 6)

1. Load `Schedule` (weekly template) for doctor
2. Apply `ScheduleException` overrides (leave, holidays)
3. Generate raw slots using `slotInterval`
4. Subtract `pre_buffer_minutes` / `post_buffer_minutes`
5. Exclude slots with existing `Appointment` (status not in `[CANCELLED, NO_SHOW]`)
6. Cache result `slots:{doctorId}:{date}` — 5 min TTL (Redis if enabled, LRU otherwise)

### Recurring Bookings

- `RecurringRule { frequency, interval, daysOfWeek, occurrences | endDate }`
- Cron generates instances 30 days ahead
- Edit scope: "This only" | "This and following" | "All"

---

## PART 6: PORTAL UI SCREENS (Phase )

One unified Next.js app. Layout adapts by permissions, not role names. Build on top of Phase 3 shells.

### Portal Layout System

```
app/(portal)/
├── admin/          layout.tsx — sidebar + shell
├── receptionist/   layout.tsx
├── doctor/         layout.tsx
├── accountant/     layout.tsx
└── patient/        layout.tsx
```

### Admin Portal (`/admin`)

- **Dashboard** — KPI cards, peak hour chart, doctor load heatmap
- **Doctor Management** — list, create, edit, deactivate; assign chambers; manage schedules
- **Staff Management** — create staff accounts, assign roles, view activity
- **Role & Permission Matrix** — full CRUD; permission toggle grid grouped by resource
- **Master Calendar** — all doctors, all slots, color-coded by status; drag-to-reschedule
- **Batch Operations** — batch cancel, doctor substitution, bulk notification send
- **System Settings** — clinic branding, booking rules, fee config, holiday list, notification templates, payment provider config

### Receptionist Portal (`/receptionist`)

Optimized for keyboard use and speed.

- **Fast Booking** — `/` key opens full-screen command palette; type to search doctor/specialty/patient; entire booking in < 10 seconds
- **Today's Board** — split view: appointment list by time (left), real-time queue (right); color-coded rows by status
- **Walk-in Entry** — quick-add walk-in patients to queue with estimated wait time
- **Check-in & Payment Panel** — search by name or scan QR; register cash at counter; one-click check-in; late arrival flagging with override

### Doctor Portal (`/doctor`)

- **Today's Patients** — expandable rows: patient name, reason/symptoms, history snapshot, appointment notes
- **My Schedule Calendar** — week view, own appointments, read-only
- **Availability Manager** — weekly template, leave blocks, break times; changes reflected immediately in slot engine
- **Profile Editor** — bio, qualifications, photo; chamber assignments managed by admin

### Accountant Portal (`/accountant`)

No access to clinical data.

- **Daily Collection Summary** — breakdown by payment method and doctor; date picker
- **Outstanding Payments** — "Pay Later" appointments not yet settled; filter by doctor, date range
- **Cash Register** — register offline/cash payments for outstanding invoices
- **Refund Processing** — approve/reject with reason; auto-triggers gateway refund call
- **Invoice Generator** — select appointment(s) → branded PDF → download or email to patient
- **Financial Reports** — revenue chart by period, refund rate, unpaid tracking; export PDF/Excel

### Patient Portal (`/patient`)

Mobile-first.

- **Booking Wizard** (8 steps): specialty/doctor → chamber → date → slot → notes → family member → payment → confirmation (QR code + add-to-calendar + Google Maps link)
- **My Appointments** — upcoming (reschedule/cancel within policy) + past (download receipt, rebook)
- **Family Members** — add/remove sub-accounts; book on their behalf
- **Favourite Doctors** — one-tap to rebook a previously visited doctor

### Queue Display Screen (`/display`)

Public, no auth. TV/kiosk screen for waiting room.
- Shows "Now Serving" token + next 3 tokens
- Polls every 10 seconds (polling or SSE)
- Full-screen, large text, high contrast, configurable per chamber

---

## PART 7: PAYMENT SYSTEM (Phase 9)

Business logic ONLY calls `PaymentService`. Never call providers directly. All operations idempotent.

```
lib/payments/
├── payment.service.ts
├── types.ts
└── providers/
    ├── payment.interface.ts
    ├── bkash.ts
    ├── nagad.ts
    ├── stripe.ts
    └── index.ts               # Factory from PAYMENT_PROVIDERS env
```

**Public methods:** `getEnabledProviders()`, `initiatePayment(appointmentId, provider, amount)`, `confirmPayment(gatewayTrxId, webhookData)` (idempotent), `refund(paymentRecordId, reason, initiatedBy)`, `queryStatus(paymentRecordId)`

**Webhook:** `app/api/payments/webhook/route.ts` — single handler for all gateways; provider identified from `?provider=`; raw body required for signature verification; `gatewayTrxId` idempotency checked before creating any Payment record.

**Rules:** Never expose raw gateway errors to client. Log full gateway response on failure. All payment events audited.

---

## PART 8: NOTIFICATION SYSTEM (Phase 10)

Business logic ONLY calls `NotificationService`. Never call providers directly.

```
lib/notifications/
├── notification.service.ts
├── types.ts
├── template.engine.ts         # Variable substitution + locale (bn/en)
└── providers/
    ├── sms/                   # BulkSMS BD (default), Twilio (fallback); factory from SMS_PROVIDER
    ├── email/                 # SMTP / SES / SendGrid; factory from EMAIL_PROVIDER
    └── push/                  # FCM; factory from PUSH_PROVIDER
```

**Triggers:** `appointment.confirmed`, `appointment.reminder` (24h + 2h before), `appointment.cancelled`, `appointment.rescheduled`, `queue.next_patient`, `payment.received`, `payment.refunded`

**Rule:** Failures log and continue. Never fail a booking because a notification failed.

---

## PART 9: QUEUE SYSTEM (Phase 8)

- `QueueEntry` model — walk-ins get token numbers; booked patients auto-inserted at appointment time
- Doctor marks "Next" → triggers notification to next patient
- `/display` — public, no auth, polls `/api/queue/display?chamberId=` every 10s; large text, high contrast, configurable per chamber

---

## PART 10: TECH STACK

| Layer         | Technology                | Rule                                                                         |
| ------------- | ------------------------- | ---------------------------------------------------------------------------- |
| Framework     | Next.js 16 App Router     | Server Components default. `"use client"` only for interactivity/hooks/GSAP. |
| Language      | TypeScript strict         | No `any`. Explicit interfaces everywhere.                                    |
| Styling       | Tailwind CSS v4           | No inline styles. Dark mode on all portals.                                  |
| UI            | shadcn/ui                 | All UI from shadcn primitives.                                               |
| Forms         | React Hook Form + Zod     | `zodResolver` on every form. Schemas in `lib/zod-schemas/`.                  |
| Server State  | TanStack Query            | All API calls via RQ hooks. Never raw `fetch` in components.                 |
| Client State  | Zustand                   | Auth, permissions, booking flow, UI modals/toasts.                           |
| Auth          | NextAuth.js v5            | Google/Facebook OAuth + credentials. JWT only. **No OTP.**                   |
| DB (dev)      | SQLite via better-sqlite3 | `DB_TYPE=sqlite`. Prisma adapter: `PrismaBetterSqlite3`.                     |
| DB (prod)     | PostgreSQL via pg         | `DB_TYPE=postgres`. Prisma adapter: `PrismaPg`. Dockerized.                  |
| ORM           | Prisma 7                  | Client output: `app/generated/prisma`. Singleton in `lib/prisma.ts`.         |
| Auth/Perms    | PBAC                      | Never check role names. Always check permission keys.                        |
| Notifications | Modular                   | Always via `NotificationService`.                                            |
| Payments      | Modular                   | Always via `PaymentService`.                                                 |
| i18n          | next-i18next              | `useTranslation()` everywhere. Default locale: `bn`.                         |
| Animation     | GSAP                      | All animation via `lib/animations/gsap.ts`. Never Framer Motion.             |

---

## PART 11: DATA ARCHITECTURE

### Data Flow

```
Server Component → auth() + getUserPermissions() → Service → Prisma → DB
Client Component → usePermissions() → React Query hook → Route Handler → Service → Prisma → DB
```

Add `"use client"` only when the component needs hooks, browser APIs, or event listeners.

### Project Structure

```
app/
├── (public)/        # Landing, /doctors, /about, /contact, /booking
├── (auth)/          # /login, /register, /complete-profile, /unauthorized, /inactive
├── (portal)/        # /admin, /receptionist, /doctor, /accountant, /patient
├── display/         # Queue TV screen — public
└── api/             # Route handlers (validate → call service)

lib/
├── prisma.ts
├── auth.ts
├── services/        # authorization, appointment, booking-rules, slot-engine, queue, report
├── notifications/
├── payments/
├── audit/
├── animations/
├── zod-schemas/
└── hooks/           # React Query hooks (client only)

components/
├── ui/              # shadcn primitives
├── providers/       # QueryClient, Zustand, i18n
├── animations/      # FadeIn, StaggerList, CountUp, AnimatedCard, RevealText
├── booking/         # 7-step wizard
├── landing/         # Landing page sections
└── layouts/         # Portal sidebars + shells

store/               # auth.store.ts, booking.store.ts, ui.store.ts
tests/
public/locales/bn/
public/locales/en/
```

---

## PART 12: API ROUTE PATTERN

Every route handler follows this exact order:

```
1. Rate limit (public endpoints only)
2. const session = await auth()
3. Zod validate body AND query params
4. requirePermission(userId, 'resource:action:scope')  — scope-aware
5. Call service
6. Return { success: true, data } or { success: false, error }
```

### Response Shapes

```typescript
{ success: true, data: T }
{ success: false, error: 'PERMISSION_DENIED' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'RATE_LIMITED', message?: string }
{ success: false, validationErrors: ZodIssue[] }  // HTTP 400
```

---

## PART 13: SECURITY CHECKLIST

Before writing any API route:
- [ ] Zod validation on body AND query params
- [ ] `await auth()` + `requirePermission()` before any data access
- [ ] Scope check: own vs any (based on resource ownership)
- [ ] Rate limiting on all public endpoints
- [ ] Audit log entry for: permission changes, appointment mutations, payment events
- [ ] No PII in logs or error messages
- [ ] Payment webhook signature verified before processing
- [ ] `gatewayTrxId` idempotency check before creating Payment record
- [ ] File uploads: images/PDF only, max 5MB
- [ ] CORS: no wildcard in production

---

## PART 14: BANGLADESH-SPECIFIC

- **Phone**: `+8801[3-9]XXXXXXXX`. Primary contact field. Email is the login identifier.
- **Currency**: BDT. Store in paisa (integer). Display as `Tk {amount / 100}` or `৳ {amount / 100}`.
- **SMS**: Unicode Bengali. BulkSMS BD default, Twilio fallback.
- **Names/Addresses**: All entities have `nameEn` + `nameBn`, `addressEn` + `addressBn`.
- **Holidays**: Configurable BD public holiday list; auto-blocked in schedule.

---

## PART 15: GSAP ANIMATION SYSTEM (Phase 13)

### Setup

`lib/animations/gsap.ts` — ONLY import source for GSAP in the entire app. Registers `ScrollTrigger`. Exports `gsap`, `ScrollTrigger`, `DURATION`, `EASE` constants.

### Reusable Animated Components

`components/animations/` — `FadeIn`, `StaggerList`, `CountUp`, `AnimatedCard`, `RevealText`, `PageTransitionWrapper`

### Rules (non-negotiable)

- Import GSAP ONLY from `lib/animations/gsap.ts`
- Always use `gsap.context()` and return `ctx.revert()` in `useEffect` cleanup
- Respect `prefers-reduced-motion` — skip animations if true
- Use `useRef` for targets — never `document.querySelector` inside React
- Animate GPU-accelerated properties only: `x`, `y`, `scale`, `opacity`, `rotation`
- Never create tweens at module level — SSR crash
- Never import `ScrollTrigger` in server-side code
- Never use Framer Motion

### Portal Animation Patterns

- Tables: rows fade + stagger on React Query success
- Modals/Drawers: GSAP enter/exit overrides shadcn CSS transitions
- KPI cards: CountUp for numbers, border-pulse on data refresh
- Calendar slots: stagger fade-in on render or month change
- Booking wizard: slide out (`x:-30, opacity:0`) → slide in (`x:30→0`) on step change

---

## PART 16: LANDING PAGE (Phase 13)

Already implemented. Route: `app/(public)/page.tsx`. Server Component with a single `"use client"` animation wrapper (`LandingAnimations`).

**Sections (in order):** Navbar · Hero · Stats Bar · How It Works · Featured Doctors · Why Choose Us · Testimonials · CTA Banner · Footer

All GSAP timelines defined in `lib/animations/landing.animations.ts`.

---

## PART 17: OPTIONAL MODULES (Phase 14)

All degrade gracefully if disabled.

| Module            | Env Var                         | Default  |
| ----------------- | ------------------------------- | -------- |
| Redis Cache       | `REDIS_URL`                     | disabled |
| S3 Storage        | `STORAGE_PROVIDER=s3`           | `local`  |
| Google Calendar   | `GOOGLE_CALENDAR_ENABLED=true`  | false    |
| Outlook Calendar  | `OUTLOOK_CALENDAR_ENABLED=true` | false    |
| WhatsApp Business | `WHATSAPP_PROVIDER=meta`        | disabled |
| Web Push (FCM)    | `PUSH_PROVIDER=fcm`             | disabled |
| Error Tracking    | `SENTRY_DSN`                    | unset    |

---

## PART 18: TESTING

| Layer       | Tool                     | Coverage Target                                       |
| ----------- | ------------------------ | ----------------------------------------------------- |
| Unit        | Vitest + RTL + MSW       | 70%+ services, hooks, components, permissions         |
| Integration | Vitest + node-mocks-http | 60%+ API routes, DB queries, payment flows            |
| E2E         | Playwright               | 30%+ booking flow, check-in, payment, role management |

- Mock external APIs (payments, SMS, email). Never mock Prisma — use a real test DB.
- Dedicated tests for every permission key combination.

---

## PART 19: ERROR HANDLING & PERFORMANCE

- **Payment failures**: idempotent. Log full gateway response. Never expose raw errors to client.
- **Notification failures**: log and continue. Never fail a booking.
- **Frontend**: React Query error state + shadcn `AlertDestructive`. Unknown errors → generic message.
- `next/image` with proper `sizes` on all images
- `next/dynamic` for heavy components (calendar, report charts)
- Prisma: select only needed fields; never N+1; paginate all list endpoints (default 20, max 100)
- Permission set: cached in JWT + 60s in-memory LRU
- Slot availability: cached 5 min (Redis if enabled, LRU otherwise)

---

## DELIVERABLE STANDARD

Every file must:
- Pass `npm run typecheck` with zero errors
- Have Zod validation on all inputs
- Use shadcn primitives for all UI
- Follow the PBAC pattern — zero role-name checks
- Have a corresponding test file

**Do not introduce patterns not defined in this document.**