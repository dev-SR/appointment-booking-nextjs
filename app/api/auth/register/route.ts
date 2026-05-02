import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { AuditService } from "@/lib/audit/audit.service"
import { AuditAction } from "@/app/generated/prisma/enums"

const registerSchema = z.object({
  nameEn: z.string().min(2),
  nameBn: z.string().optional(),
  email: z.email(),
  phone: z.string().min(6),
  password: z.string().min(8),
  preferredLocale: z.enum(["bn", "en"]).default("bn"),
})

export async function POST(request: Request) {
  const body: unknown = await request.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, validationErrors: parsed.error.issues },
      { status: 400 }
    )
  }

  const input = parsed.data
  const passwordHash = await hash(input.password, 12)

  try {
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          phone: input.phone,
          nameEn: input.nameEn,
          nameBn: input.nameBn,
          passwordHash,
          preferredLocale: input.preferredLocale,
          isEmailVerified: false,
        },
      })

      const patientRole = await tx.role.findUnique({ where: { name: "patient" } })
      if (patientRole) {
        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: patientRole.id,
            assignedBy: "system",
          },
        })
      }

      await tx.patient.create({ data: { userId: createdUser.id } })
      return createdUser
    })

    AuditService.record({
      action: AuditAction.USER_REGISTERED,
      resourceType: "user",
      resourceId: user.id,
      resourceLabel: user.email,
      actor: { id: user.id, name: user.nameEn },
    })

    return NextResponse.json({ success: true, data: { id: user.id } }, { status: 201 })
  } catch (error) {
    console.error("[auth] register failed", error)
    return NextResponse.json(
      { success: false, error: "DUPLICATE_OR_INTERNAL_ERROR" },
      { status: 409 }
    )
  }
}
