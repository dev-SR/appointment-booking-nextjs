/**
 * Booking Rules Service
 *
 * Enforces booking constraints from the BookingRule table.
 */

import prisma from '@/lib/prisma'

export interface BookingValidationResult {
  valid: boolean
  errors: string[]
}

export async function validateBooking(
  patientId: string,
  doctorId: string,
  date: Date,
  startTime: string
): Promise<BookingValidationResult> {
  const errors: string[] = []
  const rule = await prisma.bookingRule.findFirst({ where: { isActive: true } })

  if (!rule) return { valid: true, errors: [] }

  const now = new Date()
  const [startH, startM] = startTime.split(':').map(Number)
  const appointmentDateTime = new Date(date)
  appointmentDateTime.setHours(startH, startM, 0, 0)

  // 1. Min lead time
  const leadTimeMins = (appointmentDateTime.getTime() - now.getTime()) / 60000
  if (leadTimeMins < rule.minLeadTimeMinutes) {
    errors.push(`Appointment must be at least ${rule.minLeadTimeMinutes} minutes from now`)
  }

  // 2. Max advance days
  const maxDate = new Date(now)
  maxDate.setDate(maxDate.getDate() + rule.maxAdvanceBookingDays)
  maxDate.setHours(23, 59, 59, 999)
  if (appointmentDateTime > maxDate) {
    errors.push(`Appointments can only be booked up to ${rule.maxAdvanceBookingDays} days in advance`)
  }

  // 3. Same-day cutoff
  if (rule.sameDayCutoffTime) {
    const today = new Date(now); today.setHours(0, 0, 0, 0)
    const apptDay = new Date(date); apptDay.setHours(0, 0, 0, 0)
    if (today.getTime() === apptDay.getTime()) {
      const [cH, cM] = rule.sameDayCutoffTime.split(':').map(Number)
      if (now.getHours() * 60 + now.getMinutes() >= cH * 60 + cM) {
        errors.push(`Same-day bookings not allowed after ${rule.sameDayCutoffTime}`)
      }
    }
  }

  // 4. Max active bookings
  const active = await prisma.appointment.count({
    where: { patientId, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] } },
  })
  if (active >= rule.maxActiveBookings) {
    errors.push(`Maximum ${rule.maxActiveBookings} active appointments allowed. You have ${active}.`)
  }

  // 5. Duplicate check
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999)
  const dup = await prisma.appointment.findFirst({
    where: { patientId, doctorId, date: { gte: startOfDay, lte: endOfDay }, startTime, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
  })
  if (dup) errors.push('You already have an appointment with this doctor at this time')

  return { valid: errors.length === 0, errors }
}

export async function canCancelAppointment(appointmentId: string): Promise<{ allowed: boolean; reason?: string }> {
  const rule = await prisma.bookingRule.findFirst({ where: { isActive: true } })
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } })
  if (!appt) return { allowed: false, reason: 'Appointment not found' }
  if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appt.status)) {
    return { allowed: false, reason: 'Cannot cancel in current status' }
  }
  if (rule) {
    const [h, m] = appt.startTime.split(':').map(Number)
    const dt = new Date(appt.date); dt.setHours(h, m, 0, 0)
    const minsUntil = (dt.getTime() - Date.now()) / 60000
    if (minsUntil < rule.cancellationDeadlineMins) {
      return { allowed: false, reason: `Must cancel at least ${rule.cancellationDeadlineMins} min before` }
    }
  }
  return { allowed: true }
}

export async function canRescheduleAppointment(appointmentId: string): Promise<{ allowed: boolean; reason?: string }> {
  const rule = await prisma.bookingRule.findFirst({ where: { isActive: true } })
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } })
  if (!appt) return { allowed: false, reason: 'Appointment not found' }
  if (['CANCELLED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED'].includes(appt.status)) {
    return { allowed: false, reason: 'Cannot reschedule in current status' }
  }
  if (rule) {
    const [h, m] = appt.startTime.split(':').map(Number)
    const dt = new Date(appt.date); dt.setHours(h, m, 0, 0)
    const minsUntil = (dt.getTime() - Date.now()) / 60000
    if (minsUntil < rule.rescheduleDeadlineMins) {
      return { allowed: false, reason: `Must reschedule at least ${rule.rescheduleDeadlineMins} min before` }
    }
  }
  return { allowed: true }
}
