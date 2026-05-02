import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findUnique: vi.fn() },
  },
}))

vi.mock("@/lib/services/authorization.service", () => ({
  can: vi.fn(),
  canAll: vi.fn(),
  canAny: vi.fn(),
}))

vi.mock("@/lib/audit/audit.service", () => ({
  AuditService: { record: vi.fn() },
}))

import prisma from "@/lib/prisma"
import { can, canAll, canAny } from "@/lib/services/authorization.service"
import { evaluatePortalAccess, getPostLoginRedirect } from "@/lib/auth/portal-guard"

const mockFindUser = prisma.user.findUnique as ReturnType<typeof vi.fn>
const mockCan = can as ReturnType<typeof vi.fn>
const mockCanAny = canAny as ReturnType<typeof vi.fn>
const mockCanAll = canAll as ReturnType<typeof vi.fn>

const session = {
  user: {
    id: "user_1",
    phone: "+8801700000000",
    email: "admin@example.com",
    nameEn: "Admin",
    preferredLocale: "en",
    permissions: [],
  },
  expires: "2026-05-02T00:00:00.000Z",
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindUser.mockResolvedValue({
    id: "user_1",
    isActive: true,
    nameEn: "Admin",
    preferredLocale: "en",
    phone: "+8801700000000",
    email: "admin@example.com",
  })
  mockCanAny.mockResolvedValue(true)
  mockCanAll.mockResolvedValue(false)
  mockCan.mockResolvedValue(false)
})

describe("evaluatePortalAccess", () => {
  it("redirects anonymous users to login with callbackUrl", async () => {
    const decision = await evaluatePortalAccess({
      session: null,
      currentPath: "/doctor",
      any: ["dashboard:view:doctor"],
    })

    expect(decision.allowed).toBe(false)
    expect(decision.redirectTo).toBe("/login?callbackUrl=%2Fdoctor")
  })

  it("blocks inactive users", async () => {
    mockFindUser.mockResolvedValue({ isActive: false })

    const decision = await evaluatePortalAccess({
      session,
      currentPath: "/admin",
      any: ["dashboard:view:admin"],
    })

    expect(decision.reason).toBe("INACTIVE")
    expect(decision.redirectTo).toBe("/inactive")
  })

  it("allows portal access when either any permissions or all permissions pass", async () => {
    mockCanAny.mockResolvedValue(false)
    mockCanAll.mockResolvedValue(true)

    const decision = await evaluatePortalAccess({
      session,
      currentPath: "/receptionist",
      any: ["dashboard:view:receptionist"],
      all: ["appointments:create", "queue:manage"],
    })

    expect(decision.allowed).toBe(true)
  })

  it("denies missing permissions", async () => {
    mockCanAny.mockResolvedValue(false)
    mockCanAll.mockResolvedValue(false)

    const decision = await evaluatePortalAccess({
      session,
      currentPath: "/admin",
      any: ["dashboard:view:admin"],
    })

    expect(decision.reason).toBe("MISSING_PERMISSION")
    expect(decision.redirectTo).toBe("/unauthorized")
  })
})

describe("getPostLoginRedirect", () => {
  it("prioritizes admin before other portals", async () => {
    mockCan.mockImplementation(async (_userId: string, permission: string) => {
      return permission === "dashboard:view:admin" || permission === "dashboard:view:doctor"
    })

    await expect(getPostLoginRedirect("user_1")).resolves.toBe("/admin")
  })

  it("falls back to unauthorized", async () => {
    mockCan.mockResolvedValue(false)
    await expect(getPostLoginRedirect("user_1")).resolves.toBe("/unauthorized")
  })
})
