import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { invalidateUserPermissions, requireAllPermissions } from "@/lib/services/authorization.service"
import { AuditService } from "@/lib/audit/audit.service"
import { AuditAction } from "@/app/generated/prisma/enums"

const updateUserRolesSchema = z.object({
  roleIds: z.array(z.string()),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 })
  }

  await requireAllPermissions(session.user.id, ["staff:manage", "roles:manage"])
  const { id: userId } = await params
  const body: unknown = await request.json()
  const parsed = updateUserRolesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, validationErrors: parsed.error.issues },
      { status: 400 }
    )
  }

  const existing = await prisma.userRole.findMany({ where: { userId } })
  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId } })
    if (parsed.data.roleIds.length > 0) {
      await tx.userRole.createMany({
        data: parsed.data.roleIds.map((roleId) => ({
          userId,
          roleId,
          assignedBy: session.user.id,
        })),
      })
    }
  })

  invalidateUserPermissions(userId)
  AuditService.record({
    action: AuditAction.USER_ROLE_ASSIGNED,
    resourceType: "user",
    resourceId: userId,
    actor: { id: session.user.id, name: session.user.nameEn },
    previousValue: { roleIds: existing.map((role) => role.roleId) },
    newValue: { roleIds: parsed.data.roleIds },
  })

  return NextResponse.json({ success: true })
}
