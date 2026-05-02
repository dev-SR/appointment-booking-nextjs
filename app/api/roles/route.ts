import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/services/authorization.service"
import { createRoleSchema } from "@/lib/zod-schemas/role"
import { AuditService } from "@/lib/audit/audit.service"
import { AuditAction } from "@/app/generated/prisma/enums"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requirePermission(session.user.id, "roles:view")

    const roles = await prisma.role.findMany({
      orderBy: { displayName: "asc" },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    })

    return NextResponse.json(roles)
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requirePermission(session.user.id, "roles:manage")

    const body = await req.json()
    const result = createRoleSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      )
    }

    const { name, displayName, permissionIds } = result.data

    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({ where: { name } })
    if (existingRole) {
      return NextResponse.json(
        { error: "Validation failed", issues: [{ path: ["name"], message: "Role name already exists" }] },
        { status: 400 }
      )
    }

    // Create role and role permissions in a transaction
    const role = await prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name,
          displayName,
          isSystem: false,
        },
      })

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: newRole.id,
            permissionId,
            grantedBy: session.user!.id,
          })),
        })
      }

      return tx.role.findUnique({
        where: { id: newRole.id },
        include: {
          rolePermissions: { include: { permission: true } },
          _count: { select: { userRoles: true } },
        },
      })
    })

    AuditService.record({
      action: AuditAction.ROLE_CREATED,
      resourceType: "role",
      resourceId: role!.id,
      resourceLabel: role!.name,
      actor: { id: session.user.id, name: session.user.nameEn },
      metadata: { displayName, permissionsCount: permissionIds.length },
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("POST /api/roles Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
