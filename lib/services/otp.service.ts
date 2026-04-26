/**
 * OTP Service
 *
 * Handles OTP generation, sending, and verification
 * Used for phone-based authentication in Bangladesh
 */

import prisma from "@/lib/prisma"

// OTP configuration
const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 3
const RESEND_COOLDOWN_SECONDS = 60

type OtpPurpose = "login" | "register" | "cancel_appointment" | "payment" | "account_deletion"

interface SendOtpResult {
  success: boolean
  message: string
  expiresAt?: Date
  cooldownRemaining?: number
}

interface VerifyOtpResult {
  success: boolean
  message: string
}

/**
 * Generate a random OTP code
 */
function generateOtpCode(): string {
  // Generate a 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  return otp
}

/**
 * Validate Bangladesh phone number format
 * Format: +8801XXXXXXXXX or 01XXXXXXXXX
 */
export function validateBangladeshPhone(phone: string): boolean {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, "")

  // Match +8801X... or 01X... where X is 3-9
  const regex = /^(\+?880)?1[3-9]\d{8}$/
  return regex.test(cleaned)
}

/**
 * Normalize phone number to +880 format
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, "")

  if (cleaned.startsWith("+880")) {
    return cleaned
  }

  if (cleaned.startsWith("880")) {
    return "+" + cleaned
  }

  if (cleaned.startsWith("01")) {
    return "+880" + cleaned.substring(1)
  }

  if (cleaned.startsWith("1")) {
    return "+880" + cleaned
  }

  return cleaned
}

/**
 * Send OTP to a phone number
 */
export async function sendOtp(
  phone: string,
  purpose: OtpPurpose,
  userId?: string
): Promise<SendOtpResult> {
  const normalizedPhone = normalizePhone(phone)

  // Validate phone format
  if (!validateBangladeshPhone(normalizedPhone)) {
    return {
      success: false,
      message: "Invalid phone number format",
    }
  }

  // Check for recent OTP (cooldown)
  const recentOtp = await prisma.otpVerification.findFirst({
    where: {
      phone: normalizedPhone,
      purpose,
      createdAt: {
        gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
      },
    },
    orderBy: { createdAt: "desc" },
  })

  if (recentOtp) {
    const cooldownRemaining = Math.ceil(
      (RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - recentOtp.createdAt.getTime())) / 1000
    )
    return {
      success: false,
      message: `Please wait ${cooldownRemaining} seconds before requesting a new OTP`,
      cooldownRemaining,
    }
  }

  // Generate OTP
  const otpCode = generateOtpCode()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  // Save OTP to database
  await prisma.otpVerification.create({
    data: {
      userId,
      phone: normalizedPhone,
      otp: otpCode,
      purpose,
      expiresAt,
      attempts: 0,
    },
  })

  // Send OTP via SMS (will be implemented in notification service)
  // For now, log it in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] OTP for ${normalizedPhone}: ${otpCode}`)
  } else {
    // TODO: Integrate with NotificationService
    // await notificationService.sendSms({
    //   to: normalizedPhone,
    //   templateKey: 'otp.verification',
    //   variables: { otp: otpCode },
    // })
  }

  return {
    success: true,
    message: "OTP sent successfully",
    expiresAt,
  }
}

/**
 * Verify an OTP
 */
export async function verifyOtp(
  phone: string,
  otp: string,
  purpose: OtpPurpose
): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone)

  // Find the most recent unverified OTP
  const otpRecord = await prisma.otpVerification.findFirst({
    where: {
      phone: normalizedPhone,
      purpose,
      verifiedAt: null,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  })

  if (!otpRecord) {
    return false
  }

  // Check max attempts
  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    return false
  }

  // Increment attempts
  await prisma.otpVerification.update({
    where: { id: otpRecord.id },
    data: { attempts: otpRecord.attempts + 1 },
  })

  // Verify OTP
  if (otpRecord.otp !== otp) {
    return false
  }

  // Mark as verified
  await prisma.otpVerification.update({
    where: { id: otpRecord.id },
    data: { verifiedAt: new Date() },
  })

  return true
}

/**
 * Check if OTP verification is required for an action
 */
export async function requireOtpVerification(
  userId: string,
  purpose: OtpPurpose
): Promise<boolean> {
  // OTP required for sensitive actions
  const sensitiveActions: OtpPurpose[] = [
    "cancel_appointment",
    "payment",
    "account_deletion",
  ]

  return sensitiveActions.includes(purpose)
}

/**
 * Verify recent OTP for sensitive actions
 * Must have been verified within the last 5 minutes
 */
export async function hasRecentOtpVerification(
  phone: string,
  purpose: OtpPurpose,
  withinMinutes: number = 5
): Promise<boolean> {
  const normalizedPhone = normalizePhone(phone)

  const recentVerification = await prisma.otpVerification.findFirst({
    where: {
      phone: normalizedPhone,
      purpose,
      verifiedAt: {
        gte: new Date(Date.now() - withinMinutes * 60 * 1000),
      },
    },
  })

  return !!recentVerification
}

/**
 * Clean up expired OTP records (run periodically)
 */
export async function cleanupExpiredOtps(): Promise<number> {
  const result = await prisma.otpVerification.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  return result.count
}

// Export types
export type { OtpPurpose, SendOtpResult, VerifyOtpResult }
