import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/services/authorization.service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 })
  }

  await requirePermission(session.user.id, "roles:manage")
  const permissions = await prisma.permission.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  })

  return NextResponse.json({ success: true, data: permissions })
}
