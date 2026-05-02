import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requirePermission } from "@/lib/services/authorization.service"
import { DoctorService } from "@/lib/services/doctor.service"
import {
  createDoctorSchema,
  listDoctorsQuerySchema,
} from "@/lib/zod-schemas/doctor"

/**
 * GET /api/doctors
 * List doctors with pagination and filtering
 * Public endpoint (no auth required for basic listing)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = listDoctorsQuerySchema.safeParse(searchParams)

    if (!query.success) {
      return NextResponse.json(
        { success: false, validationErrors: query.error.issues },
        { status: 400 }
      )
    }

    const result = await DoctorService.list(query.data)
    console.log(result)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[v0] Error listing doctors:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to list doctors",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/doctors
 * Create a new doctor
 * Requires: doctors:create permission
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    // Check permission
    await requirePermission(session.user.id, "doctors:create")

    const body = await request.json()
    const parsed = createDoctorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, validationErrors: parsed.error.issues },
        { status: 400 }
      )
    }

    const result = await DoctorService.create(parsed.data)

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error: unknown) {
    console.error("[v0] Error creating doctor:", error)

    if (error instanceof Error && error.message === "PERMISSION_DENIED") {
      return NextResponse.json(
        { success: false, error: "PERMISSION_DENIED" },
        { status: 403 }
      )
    }

    // Check for unique constraint violations
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE",
          message: "Phone number or registration already exists",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to create doctor",
      },
      { status: 500 }
    )
  }
}
