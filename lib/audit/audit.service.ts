import prisma from "@/lib/prisma"
import { AuditAction, type AuditAction as AuditActionValue } from "@/app/generated/prisma/enums"
import { getAuditSetting } from "@/lib/audit/audit-settings.cache"

type AuditJsonValue =
  | string
  | number
  | boolean
  | null
  | AuditJsonValue[]
  | { [key: string]: AuditJsonValue }

export interface AuditActor {
  id?: string | null
  name?: string | null
  role?: string | null
  ip?: string | null
}

export interface AuditRecordInput {
  action: AuditActionValue
  resourceType: string
  resourceId: string
  resourceLabel?: string | null
  actor?: AuditActor | null
  previousValue?: AuditJsonValue
  newValue?: AuditJsonValue
  changedFields?: string[]
  metadata?: AuditJsonValue
  requestId?: string | null
}

const REDACTED_KEYS = [
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "id_token",
  "idToken",
  "password",
  "passwordHash",
  "secret",
  "token",
  "gatewayResponse",
  "medicalHistory",
  "notes",
]

function sanitize(value: AuditJsonValue | undefined): string | null {
  if (value === undefined) return null

  const scrub = (current: AuditJsonValue): AuditJsonValue => {
    if (Array.isArray(current)) {
      return current.map((item) => scrub(item))
    }

    if (current && typeof current === "object") {
      const next: { [key: string]: AuditJsonValue } = {}
      for (const [key, innerValue] of Object.entries(current)) {
        next[key] = REDACTED_KEYS.includes(key) ? "[REDACTED]" : scrub(innerValue)
      }
      return next
    }

    return current
  }

  return JSON.stringify(scrub(value))
}

async function writeAuditLog(input: AuditRecordInput): Promise<void> {
  const setting = await getAuditSetting(input.resourceType)
  if (!setting.isEnabled) return

  await prisma.auditLog.create({
    data: {
      actorId: input.actor?.id ?? null,
      actorName: input.actor?.name ?? null,
      actorRole: input.actor?.role ?? null,
      actorIp: input.actor?.ip ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceLabel: input.resourceLabel ?? null,
      previousValue: sanitize(input.previousValue),
      newValue: sanitize(input.newValue),
      changedFields: input.changedFields ? JSON.stringify(input.changedFields) : null,
      metadata: sanitize(input.metadata),
      requestId: input.requestId ?? null,
    },
  })
}

export class AuditService {
  static record(input: AuditRecordInput): void {
    void writeAuditLog(input).catch((error) => {
      console.error("[audit] failed to write audit log", error)
    })
  }

  static async recordSync(input: AuditRecordInput): Promise<void> {
    try {
      await writeAuditLog(input)
    } catch (error) {
      console.error("[audit] failed to write audit log", error)
    }
  }

  static async list(query: {
    resourceType?: string
    actorId?: string
    action?: AuditActionValue
    page?: number
    limit?: number
  } = {}) {
    const page = query.page ?? 1
    const limit = query.limit ?? 50
    const where = {
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }
}

export { AuditAction }
