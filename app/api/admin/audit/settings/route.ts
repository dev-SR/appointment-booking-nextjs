import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requirePermission } from "@/lib/services/authorization.service"
import { getAuditSettings, upsertAuditSetting } from "@/lib/audit/audit-settings.cache"
import { AuditService } from "@/lib/audit/audit.service"
import { AuditAction } from "@/app/generated/prisma/enums"

const auditSettingSchema = z.object({
  resourceType: z.string().min(2),
  isEnabled: z.boolean(),
  retentionDays: z.number().int().min(1).nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 })
  }

  await requirePermission(session.user.id, "settings:manage")
  const settings = await getAuditSettings()
  return NextResponse.json({ success: true, data: settings })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 })
  }

  await requirePermission(session.user.id, "settings:manage")
  const body: unknown = await request.json()
  const parsed = auditSettingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, validationErrors: parsed.error.issues },
      { status: 400 }
    )
  }

  const setting = await upsertAuditSetting({
    ...parsed.data,
    updatedBy: session.user.id,
  })

  AuditService.record({
    action: AuditAction.AUDIT_SETTING_UPDATED,
    resourceType: "audit",
    resourceId: setting.resourceType,
    resourceLabel: `${setting.resourceType} audit settings`,
    actor: { id: session.user.id, name: session.user.nameEn },
    newValue: { ...setting },
  })

  return NextResponse.json({ success: true, data: setting })
}
