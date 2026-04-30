/**
 * Appointment Service
 *
 * Core appointment lifecycle operations:
 * Create → Confirm → Check-in → Complete / Cancel / No-Show
 */

import prisma from '@/lib/prisma'
import { validateBooking, canCancelAppointment, canRescheduleAppointment } from './booking-rules.service'
import { calculateFee } from './pricing.service'
import { generateSlots } from './slot-engine.service'
import type { CreateAppointmentInput, ListAppointmentsQuery } from '@/lib/zod-schemas/appointment'

/**
 * Create a new appointment with full booking flow
 */
export async function createAppointment(
  input: CreateAppointmentInput,
  patientId: string,
  bookedById: string
) {
  // 1. Validate booking rules
  const validation = await validateBooking(patientId, input.doctorId, input.date, input.startTime)
  if (!validation.valid) {
    return { success: false as const, errors: validation.errors }
  }

  // 2. Verify slot is still available
  const slots = await generateSlots(input.doctorId, input.date, input.chamberId)
  const targetSlot = slots.slots.find(
    (s) => s.startTime === input.startTime && s.endTime === input.endTime
  )
  if (!targetSlot || !targetSlot.isAvailable) {
    return { success: false as const, errors: ['Selected time slot is no longer available'] }
  }

  // 3. Calculate fee
  const feeCalc = await calculateFee(
    input.doctorId, patientId, input.date, input.startTime, input.couponCode
  )

  // 4. Generate serial number for the day
  const startOfDay = new Date(input.date); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(input.date); endOfDay.setHours(23, 59, 59, 999)
  const lastSerial = await prisma.appointment.findFirst({
    where: { doctorId: input.doctorId, date: { gte: startOfDay, lte: endOfDay } },
    orderBy: { serialNumber: 'desc' },
    select: { serialNumber: true },
  })
  const serialNumber = (lastSerial?.serialNumber ?? 0) + 1

  // 5. Create appointment and payment in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Determine initial status based on payment method
    const isCashOrPayLater = input.paymentMethod === 'CASH' || input.paymentMethod === 'PAY_LATER'
    const initialStatus = isCashOrPayLater ? 'CONFIRMED' : 'PENDING'

    const appointment = await tx.appointment.create({
      data: {
        serialNumber,
        patientId,
        doctorId: input.doctorId,
        chamberId: input.chamberId,
        familyMemberId: input.familyMemberId || null,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        status: initialStatus,
        type: input.type || 'CONSULTATION',
        isFollowUp: feeCalc.isFollowUp,
        symptoms: input.symptoms || null,
        notes: input.notes || null,
        consultationFee: feeCalc.baseFee,
        discountAmount: feeCalc.discounts.reduce((sum, d) => sum + d.amount, 0) + feeCalc.creditsApplied,
        finalFee: feeCalc.finalFee,
        bookedById,
      },
    })

    // Create payment record
    const paymentStatus = isCashOrPayLater ? 'PENDING' : 'PENDING'
    const payment = await tx.payment.create({
      data: {
        appointmentId: appointment.id,
        amount: feeCalc.finalFee,
        status: isCashOrPayLater ? 'PENDING' : 'PENDING',
        provider: input.paymentMethod === 'CASH' || input.paymentMethod === 'PAY_LATER'
          ? null
          : input.paymentMethod.toLowerCase(),
        initiatedById: bookedById,
      },
    })

    // Apply coupon usage if applicable
    if (input.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: input.couponCode } })
      if (coupon) {
        const couponDiscount = feeCalc.discounts.find(d => d.name.startsWith('Coupon:'))
        if (couponDiscount) {
          await tx.couponUsage.create({
            data: {
              couponId: coupon.id,
              appointmentId: appointment.id,
              discountApplied: couponDiscount.amount,
            },
          })
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          })
        }
      }
    }

    return { appointment, payment }
  })

  return {
    success: true as const,
    data: {
      appointmentId: result.appointment.id,
      serialNumber: result.appointment.serialNumber,
      status: result.appointment.status,
      finalFee: result.appointment.finalFee,
      paymentId: result.payment.id,
      feeBreakdown: feeCalc,
    },
  }
}

/**
 * Get a single appointment by ID with all relations
 */
export async function getAppointment(id: string) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { include: { user: { select: { nameEn: true, nameBn: true, phone: true, profileImageUrl: true } } } },
      doctor: { include: { user: { select: { nameEn: true, nameBn: true } }, specialty: { select: { nameEn: true, nameBn: true } } } },
      chamber: { select: { id: true, nameEn: true, nameBn: true, addressEn: true, addressBn: true } },
      familyMember: { select: { id: true, nameEn: true, nameBn: true, relationship: true } },
      payment: { select: { id: true, amount: true, status: true, provider: true, paidAt: true } },
    },
  })
}

/**
 * List appointments with pagination and filtering
 */
export async function listAppointments(query: ListAppointmentsQuery) {
  const { page, limit, patientId, doctorId, chamberId, dateFrom, dateTo, status, type, sortBy, sortOrder } = query

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}
  if (patientId) where.patientId = patientId
  if (doctorId) where.doctorId = doctorId
  if (chamberId) where.chamberId = chamberId
  if (status) where.status = status
  if (type) where.type = type
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) where.date.gte = dateFrom
    if (dateTo) where.date.lte = dateTo
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: Record<string, any> = {}
  orderBy[sortBy] = sortOrder

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
      include: {
        patient: { include: { user: { select: { nameEn: true, nameBn: true, phone: true } } } },
        doctor: { include: { user: { select: { nameEn: true, nameBn: true } }, specialty: { select: { nameEn: true } } } },
        chamber: { select: { id: true, nameEn: true, nameBn: true } },
        payment: { select: { id: true, amount: true, status: true, provider: true } },
      },
    }),
    prisma.appointment.count({ where }),
  ])

  return {
    data: appointments.map(transformAppointment),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(
  id: string, reason: string, cancelledById: string
) {
  const check = await canCancelAppointment(id)
  if (!check.allowed) {
    return { success: false as const, error: check.reason }
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason,
      cancelledById,
    },
  })

  return { success: true as const, data: appointment }
}

/**
 * Check in a patient
 */
export async function checkInAppointment(id: string) {
  const appt = await prisma.appointment.findUnique({ where: { id } })
  if (!appt) return { success: false as const, error: 'Appointment not found' }
  if (!['CONFIRMED', 'PENDING'].includes(appt.status)) {
    return { success: false as const, error: 'Cannot check in from current status' }
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'CHECKED_IN', checkedInAt: new Date() },
  })

  return { success: true as const, data: updated }
}

/**
 * Complete an appointment
 */
export async function completeAppointment(id: string) {
  const appt = await prisma.appointment.findUnique({ where: { id } })
  if (!appt) return { success: false as const, error: 'Appointment not found' }
  if (!['CHECKED_IN', 'IN_PROGRESS'].includes(appt.status)) {
    return { success: false as const, error: 'Cannot complete from current status' }
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })

  return { success: true as const, data: updated }
}

/**
 * Mark appointment as no-show
 */
export async function markNoShow(id: string) {
  const appt = await prisma.appointment.findUnique({ where: { id } })
  if (!appt) return { success: false as const, error: 'Appointment not found' }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'NO_SHOW' },
  })

  return { success: true as const, data: updated }
}

// Transform DB appointment to response format
function transformAppointment(appt: Awaited<ReturnType<typeof prisma.appointment.findFirst>> & Record<string, unknown>) {
  if (!appt) return null
  const a = appt as Record<string, unknown>
  return {
    id: appt.id,
    serialNumber: appt.serialNumber,
    date: appt.date instanceof Date ? appt.date.toISOString() : String(appt.date),
    startTime: appt.startTime,
    endTime: appt.endTime,
    status: appt.status,
    type: appt.type,
    isFollowUp: appt.isFollowUp,
    symptoms: appt.symptoms,
    notes: appt.notes,
    consultationFee: appt.consultationFee,
    discountAmount: appt.discountAmount,
    finalFee: appt.finalFee,
    checkedInAt: appt.checkedInAt ? (appt.checkedInAt as Date).toISOString() : null,
    completedAt: appt.completedAt ? (appt.completedAt as Date).toISOString() : null,
    cancelledAt: appt.cancelledAt ? (appt.cancelledAt as Date).toISOString() : null,
    cancelReason: appt.cancelReason,
    createdAt: appt.createdAt instanceof Date ? appt.createdAt.toISOString() : String(appt.createdAt),
    patient: a.patient,
    doctor: a.doctor,
    chamber: a.chamber,
    familyMember: a.familyMember || null,
    payment: a.payment || null,
  }
}
