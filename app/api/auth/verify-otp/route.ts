/**
 * Verify OTP API Route
 *
 * Verifies OTP and returns status
 * For login, use NextAuth signIn() on the client instead
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyOtp, normalizePhone } from "@/lib/services/otp.service"

const VerifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
  purpose: z.enum(["login", "register", "cancel_appointment", "payment", "account_deletion"]),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = VerifyOtpSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          validationErrors: parsed.error.errors,
        },
        { status: 400 }
      )
    }

    const { phone, otp, purpose } = parsed.data
    const normalizedPhone = normalizePhone(phone)

    // Verify OTP
    const isValid = await verifyOtp(normalizedPhone, otp, purpose)

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_OTP",
          message: "Invalid or expired OTP. Please try again.",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
    })
  } catch (error) {
    console.error("Verify OTP error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to verify OTP",
      },
      { status: 500 }
    )
  }
}
