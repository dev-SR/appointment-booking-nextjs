import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/services/authorization.service"
import { AuditService } from "@/lib/audit/audit.service"
import { AuditAction } from "@/app/generated/prisma/enums"

const createRoleSchema = z.object({
  name: z.string().min(2).regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(2),
  permissionKeys: z.array(z.string()).default([]),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 })
  }

  await requirePermission(session.user.id, "roles:manage")
  const roles = await prisma.role.findMany({
    orderBy: { displayName: "asc" },
    include: {
      rolePermissions: {
        include: { permission: true },
        orderBy: { permission: { key: "asc" } },
      },
      _count: { select: { userRoles: true } },
    },
  })

  return NextResponse.json({ success: true, data: roles })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 })
  }

  await requirePermission(session.user.id, "roles:manage")
  const body: unknown = await request.json()
  const parsed = createRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, validationErrors: parsed.error.issues },
      { status: 400 }
    )
  }

  const input = parsed.data
  const permissions = await prisma.permission.findMany({
    where: { key: { in: input.permissionKeys } },
  })

  const role = await prisma.role.create({
    data: {
      name: input.name,
      displayName: input.displayName,
      isSystem: false,
      rolePermissions: {
        create: permissions.map((permission) => ({
          permissionId: permission.id,
          grantedBy: session.user.id,
        })),
      },
    },
    include: { rolePermissions: { include: { permission: true } } },
  })

  AuditService.record({
    action: AuditAction.ROLE_CREATED,
    resourceType: "role",
    resourceId: role.id,
    resourceLabel: role.displayName,
    actor: { id: session.user.id, name: session.user.nameEn },
    newValue: { name: role.name, permissionKeys: input.permissionKeys },
  })

  return NextResponse.json({ success: true, data: role }, { status: 201 })
}
