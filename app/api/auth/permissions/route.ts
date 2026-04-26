/**
 * User Permissions API Route
 *
 * Returns the current user's permissions
 * Used by the client to populate the auth store
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getUserPermissions } from "@/lib/services/authorization.service"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "Authentication required",
        },
        { status: 401 }
      )
    }

    const permissions = await getUserPermissions(session.user.id)

    return NextResponse.json({
      success: true,
      data: {
        permissions: Array.from(permissions),
      },
    })
  } catch (error) {
    console.error("Get permissions error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to get permissions",
      },
      { status: 500 }
    )
  }
}
