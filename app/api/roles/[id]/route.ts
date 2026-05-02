import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { requirePermission, invalidateRolePermissions } from "@/lib/services/authorization.service"
import { updateRoleSchema } from "@/lib/zod-schemas/role"
import { AuditService } from "@/lib/audit/audit.service"
import { AuditAction } from "@/app/generated/prisma/enums"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requirePermission(session.user.id, "roles:manage")

    const resolvedParams = await params
    const id = resolvedParams.id
    
    const body = await req.json()
    const result = updateRoleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      )
    }

    const { displayName, permissionIds } = result.data

    const existingRole = await prisma.role.findUnique({ where: { id } })
    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Note: We deliberately do NOT update `name` or `isSystem`.
    const updatedRole = await prisma.$transaction(async (tx) => {
      // 1. Update basic info
      const role = await tx.role.update({
        where: { id },
        data: { displayName },
      })

      // 2. Clear existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      })

      // 3. Insert new permissions
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
            grantedBy: session.user!.id,
          })),
        })
      }

      return tx.role.findUnique({
        where: { id },
        include: {
          rolePermissions: { include: { permission: true } },
          _count: { select: { userRoles: true } },
        },
      })
    })

    // Invalidate cached permissions for all users with this role
    await invalidateRolePermissions(id)

    AuditService.record({
      action: AuditAction.ROLE_UPDATED,
      resourceType: "role",
      resourceId: id,
      resourceLabel: existingRole.name,
      actor: { id: session.user.id, name: session.user.nameEn },
      metadata: { displayName, permissionsCount: permissionIds.length },
    })

    return NextResponse.json(updatedRole)
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("PUT /api/roles/[id] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requirePermission(session.user.id, "roles:manage")

    const resolvedParams = await params
    const id = resolvedParams.id

    const existingRole = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { userRoles: true } } },
    })

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    if (existingRole.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete a system role" },
        { status: 400 }
      )
    }

    if (existingRole._count.userRoles > 0) {
      return NextResponse.json(
        { error: "Cannot delete a role that is assigned to users" },
        { status: 400 }
      )
    }

    await prisma.role.delete({ where: { id } })

    AuditService.record({
      action: AuditAction.ROLE_DELETED,
      resourceType: "role",
      resourceId: id,
      resourceLabel: existingRole.name,
      actor: { id: session.user.id, name: session.user.nameEn },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("DELETE /api/roles/[id] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
