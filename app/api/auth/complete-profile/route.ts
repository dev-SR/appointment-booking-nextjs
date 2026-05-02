import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { AuditService } from "@/lib/audit/audit.service"
import { AuditAction } from "@/app/generated/prisma/enums"

const completeProfileSchema = z.object({
  nameEn: z.string().min(2),
  nameBn: z.string().optional(),
  phone: z.string().min(6).optional(),
  preferredLocale: z.enum(["bn", "en"]),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = completeProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, validationErrors: parsed.error.issues },
      { status: 400 }
    )
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  })

  AuditService.record({
    action: AuditAction.USER_PROFILE_UPDATED,
    resourceType: "user",
    resourceId: user.id,
    resourceLabel: user.email ?? user.phone,
    actor: { id: user.id, name: user.nameEn },
    changedFields: Object.keys(parsed.data),
  })

  return NextResponse.json({ success: true, data: user })
}
