import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuditAction } from "@/app/generated/prisma/enums"

vi.mock("@/lib/prisma", () => ({
  default: {
    auditLog: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLogSetting: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import prisma from "@/lib/prisma"
import { AuditService } from "@/lib/audit/audit.service"
import {
  clearAuditSettingsCache,
  getAuditSetting,
  getAuditSettings,
  upsertAuditSetting,
} from "@/lib/audit/audit-settings.cache"
import { purgeExpiredAuditLogs } from "@/lib/audit/audit-retention.cron"

const mockCreate = prisma.auditLog.create as ReturnType<typeof vi.fn>
const mockDeleteMany = prisma.auditLog.deleteMany as ReturnType<typeof vi.fn>
const mockFindSettings = prisma.auditLogSetting.findMany as ReturnType<typeof vi.fn>
const mockUpsertSetting = prisma.auditLogSetting.upsert as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  clearAuditSettingsCache()
  mockFindSettings.mockResolvedValue([])
  mockCreate.mockResolvedValue({ id: "audit_1" })
  mockDeleteMany.mockResolvedValue({ count: 0 })
})

describe("AuditService", () => {
  it("writes enabled audit logs and redacts sensitive fields", async () => {
    await AuditService.recordSync({
      action: AuditAction.USER_LOGIN,
      resourceType: "user",
      resourceId: "user_1",
      newValue: {
        email: "patient@example.com",
        passwordHash: "secret-hash",
        nested: { access_token: "oauth-token" },
      },
    })

    expect(mockCreate).toHaveBeenCalledOnce()
    const data = mockCreate.mock.calls[0][0].data
    expect(data.newValue).toContain("[REDACTED]")
    expect(data.newValue).not.toContain("secret-hash")
    expect(data.newValue).not.toContain("oauth-token")
  })

  it("skips disabled resources without throwing", async () => {
    mockFindSettings.mockResolvedValue([
      { resourceType: "payment", isEnabled: false, retentionDays: 30 },
    ])

    await AuditService.recordSync({
      action: AuditAction.PAYMENT_COMPLETED,
      resourceType: "payment",
      resourceId: "pay_1",
    })

    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe("audit settings cache", () => {
  it("merges stored settings with defaults", async () => {
    mockFindSettings.mockResolvedValue([
      { resourceType: "appointment", isEnabled: false, retentionDays: 10 },
    ])

    const appointment = await getAuditSetting("appointment")
    const portal = await getAuditSetting("portal")

    expect(appointment).toEqual({
      resourceType: "appointment",
      isEnabled: false,
      retentionDays: 10,
    })
    expect(portal.isEnabled).toBe(true)
  })

  it("invalidates cache after updating a setting", async () => {
    mockFindSettings.mockResolvedValue([])
    await getAuditSettings()
    mockUpsertSetting.mockResolvedValue({
      resourceType: "portal",
      isEnabled: false,
      retentionDays: 90,
    })

    await upsertAuditSetting({
      resourceType: "portal",
      isEnabled: false,
      retentionDays: 90,
      updatedBy: "admin",
    })
    await getAuditSettings()

    expect(mockFindSettings).toHaveBeenCalledTimes(2)
  })
})

describe("audit retention", () => {
  it("purges resources with retention days and records a summary audit", async () => {
    mockFindSettings.mockResolvedValue([
      { resourceType: "appointment", isEnabled: true, retentionDays: 30 },
      { resourceType: "payment", isEnabled: true, retentionDays: null },
    ])
    mockDeleteMany.mockResolvedValueOnce({ count: 3 })

    const result = await purgeExpiredAuditLogs(new Date("2026-05-02T00:00:00.000Z"))

    expect(result.totalPurged).toBe(3)
    expect(mockDeleteMany).toHaveBeenCalled()
    expect(mockCreate).toHaveBeenCalledOnce()
  })
})
