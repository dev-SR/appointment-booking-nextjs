/**
 * Unit tests for pricing service.
 *
 * All DB calls are mocked — no running database required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  default: {
    doctor: { findUnique: vi.fn() },
    appointment: { findFirst: vi.fn() },
    pricingRule: { findMany: vi.fn() },
    coupon: { findUnique: vi.fn() },
    patientCredit: { findMany: vi.fn() },
  },
}))

import prisma from '@/lib/prisma'
import { calculateFee } from '@/lib/services/pricing.service'

const mockDoctor = (prisma.doctor.findUnique as ReturnType<typeof vi.fn>)
const mockPrevAppt = (prisma.appointment.findFirst as ReturnType<typeof vi.fn>)
const mockPricingRules = (prisma.pricingRule.findMany as ReturnType<typeof vi.fn>)
const mockCoupon = (prisma.coupon.findUnique as ReturnType<typeof vi.fn>)
const mockCredits = (prisma.patientCredit.findMany as ReturnType<typeof vi.fn>)

const baseDoctor = {
  consultationFee: 80000, // 800 BDT in paisa
  followUpFee: 40000,     // 400 BDT
  followUpValidDays: 30,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDoctor.mockResolvedValue(baseDoctor)
  mockPrevAppt.mockResolvedValue(null) // new patient by default
  mockPricingRules.mockResolvedValue([])
  mockCoupon.mockResolvedValue(null)
  mockCredits.mockResolvedValue([])
})

// ---------------------------------------------------------------------------

describe('calculateFee — base fee', () => {
  it('returns consultationFee for a new patient', async () => {
    const result = await calculateFee('d1', 'p1', new Date(), '10:00')
    expect(result.baseFee).toBe(80000)
    expect(result.isFollowUp).toBe(false)
    expect(result.finalFee).toBe(80000)
  })

  it('returns followUpFee for a returning patient', async () => {
    mockPrevAppt.mockResolvedValue({ id: 'prev', completedAt: new Date() })
    const result = await calculateFee('d1', 'p1', new Date(), '10:00')
    expect(result.baseFee).toBe(40000)
    expect(result.isFollowUp).toBe(true)
    expect(result.finalFee).toBe(40000)
  })

  it('throws if doctor not found', async () => {
    mockDoctor.mockResolvedValue(null)
    await expect(calculateFee('bad', 'p1', new Date(), '10:00')).rejects.toThrow('Doctor not found')
  })
})

describe('calculateFee — pricing rules', () => {
  it('applies a fixed surcharge', async () => {
    mockPricingRules.mockResolvedValue([
      { name: 'Evening Surcharge', ruleType: 'peak_hour', adjustmentType: 'fixed', adjustmentValue: 10000, startTime: '18:00', endTime: '22:00', daysOfWeek: null, priority: 1, isActive: true },
    ])
    // Time is 19:00 — inside peak window
    const result = await calculateFee('d1', 'p1', new Date(), '19:00')
    expect(result.adjustments).toHaveLength(1)
    expect(result.finalFee).toBe(90000) // 800 + 100
  })

  it('does not apply surcharge outside time window', async () => {
    mockPricingRules.mockResolvedValue([
      { name: 'Evening Surcharge', ruleType: 'peak_hour', adjustmentType: 'fixed', adjustmentValue: 10000, startTime: '18:00', endTime: '22:00', daysOfWeek: null, priority: 1, isActive: true },
    ])
    const result = await calculateFee('d1', 'p1', new Date(), '10:00')
    expect(result.adjustments).toHaveLength(0)
    expect(result.finalFee).toBe(80000)
  })

  it('applies a percentage discount for off-peak', async () => {
    // 500 basis points = 5% discount → 80000 * 0.05 = 4000 paisa discount → finalFee = 76000
    mockPricingRules.mockResolvedValue([
      { name: 'Morning Discount', ruleType: 'off_peak', adjustmentType: 'percentage', adjustmentValue: -500, startTime: '07:00', endTime: '09:00', daysOfWeek: null, priority: 1, isActive: true },
    ])
    const result = await calculateFee('d1', 'p1', new Date(), '08:00')
    expect(result.discounts).toHaveLength(1)
    expect(result.finalFee).toBe(76000)
  })
})

describe('calculateFee — coupons', () => {
  const validCoupon = {
    code: 'SAVE50',
    isActive: true,
    validFrom: new Date(Date.now() - 86400000),
    validUntil: new Date(Date.now() + 86400000),
    maxUses: null,
    usedCount: 0,
    discountType: 'fixed',
    discountValue: 5000, // 50 BDT
    maxDiscount: null,
    minOrderAmount: null,
  }

  it('applies a valid fixed coupon', async () => {
    mockCoupon.mockResolvedValue(validCoupon)
    const result = await calculateFee('d1', 'p1', new Date(), '10:00', 'SAVE50')
    expect(result.discounts.some((d) => d.name.includes('SAVE50'))).toBe(true)
    expect(result.finalFee).toBe(75000)
  })

  it('ignores an expired coupon', async () => {
    mockCoupon.mockResolvedValue({ ...validCoupon, validUntil: new Date(Date.now() - 86400000) })
    const result = await calculateFee('d1', 'p1', new Date(), '10:00', 'SAVE50')
    expect(result.discounts).toHaveLength(0)
    expect(result.finalFee).toBe(80000)
  })

  it('respects maxDiscount on percentage coupon', async () => {
    // 20% of 80000 = 16000, but maxDiscount = 10000
    mockCoupon.mockResolvedValue({
      ...validCoupon,
      discountType: 'percentage',
      discountValue: 2000, // 20% in basis points
      maxDiscount: 10000,
    })
    const result = await calculateFee('d1', 'p1', new Date(), '10:00', 'PCT20')
    const couponDiscount = result.discounts.find((d) => d.name.includes('PCT20'))
    expect(couponDiscount?.amount).toBe(10000)
    expect(result.finalFee).toBe(70000)
  })

  it('ignores coupon below minOrderAmount', async () => {
    mockCoupon.mockResolvedValue({ ...validCoupon, minOrderAmount: 100000 }) // min 1000 BDT
    const result = await calculateFee('d1', 'p1', new Date(), '10:00', 'SAVE50')
    expect(result.discounts).toHaveLength(0)
  })
})

describe('calculateFee — patient credits', () => {
  it('applies available credits to reduce final fee', async () => {
    mockCredits.mockResolvedValue([
      { id: 'cr1', amount: 20000, expiresAt: null, usedAt: null, createdAt: new Date() },
    ])
    const result = await calculateFee('d1', 'p1', new Date(), '10:00')
    expect(result.creditsApplied).toBe(20000)
    expect(result.finalFee).toBe(60000)
  })

  it('never makes final fee negative', async () => {
    mockCredits.mockResolvedValue([
      { id: 'cr1', amount: 200000, expiresAt: null, usedAt: null, createdAt: new Date() }, // more than fee
    ])
    const result = await calculateFee('d1', 'p1', new Date(), '10:00')
    expect(result.finalFee).toBeGreaterThanOrEqual(0)
    expect(result.creditsApplied).toBeLessThanOrEqual(80000)
  })

  it('applies multiple credits in order', async () => {
    mockCredits.mockResolvedValue([
      { id: 'cr1', amount: 10000, expiresAt: null, usedAt: null, createdAt: new Date(Date.now() - 2000) },
      { id: 'cr2', amount: 10000, expiresAt: null, usedAt: null, createdAt: new Date() },
    ])
    const result = await calculateFee('d1', 'p1', new Date(), '10:00')
    expect(result.creditsApplied).toBe(20000)
    expect(result.finalFee).toBe(60000)
  })
})
