import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/services/authorization.service"
import { createPermissionSchema } from "@/lib/zod-schemas/permission"
import { AuditService } from "@/lib/audit/audit.service"
import { AuditAction } from "@/app/generated/prisma/enums"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await requirePermission(session.user.id, "roles:manage")

    const permissions = await prisma.permission.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
    })

    return NextResponse.json(permissions)
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

    // Creating permissions is an advanced action, use roles:manage or settings:manage
    await requirePermission(session.user.id, "roles:manage")

    const body = await req.json()
    const result = createPermissionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      )
    }

    const { key, displayName, group, description } = result.data

    // Check if permission key already exists
    const existingPermission = await prisma.permission.findUnique({ where: { key } })
    if (existingPermission) {
      return NextResponse.json(
        { error: "Validation failed", issues: [{ path: ["key"], message: "Permission key already exists" }] },
        { status: 400 }
      )
    }

    const permission = await prisma.permission.create({
      data: {
        key,
        displayName,
        group,
        description,
      },
    })

    AuditService.record({
      action: AuditAction.SETTING_UPDATED,
      resourceType: "permission",
      resourceId: permission.id,
      resourceLabel: permission.key,
      actor: { id: session.user.id, name: session.user.nameEn },
      metadata: { displayName, group, action: "CREATED" },
    })

    return NextResponse.json(permission, { status: 201 })
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("POST /api/permissions Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
