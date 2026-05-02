import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  default: {
    userRole: { findMany: vi.fn() },
    appointment: { findUnique: vi.fn() },
    doctor: { findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
    payment: { findUnique: vi.fn() },
  },
}))

import prisma from "@/lib/prisma"
import {
  buildPermission,
  can,
  getUserPermissions,
  invalidateUserPermissions,
} from "@/lib/services/authorization.service"

const mockUserRoles = prisma.userRole.findMany as ReturnType<typeof vi.fn>

function roleWithPermissions(keys: string[]) {
  return [
    {
      role: {
        rolePermissions: keys.map((key) => ({ permission: { key } })),
      },
    },
  ]
}

beforeEach(() => {
  vi.clearAllMocks()
  invalidateUserPermissions("user_1")
})

describe("authorization service", () => {
  it("loads permissions from assigned roles", async () => {
    mockUserRoles.mockResolvedValue(roleWithPermissions(["appointments:read:own"]))

    const permissions = await getUserPermissions("user_1")

    expect(permissions.has("appointments:read:own")).toBe(true)
  })

  it("allows wildcard access", async () => {
    mockUserRoles.mockResolvedValue(roleWithPermissions(["*"]))

    await expect(can("user_1", "settings:manage")).resolves.toBe(true)
  })

  it("treats :any as including :own", async () => {
    mockUserRoles.mockResolvedValue(roleWithPermissions(["appointments:cancel:any"]))

    await expect(can("user_1", "appointments:cancel:own")).resolves.toBe(true)
  })

  it("treats :all as including :assigned", async () => {
    mockUserRoles.mockResolvedValue(roleWithPermissions(["patients:read:all"]))

    await expect(can("user_1", "patients:read:assigned")).resolves.toBe(true)
  })

  it("builds permission keys consistently", () => {
    expect(buildPermission("appointments", "read", "own")).toBe("appointments:read:own")
    expect(buildPermission("payments", "create")).toBe("payments:create")
  })
})
