# 🏥 Doctor Appointment Booking System

A full-stack appointment scheduling platform built for the Bangladesh market. Supports multi-role portals (Admin, Receptionist, Doctor, Accountant, Patient), real-time slot management, and multiple payment methods (bKash, Nagad, Cash).

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth | NextAuth.js v5 (Phone OTP + OAuth) |
| ORM | Prisma 7 (SQLite dev / PostgreSQL prod) |
| Server State | TanStack Query |
| Client State | Zustand |
| Animation | GSAP |
| i18n | next-i18next (default: Bengali) |

---

## ⚙️ Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm dlx prisma generate

# Seed the database (roles, permissions, sample doctor)
pnpm dlx prisma db seed

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm typecheck` | Run TypeScript type checker |
| `pnpm lint` | Lint codebase |
| `pnpm format` | Format all `.ts` / `.tsx` files |
| `pnpm test` | Run **all** `*.test.ts` files via Vitest |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:ui` | Open Vitest browser UI |
| `pnpm test:coverage` | Generate coverage report |
| `pnpm test:integration` | Run integration tests (requires `pnpm dev`) |

---

## 🧪 Testing

Tests are powered by **Vitest** and auto-discover every `*.test.ts` file in the project.

```bash
# Run all tests (unit + integration)
pnpm test

# Watch mode (re-runs on file save)
pnpm test:watch

# Open interactive browser UI
pnpm test:ui

# Coverage report
pnpm test:coverage
```

### Test files

| File | Type | Description |
|---|---|---|
| `tests/unit/slot-engine.test.ts` | Unit | `parseTime`, `formatTime`, `generateRawSlots`, break filtering |
| `tests/unit/booking-rules.test.ts` | Unit | Lead time, max advance, duplicates, cancel/reschedule rules |
| `tests/unit/pricing.test.ts` | Unit | Base fee, pricing rules, coupons, patient credits |
| `tests/booking-flow.test.ts` | Integration | Full API chain: Doctor → Chamber → Dates → Slots |

> **Integration tests** auto-skip when the dev server is offline and run normally when it's up (`pnpm dev`).

---

## 🗄️ Database

```bash
# View database in Prisma Studio
pnpm dlx prisma studio

# Re-seed the database
pnpm dlx prisma db seed

# Run migrations
pnpm dlx prisma migrate dev
```

---

## 📁 Project Structure

```
app/
├── (public)/        # Landing, /doctors, /about, /contact, /booking
├── (auth)/          # /login, /register
├── (portal)/        # /admin, /doctor, /receptionist, /accountant, /patient
└── api/             # Route handlers

lib/
├── services/        # Business logic (auth, slots, appointments, pricing)
├── hooks/           # React Query hooks
├── zod-schemas/     # Validation schemas
└── animations/      # GSAP system

components/
├── booking/         # 7-step booking wizard
├── landing/         # Landing page sections
├── layouts/         # Portal sidebars/layouts
└── ui/              # shadcn primitives

store/               # Zustand stores (auth, booking)
tests/               # API integration tests
prisma/              # Schema, migrations, seed
```

---

## 🔑 Environment Variables

```bash
# Database (dev — SQLite)
DB_TYPE=sqlite
DB_PROVIDER=sqlite
DATABASE_URL=file:./dev.db

# Auth
AUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# Database (prod — PostgreSQL)
# DB_TYPE=postgres
# DB_PROVIDER=postgresql
# DATABASE_URL=postgresql://user:pass@db:5432/appointments
```

---

## ✅ Completed Phases

- **Phase 1** — Foundation (DB schema, PBAC, Auth)
- **Phase 2** — Core Entities (Doctor, Patient, Chamber, Schedule)
- **Phase 3** — Slot Engine (generation, availability APIs)
- **Phase 4** — Booking Flow (7-step wizard, appointment lifecycle)
- **Phase 11** — Landing Page & Animations (GSAP, i18n, all public pages)
