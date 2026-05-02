import prisma from "@/lib/prisma"

const CACHE_TTL_MS = 5 * 60 * 1000

export interface AuditResourceSetting {
  resourceType: string
  isEnabled: boolean
  retentionDays: number | null
}

interface CachedSettings {
  expiresAt: number
  byResource: Map<string, AuditResourceSetting>
}

let cachedSettings: CachedSettings | null = null

export const DEFAULT_AUDIT_SETTINGS: AuditResourceSetting[] = [
  { resourceType: "appointment", isEnabled: true, retentionDays: 365 },
  { resourceType: "payment", isEnabled: true, retentionDays: 2555 },
  { resourceType: "user", isEnabled: true, retentionDays: 730 },
  { resourceType: "role", isEnabled: true, retentionDays: 2555 },
  { resourceType: "permission", isEnabled: true, retentionDays: 2555 },
  { resourceType: "portal", isEnabled: true, retentionDays: 365 },
  { resourceType: "setting", isEnabled: true, retentionDays: 2555 },
  { resourceType: "audit", isEnabled: true, retentionDays: 2555 },
]

function mapSettings(settings: AuditResourceSetting[]): Map<string, AuditResourceSetting> {
  return new Map(settings.map((setting) => [setting.resourceType, setting]))
}

export function clearAuditSettingsCache(): void {
  cachedSettings = null
}

export async function getAuditSettings(): Promise<AuditResourceSetting[]> {
  if (cachedSettings && cachedSettings.expiresAt > Date.now()) {
    return Array.from(cachedSettings.byResource.values())
  }

  const stored = await prisma.auditLogSetting.findMany({
    orderBy: { resourceType: "asc" },
  })

  const merged = mapSettings(DEFAULT_AUDIT_SETTINGS)
  for (const setting of stored) {
    merged.set(setting.resourceType, {
      resourceType: setting.resourceType,
      isEnabled: setting.isEnabled,
      retentionDays: setting.retentionDays,
    })
  }

  cachedSettings = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    byResource: merged,
  }

  return Array.from(merged.values())
}

export async function getAuditSetting(
  resourceType: string
): Promise<AuditResourceSetting> {
  const settings = await getAuditSettings()
  return (
    settings.find((setting) => setting.resourceType === resourceType) ?? {
      resourceType,
      isEnabled: true,
      retentionDays: 365,
    }
  )
}

export async function upsertAuditSetting(input: {
  resourceType: string
  isEnabled: boolean
  retentionDays: number | null
  updatedBy: string
}): Promise<AuditResourceSetting> {
  const setting = await prisma.auditLogSetting.upsert({
    where: { resourceType: input.resourceType },
    update: {
      isEnabled: input.isEnabled,
      retentionDays: input.retentionDays,
      updatedBy: input.updatedBy,
    },
    create: input,
  })

  clearAuditSettingsCache()

  return {
    resourceType: setting.resourceType,
    isEnabled: setting.isEnabled,
    retentionDays: setting.retentionDays,
  }
}
