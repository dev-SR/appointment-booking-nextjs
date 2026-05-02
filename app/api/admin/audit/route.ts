import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { requirePermission } from "@/lib/services/authorization.service"
import { AuditService } from "@/lib/audit/audit.service"
import type { AuditAction } from "@/app/generated/prisma/enums"

const auditQuerySchema = z.object({
  resourceType: z.string().optional(),
  actorId: z.string().optional(),
  action: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 })
  }

  await requirePermission(session.user.id, "audit:view")
  const parsed = auditQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, validationErrors: parsed.error.issues },
      { status: 400 }
    )
  }

  const result = await AuditService.list({
    ...parsed.data,
    action: parsed.data.action as AuditAction | undefined,
  })
  return NextResponse.json({ success: true, data: result })
}
