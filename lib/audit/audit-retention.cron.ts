import prisma from "@/lib/prisma"
import { AuditAction } from "@/app/generated/prisma/enums"
import { getAuditSettings } from "@/lib/audit/audit-settings.cache"
import { AuditService } from "@/lib/audit/audit.service"

export interface AuditRetentionResult {
  purgedByResource: Record<string, number>
  totalPurged: number
}

export async function purgeExpiredAuditLogs(now = new Date()): Promise<AuditRetentionResult> {
  const settings = await getAuditSettings()
  const purgedByResource: Record<string, number> = {}

  for (const setting of settings) {
    if (!setting.retentionDays || setting.retentionDays <= 0) continue

    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - setting.retentionDays)

    const result = await prisma.auditLog.deleteMany({
      where: {
        resourceType: setting.resourceType,
        createdAt: { lt: cutoff },
      },
    })

    if (result.count > 0) {
      purgedByResource[setting.resourceType] = result.count
    }
  }

  const totalPurged = Object.values(purgedByResource).reduce(
    (sum, count) => sum + count,
    0
  )

  if (totalPurged > 0) {
    await AuditService.recordSync({
      action: AuditAction.SYSTEM_CRON_PURGE,
      resourceType: "audit",
      resourceId: "retention",
      resourceLabel: "Audit retention purge",
      newValue: purgedByResource,
      metadata: { totalPurged },
    })
  }

  return { purgedByResource, totalPurged }
}
