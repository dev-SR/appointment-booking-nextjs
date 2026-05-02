/**
 * Pricing Service
 *
 * Calculates the final fee for a booking by applying pricing rules,
 * coupons, and patient credits to the base consultation fee.
 */

import prisma from '@/lib/prisma'
import type { FeeCalculationResponse } from '@/lib/zod-schemas/appointment'

interface Adjustment {
  name: string
  type: string
  amount: number // positive = surcharge, negative = discount
}

/**
 * Calculate the final fee for a booking
 */
export async function calculateFee(
  doctorId: string,
  patientId: string,
  date: Date,
  startTime: string,
  couponCode?: string
): Promise<FeeCalculationResponse> {
  const adjustments: Adjustment[] = []
  const discounts: Adjustment[] = []

  // 1. Get base fee from doctor
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { consultationFee: true, followUpFee: true, followUpValidDays: true },
  })

  if (!doctor) throw new Error('Doctor not found')

  // 2. Check if this is a follow-up
  const followUpCutoff = new Date()
  followUpCutoff.setDate(followUpCutoff.getDate() - (doctor.followUpValidDays || 30))

  const previousAppointment = await prisma.appointment.findFirst({
    where: {
      patientId,
      doctorId,
      status: 'COMPLETED',
      completedAt: { gte: followUpCutoff },
    },
    orderBy: { completedAt: 'desc' },
  })

  const isFollowUp = !!previousAppointment
  const baseFee = isFollowUp ? doctor.followUpFee : doctor.consultationFee

  // 3. Apply PricingRules
  const pricingRules = await prisma.pricingRule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  })

  const [startH, startM] = startTime.split(':').map(Number)
  const appointmentMinutes = startH * 60 + startM
  const dayOfWeek = date.getDay()

  for (const rule of pricingRules) {
    let applies = false

    switch (rule.ruleType) {
      case 'peak_hour':
        if (rule.startTime && rule.endTime) {
          const [rStartH, rStartM] = rule.startTime.split(':').map(Number)
          const [rEndH, rEndM] = rule.endTime.split(':').map(Number)
          const rStart = rStartH * 60 + rStartM
          const rEnd = rEndH * 60 + rEndM
          applies = appointmentMinutes >= rStart && appointmentMinutes < rEnd
        }
        break
      case 'off_peak':
        if (rule.startTime && rule.endTime) {
          const [rStartH, rStartM] = rule.startTime.split(':').map(Number)
          const [rEndH, rEndM] = rule.endTime.split(':').map(Number)
          const rStart = rStartH * 60 + rStartM
          const rEnd = rEndH * 60 + rEndM
          applies = appointmentMinutes >= rStart && appointmentMinutes < rEnd
        }
        break
      case 'new_patient':
        applies = !previousAppointment
        break
      case 'returning':
        applies = !!previousAppointment
        break
    }

    // Check day-of-week filter
    if (applies && rule.daysOfWeek) {
      try {
        const days = JSON.parse(rule.daysOfWeek) as number[]
        applies = days.includes(dayOfWeek)
      } catch {
        // Invalid JSON, skip day filter
      }
    }

    if (applies) {
      let amount: number
      if (rule.adjustmentType === 'percentage') {
        amount = Math.round((baseFee * rule.adjustmentValue) / 10000) // value is in basis points (500 = 5%)
      } else {
        amount = rule.adjustmentValue // fixed paisa amount
      }

      if (amount > 0) {
        adjustments.push({ name: rule.name, type: rule.adjustmentType, amount })
      } else {
        discounts.push({ name: rule.name, type: rule.adjustmentType, amount: Math.abs(amount) })
      }
    }
  }

  // 4. Apply coupon
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    })

    if (coupon && coupon.isActive) {
      const now = new Date()
      const isValid = now >= coupon.validFrom && now <= coupon.validUntil
      const hasUsesLeft = coupon.maxUses === null || coupon.usedCount < coupon.maxUses

      if (isValid && hasUsesLeft) {
        let discountAmount: number
        if (coupon.discountType === 'percentage') {
          discountAmount = Math.round((baseFee * coupon.discountValue) / 10000)
          if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount
          }
        } else {
          discountAmount = coupon.discountValue
        }

        const meetsMinOrder = !coupon.minOrderAmount || baseFee >= coupon.minOrderAmount

        if (meetsMinOrder) {
          discounts.push({ name: `Coupon: ${couponCode}`, type: coupon.discountType, amount: discountAmount })
        }
      }
    }
  }

  // 5. Apply patient credits
  let creditsApplied = 0
  const credits = await prisma.patientCredit.findMany({
    where: {
      patientId,
      usedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'asc' },
  })

  // Calculate subtotal before credits
  const totalAdjustments = adjustments.reduce((sum, a) => sum + a.amount, 0)
  const totalDiscounts = discounts.reduce((sum, d) => sum + d.amount, 0)
  let subtotal = baseFee + totalAdjustments - totalDiscounts

  // Apply credits up to subtotal
  for (const credit of credits) {
    if (subtotal <= 0) break
    const toApply = Math.min(credit.amount, subtotal)
    creditsApplied += toApply
    subtotal -= toApply
  }

  const finalFee = Math.max(0, baseFee + totalAdjustments - totalDiscounts - creditsApplied)

  return {
    baseFee,
    isFollowUp,
    adjustments,
    discounts,
    creditsApplied,
    finalFee,
  }
}
