import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { invalidateRolePermissions, requirePermission } from "@/lib/services/authorization.service"
import { AuditService } from "@/lib/audit/audit.service"
import { AuditAction } from "@/app/generated/prisma/enums"

const updateRoleSchema = z.object({
  displayName: z.string().min(2).optional(),
  permissionKeys: z.array(z.string()).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 })
  }

  await requirePermission(session.user.id, "roles:manage")
  const { id } = await params
  const body: unknown = await request.json()
  const parsed = updateRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, validationErrors: parsed.error.issues },
      { status: 400 }
    )
  }

  const existing = await prisma.role.findUnique({
    where: { id },
    include: { rolePermissions: { include: { permission: true } } },
  })
  if (!existing) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 })
  }

  if (existing.name === "super_admin" && parsed.data.permissionKeys && !parsed.data.permissionKeys.includes("*")) {
    return NextResponse.json(
      { success: false, error: "SUPER_ADMIN_REQUIRES_WILDCARD" },
      { status: 422 }
    )
  }

  const permissionKeys = parsed.data.permissionKeys
  const permissions = permissionKeys
    ? await prisma.permission.findMany({ where: { key: { in: permissionKeys } } })
    : []

  const updated = await prisma.$transaction(async (tx) => {
    if (permissionKeys) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } })
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: id,
            permissionId: permission.id,
            grantedBy: session.user.id,
          })),
        })
      }
    }

    return tx.role.update({
      where: { id },
      data: {
        ...(parsed.data.displayName ? { displayName: parsed.data.displayName } : {}),
      },
      include: { rolePermissions: { include: { permission: true } } },
    })
  })

  await invalidateRolePermissions(id)

  AuditService.record({
    action: AuditAction.ROLE_UPDATED,
    resourceType: "role",
    resourceId: id,
    resourceLabel: updated.displayName,
    actor: { id: session.user.id, name: session.user.nameEn },
    previousValue: {
      displayName: existing.displayName,
      permissionKeys: existing.rolePermissions.map((rolePermission) => rolePermission.permission.key),
    },
    newValue: {
      displayName: updated.displayName,
      permissionKeys: updated.rolePermissions.map((rolePermission) => rolePermission.permission.key),
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 })
  }

  await requirePermission(session.user.id, "roles:manage")
  const { id } = await params
  const role = await prisma.role.findUnique({ where: { id } })
  if (!role) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 })
  }
  if (role.isSystem) {
    return NextResponse.json({ success: false, error: "SYSTEM_ROLE_LOCKED" }, { status: 422 })
  }

  await prisma.role.delete({ where: { id } })
  await invalidateRolePermissions(id)
  AuditService.record({
    action: AuditAction.ROLE_DELETED,
    resourceType: "role",
    resourceId: id,
    resourceLabel: role.displayName,
    actor: { id: session.user.id, name: session.user.nameEn },
  })

  return NextResponse.json({ success: true })
}
