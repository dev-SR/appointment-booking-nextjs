/**
 * Send OTP API Route
 *
 * Rate limited: 5 requests per minute per IP
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sendOtp, validateBangladeshPhone, normalizePhone } from "@/lib/services/otp.service"

const SendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  purpose: z.enum(["login", "register", "cancel_appointment", "payment", "account_deletion"]),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = SendOtpSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          validationErrors: parsed.error.errors,
        },
        { status: 400 }
      )
    }

    const { phone, purpose } = parsed.data
    const normalizedPhone = normalizePhone(phone)

    // Validate Bangladesh phone format
    if (!validateBangladeshPhone(normalizedPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_PHONE",
          message: "Please enter a valid Bangladesh phone number",
        },
        { status: 400 }
      )
    }

    // Send OTP
    const result = await sendOtp(normalizedPhone, purpose)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "OTP_SEND_FAILED",
          message: result.message,
          cooldownRemaining: result.cooldownRemaining,
        },
        { status: 429 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      expiresAt: result.expiresAt,
    })
  } catch (error) {
    console.error("Send OTP error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to send OTP",
      },
      { status: 500 }
    )
  }
}
