import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/services/authorization.service"
import { updatePermissionSchema } from "@/lib/zod-schemas/permission"
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
    const result = updatePermissionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      )
    }

    const { key, displayName, group, description } = result.data

    const existingPermission = await prisma.permission.findUnique({ where: { id } })
    if (!existingPermission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 })
    }

    if (key !== existingPermission.key) {
      const duplicateKey = await prisma.permission.findUnique({ where: { key } })
      if (duplicateKey) {
        return NextResponse.json(
          { error: "Validation failed", issues: [{ path: ["key"], message: "Permission key already exists" }] },
          { status: 400 }
        )
      }
    }

    const updatedPermission = await prisma.permission.update({
      where: { id },
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
      resourceId: id,
      resourceLabel: updatedPermission.key,
      actor: { id: session.user.id, name: session.user.nameEn },
      metadata: { displayName, group, action: "UPDATED" },
    })

    return NextResponse.json(updatedPermission)
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("PUT /api/permissions/[id] Error:", error)
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

    const existingPermission = await prisma.permission.findUnique({
      where: { id },
      include: { _count: { select: { rolePermissions: true } } },
    })

    if (!existingPermission) {
      return NextResponse.json({ error: "Permission not found" }, { status: 404 })
    }

    // You could optionally block deletion if it's assigned to roles, but typically
    // deleting a permission should cascade or we allow it. Let's allow it but warn in UI.

    await prisma.permission.delete({ where: { id } })

    AuditService.record({
      action: AuditAction.SETTING_UPDATED,
      resourceType: "permission",
      resourceId: id,
      resourceLabel: existingPermission.key,
      actor: { id: session.user.id, name: session.user.nameEn },
      metadata: { action: "DELETED" },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    console.error("DELETE /api/permissions/[id] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
