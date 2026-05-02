/**
 * Unit tests for booking rules validation logic.
 *
 * All DB calls are mocked with vi.mock so no running database is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Mock prisma BEFORE importing the service ----
vi.mock('@/lib/prisma', () => ({
  default: {
    bookingRule: { findFirst: vi.fn() },
    appointment: { count: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
  },
}))

import prisma from '@/lib/prisma'
import {
  validateBooking,
  canCancelAppointment,
  canRescheduleAppointment,
} from '@/lib/services/booking-rules.service'

// Typed mock helpers
const mockRule = (prisma.bookingRule.findFirst as ReturnType<typeof vi.fn>)
const mockCount = (prisma.appointment.count as ReturnType<typeof vi.fn>)
const mockFindFirst = (prisma.appointment.findFirst as ReturnType<typeof vi.fn>)
const mockFindUnique = (prisma.appointment.findUnique as ReturnType<typeof vi.fn>)

const defaultRule = {
  minLeadTimeMinutes: 30,
  maxAdvanceBookingDays: 90,
  sameDayCutoffTime: null,
  maxActiveBookings: 5,
  cancellationDeadlineMins: 60,
  rescheduleDeadlineMins: 60,
  isActive: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRule.mockResolvedValue(defaultRule)
  mockCount.mockResolvedValue(0)
  mockFindFirst.mockResolvedValue(null) // no duplicate
})

// ---------------------------------------------------------------------------

describe('validateBooking — min lead time', () => {
  it('passes when appointment is far enough in the future', async () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000) // +2 hours
    const h = future.getHours()
    const m = future.getMinutes()
    const startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const result = await validateBooking('p1', 'd1', future, startTime)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails when appointment is in the past / within lead time', async () => {
    // Use yesterday at 09:00 — always in the past
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = await validateBooking('p1', 'd1', yesterday, '09:00')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('minutes from now'))).toBe(true)
  })
})

describe('validateBooking — max advance booking', () => {
  it('fails when date is beyond maxAdvanceBookingDays', async () => {
    const tooFar = new Date()
    tooFar.setDate(tooFar.getDate() + 120) // 120 days, rule = 90
    const result = await validateBooking('p1', 'd1', tooFar, '09:00')
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('days in advance'))).toBe(true)
  })

  it('passes when date is within maxAdvanceBookingDays', async () => {
    const near = new Date()
    near.setDate(near.getDate() + 10)
    near.setHours(near.getHours() + 1)
    const h = near.getHours()
    const m = near.getMinutes()
    const result = await validateBooking('p1', 'd1', near, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    expect(result.valid).toBe(true)
  })
})

describe('validateBooking — max active bookings', () => {
  it('fails when patient already has maxActiveBookings', async () => {
    mockCount.mockResolvedValue(5) // at limit
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const h = future.getHours()
    const m = future.getMinutes()
    const result = await validateBooking('p1', 'd1', future, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Maximum'))).toBe(true)
  })
})

describe('validateBooking — duplicate prevention', () => {
  it('fails when a duplicate appointment exists', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing' })
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const h = future.getHours()
    const m = future.getMinutes()
    const result = await validateBooking('p1', 'd1', future, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('already have'))).toBe(true)
  })
})

describe('validateBooking — no active rule', () => {
  it('returns valid when no booking rule exists', async () => {
    mockRule.mockResolvedValue(null)
    const future = new Date()
    const result = await validateBooking('p1', 'd1', future, '09:00')
    expect(result.valid).toBe(true)
  })
})

// ---------------------------------------------------------------------------

describe('canCancelAppointment', () => {
  const futureAppt = {
    id: 'a1',
    status: 'CONFIRMED',
    date: new Date(Date.now() + 5 * 60 * 60 * 1000),
    startTime: (() => {
      const d = new Date(Date.now() + 5 * 60 * 60 * 1000)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })(),
  }

  it('allows cancellation when within policy window', async () => {
    mockFindUnique.mockResolvedValue(futureAppt)
    const result = await canCancelAppointment('a1')
    expect(result.allowed).toBe(true)
  })

  it('disallows cancellation if appointment is already cancelled', async () => {
    mockFindUnique.mockResolvedValue({ ...futureAppt, status: 'CANCELLED' })
    const result = await canCancelAppointment('a1')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('current status')
  })

  it('disallows cancellation if appointment is completed', async () => {
    mockFindUnique.mockResolvedValue({ ...futureAppt, status: 'COMPLETED' })
    const result = await canCancelAppointment('a1')
    expect(result.allowed).toBe(false)
  })

  it('returns not found when appointment does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)
    const result = await canCancelAppointment('nonexistent')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Appointment not found')
  })

  it('disallows cancellation within deadline', async () => {
    const soon = new Date(Date.now() + 10 * 60 * 1000) // 10 min from now, rule = 60
    mockFindUnique.mockResolvedValue({
      id: 'a1',
      status: 'CONFIRMED',
      date: soon,
      startTime: `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`,
    })
    const result = await canCancelAppointment('a1')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('cancel at least')
  })
})

describe('canRescheduleAppointment', () => {
  it('returns not found when appointment does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)
    const result = await canRescheduleAppointment('nonexistent')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Appointment not found')
  })

  it('disallows rescheduling a completed appointment', async () => {
    mockFindUnique.mockResolvedValue({ id: 'a1', status: 'COMPLETED', date: new Date(), startTime: '09:00' })
    const result = await canRescheduleAppointment('a1')
    expect(result.allowed).toBe(false)
  })

  it('allows rescheduling a confirmed appointment far enough in future', async () => {
    const future = new Date(Date.now() + 5 * 60 * 60 * 1000)
    const st = `${String(future.getHours()).padStart(2, '0')}:${String(future.getMinutes()).padStart(2, '0')}`
    mockFindUnique.mockResolvedValue({ id: 'a1', status: 'CONFIRMED', date: future, startTime: st })
    const result = await canRescheduleAppointment('a1')
    expect(result.allowed).toBe(true)
  })
})
