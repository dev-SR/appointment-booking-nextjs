/**
 * Slot Engine Service
 *
 * Generates available appointment time slots for a doctor on a specific date.
 * This is the backbone of the booking system.
 *
 * Flow:
 * 1. Load Schedule (weekly template) for the doctor
 * 2. Apply ScheduleException overrides (leave, holidays, breaks)
 * 3. Check Holiday table
 * 4. Generate raw time slots using slotIntervalMins
 * 5. Subtract pre/post buffer from DoctorService entries
 * 6. Exclude slots with existing active Appointments
 * 7. Return array of { startTime, endTime, isAvailable, remainingSlots }
 */

import prisma from '@/lib/prisma'
import { format, addDays, isSameDay } from 'date-fns'
import type { SlotResponse, AvailableSlotsResponse } from '@/lib/zod-schemas/slot'

interface TimeRange {
  startMinutes: number
  endMinutes: number
}

/**
 * Parse "HH:MM" to minutes from midnight
 */
function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Convert minutes from midnight to "HH:MM"
 */
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Generate raw time slots from a time range with an interval
 */
function generateRawSlots(
  startMinutes: number,
  endMinutes: number,
  intervalMins: number,
  maxPatients: number
): Array<{ startTime: string; endTime: string; maxPatients: number }> {
  const slots: Array<{ startTime: string; endTime: string; maxPatients: number }> = []

  for (let current = startMinutes; current + intervalMins <= endMinutes; current += intervalMins) {
    slots.push({
      startTime: formatTime(current),
      endTime: formatTime(current + intervalMins),
      maxPatients,
    })
  }

  return slots
}

/**
 * Check if a date is a holiday
 */
async function isHoliday(date: Date): Promise<boolean> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const holiday = await prisma.holiday.findFirst({
    where: {
      OR: [
        // Exact date match
        {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        // Recurring holidays — match month and day
        {
          isRecurring: true,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      ],
    },
  })

  return !!holiday
}

/**
 * Get schedule exceptions for a doctor on a specific date
 */
async function getExceptions(doctorId: string, date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return prisma.scheduleException.findMany({
    where: {
      doctorId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })
}

/**
 * Get existing appointments for a doctor on a specific date
 * Excludes CANCELLED and NO_SHOW appointments
 */
async function getExistingAppointments(doctorId: string, date: Date, chamberId?: string) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const where: Parameters<typeof prisma.appointment.findMany>[0]['where'] = {
    doctorId,
    date: {
      gte: startOfDay,
      lte: endOfDay,
    },
    status: {
      notIn: ['CANCELLED', 'NO_SHOW'],
    },
  }

  if (chamberId) {
    where.chamberId = chamberId
  }

  return prisma.appointment.findMany({
    where,
    select: {
      startTime: true,
      endTime: true,
    },
  })
}

/**
 * Generate available slots for a doctor on a specific date
 */
export async function generateSlots(
  doctorId: string,
  date: Date,
  chamberId?: string
): Promise<AvailableSlotsResponse> {
  const dateStr = format(date, 'yyyy-MM-dd')
  const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday

  // Step 1: Check if it's a holiday
  const holiday = await isHoliday(date)
  if (holiday) {
    return {
      doctorId,
      date: dateStr,
      slots: [],
      totalSlots: 0,
      availableCount: 0,
    }
  }

  // Step 2: Get schedule exceptions
  const exceptions = await getExceptions(doctorId, date)

  // Check for full-day blocks (LEAVE or HOLIDAY exception type)
  const hasFullDayBlock = exceptions.some(
    (e) => e.exceptionType === 'LEAVE' || e.exceptionType === 'HOLIDAY'
  )

  if (hasFullDayBlock) {
    return {
      doctorId,
      date: dateStr,
      slots: [],
      totalSlots: 0,
      availableCount: 0,
    }
  }

  // Step 3: Get weekly schedule template for this day
  const schedules = await prisma.schedule.findMany({
    where: {
      doctorId,
      dayOfWeek,
      isActive: true,
    },
  })

  if (schedules.length === 0) {
    return {
      doctorId,
      date: dateStr,
      slots: [],
      totalSlots: 0,
      availableCount: 0,
    }
  }

  // Step 4: Apply exceptions to modify time ranges
  let timeRanges: Array<{
    startMinutes: number
    endMinutes: number
    slotIntervalMins: number
    maxPatients: number
  }> = schedules.map((s) => ({
    startMinutes: parseTime(s.startTime),
    endMinutes: parseTime(s.endTime),
    slotIntervalMins: s.slotIntervalMins,
    maxPatients: s.maxPatients ?? 1,
  }))

  // Apply EXTENDED/REDUCED exceptions
  for (const exception of exceptions) {
    if (exception.exceptionType === 'EXTENDED' && exception.startTime && exception.endTime) {
      // Add extended range
      timeRanges.push({
        startMinutes: parseTime(exception.startTime),
        endMinutes: parseTime(exception.endTime),
        slotIntervalMins: schedules[0].slotIntervalMins, // Use first schedule's interval
        maxPatients: schedules[0].maxPatients ?? 1,
      })
    } else if (exception.exceptionType === 'REDUCED' && exception.startTime && exception.endTime) {
      // Replace with reduced range
      timeRanges = [{
        startMinutes: parseTime(exception.startTime),
        endMinutes: parseTime(exception.endTime),
        slotIntervalMins: schedules[0].slotIntervalMins,
        maxPatients: schedules[0].maxPatients ?? 1,
      }]
    }
  }

  // Collect break times to exclude
  const breakRanges: TimeRange[] = exceptions
    .filter((e) => e.exceptionType === 'BREAK' && e.startTime && e.endTime)
    .map((e) => ({
      startMinutes: parseTime(e.startTime!),
      endMinutes: parseTime(e.endTime!),
    }))

  // Step 5: Generate raw slots from all time ranges
  let allSlots: Array<{ startTime: string; endTime: string; maxPatients: number }> = []

  for (const range of timeRanges) {
    const slots = generateRawSlots(
      range.startMinutes,
      range.endMinutes,
      range.slotIntervalMins,
      range.maxPatients
    )
    allSlots.push(...slots)
  }

  // Remove slots that overlap with break times
  allSlots = allSlots.filter((slot) => {
    const slotStart = parseTime(slot.startTime)
    const slotEnd = parseTime(slot.endTime)

    for (const br of breakRanges) {
      // Slot overlaps with break if they share any time
      if (slotStart < br.endMinutes && slotEnd > br.startMinutes) {
        return false
      }
    }
    return true
  })

  // Step 6: Get existing appointments and calculate availability
  const existingAppointments = await getExistingAppointments(doctorId, date, chamberId)

  // Count bookings per time slot
  const bookingCounts = new Map<string, number>()
  for (const appt of existingAppointments) {
    const key = `${appt.startTime}-${appt.endTime}`
    bookingCounts.set(key, (bookingCounts.get(key) || 0) + 1)
  }

  // Step 7: Build final slot response
  const slots: SlotResponse[] = allSlots.map((slot) => {
    const key = `${slot.startTime}-${slot.endTime}`
    const booked = bookingCounts.get(key) || 0
    const remaining = slot.maxPatients - booked

    return {
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: remaining > 0,
      remainingSlots: Math.max(0, remaining),
    }
  })

  // Sort by start time
  slots.sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime))

  return {
    doctorId,
    date: dateStr,
    slots,
    totalSlots: slots.length,
    availableCount: slots.filter((s) => s.isAvailable).length,
  }
}

/**
 * Get available dates in a date range for a doctor
 * Returns dates that have at least one available slot
 */
export async function getAvailableDates(
  doctorId: string,
  from: Date,
  to: Date,
  chamberId?: string
): Promise<Array<{ date: string; availableSlots: number }>> {
  const results: Array<{ date: string; availableSlots: number }> = []
  const current = new Date(from)
  current.setHours(0, 0, 0, 0)

  const endDate = new Date(to)
  endDate.setHours(23, 59, 59, 999)

  // Iterate through each day in the range
  while (current <= endDate) {
    const slotsResponse = await generateSlots(doctorId, current, chamberId)

    if (slotsResponse.availableCount > 0) {
      results.push({
        date: format(current, 'yyyy-MM-dd'),
        availableSlots: slotsResponse.availableCount,
      })
    }

    // Move to next day
    current.setDate(current.getDate() + 1)
  }

  return results
}
