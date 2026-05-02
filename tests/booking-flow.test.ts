/**
 * Integration tests for the booking flow API.
 *
 * REQUIRES the dev server to be running: pnpm dev
 * Run standalone: pnpm test:integration
 * Or run as part of Vitest suite: pnpm test (server must be up)
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { startOfDay, addDays } from 'date-fns'

const BASE_URL = 'http://127.0.0.1:3000'

type Doctor = { id: string; nameEn: string }
type Chamber = { chamberId: string; nameEn: string }

let doctor: Doctor
let chamber: Chamber
let firstAvailableDate: string
let serverOnline = false

// ---------------------------------------------------------------------------

describe('Booking Flow — Public APIs', () => {
  beforeAll(async () => {
    try {
      await fetch(`${BASE_URL}/api/doctors?page=1&limit=1`)
      serverOnline = true
    } catch {
      console.warn('⚠️  Dev server offline — integration tests skipped. Run `pnpm dev` to enable.')
    }
  })

  const itOnline = (name: string, fn: () => Promise<void>) =>
    it(name, async () => {
      if (!serverOnline) return
      await fn()
    })

  // ---- Phase 1: Doctors ----
  describe('Phase 1 — GET /api/doctors', () => {
    itOnline('returns a non-empty list of doctors', async () => {
      const res = await fetch(`${BASE_URL}/api/doctors?page=1&limit=20&isAvailable=true`)
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.data.length).toBeGreaterThan(0)
      doctor = json.data[0]
    })

    itOnline('each doctor has an id and nameEn', async () => {
      const res = await fetch(`${BASE_URL}/api/doctors?page=1&limit=5`)
      const json = await res.json()
      for (const d of json.data) {
        expect(d).toHaveProperty('id')
        expect(d).toHaveProperty('nameEn')
      }
    })
  })

  // ---- Phase 2: Chambers ----
  describe('Phase 2 — GET /api/doctors/:id (chamber)', () => {
    itOnline('returns doctor details with at least one chamber', async () => {
      const res = await fetch(`${BASE_URL}/api/doctors/${doctor.id}`)
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data.chambers)).toBe(true)
      expect(json.data.chambers.length).toBeGreaterThan(0)
      chamber = json.data.chambers[0]
    })

    itOnline('chamber has chamberId and nameEn', async () => {
      expect(chamber).toHaveProperty('chamberId')
      expect(chamber).toHaveProperty('nameEn')
    })

    itOnline('returns 404 for unknown doctor id', async () => {
      const res = await fetch(`${BASE_URL}/api/doctors/nonexistent-id`)
      expect(res.status).toBe(404)
    })
  })

  // ---- Phase 3: Available Dates ----
  describe('Phase 3 — GET /api/slots/dates', () => {
    itOnline('returns at least one available date in the next 30 days', async () => {
      const from = startOfDay(new Date())
      const to = addDays(from, 30)

      const url = new URL(`${BASE_URL}/api/slots/dates`)
      url.searchParams.set('doctorId', doctor.id)
      url.searchParams.set('chamberId', chamber.chamberId)
      url.searchParams.set('from', from.toISOString())
      url.searchParams.set('to', to.toISOString())

      const res = await fetch(url)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data.dates)).toBe(true)
      expect(json.data.dates.length).toBeGreaterThan(0)
      firstAvailableDate = json.data.dates[0].date
    })

    itOnline('each date entry has a date string and availableSlots count', async () => {
      const from = startOfDay(new Date())
      const to = addDays(from, 30)
      const url = new URL(`${BASE_URL}/api/slots/dates`)
      url.searchParams.set('doctorId', doctor.id)
      url.searchParams.set('chamberId', chamber.chamberId)
      url.searchParams.set('from', from.toISOString())
      url.searchParams.set('to', to.toISOString())
      const json = await (await fetch(url)).json()
      for (const entry of json.data.dates) {
        expect(entry).toHaveProperty('date')
        expect(entry.availableSlots).toBeGreaterThan(0)
      }
    })

    itOnline('returns empty dates array when range has no schedule', async () => {
      const past = new Date('2000-01-01')
      const pastEnd = new Date('2000-01-07')
      const url = new URL(`${BASE_URL}/api/slots/dates`)
      url.searchParams.set('doctorId', doctor.id)
      url.searchParams.set('chamberId', chamber.chamberId)
      url.searchParams.set('from', past.toISOString())
      url.searchParams.set('to', pastEnd.toISOString())
      const json = await (await fetch(url)).json()
      expect(json.success).toBe(true)
      expect(json.data.dates).toHaveLength(0)
    })
  })

  // ---- Phase 4: Slots ----
  describe('Phase 4 — GET /api/slots', () => {
    itOnline('returns time slots for the first available date', async () => {
      const url = new URL(`${BASE_URL}/api/slots`)
      url.searchParams.set('doctorId', doctor.id)
      url.searchParams.set('chamberId', chamber.chamberId)
      url.searchParams.set('date', new Date(firstAvailableDate).toISOString())

      const res = await fetch(url)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(Array.isArray(json.data.slots)).toBe(true)
      expect(json.data.slots.length).toBeGreaterThan(0)
    })

    itOnline('each slot has startTime, endTime, isAvailable, remainingSlots', async () => {
      const url = new URL(`${BASE_URL}/api/slots`)
      url.searchParams.set('doctorId', doctor.id)
      url.searchParams.set('chamberId', chamber.chamberId)
      url.searchParams.set('date', new Date(firstAvailableDate).toISOString())
      const json = await (await fetch(url)).json()
      for (const slot of json.data.slots) {
        expect(slot).toHaveProperty('startTime')
        expect(slot).toHaveProperty('endTime')
        expect(slot).toHaveProperty('isAvailable')
        expect(slot).toHaveProperty('remainingSlots')
      }
    })

    itOnline('has at least one available slot on the first available date', async () => {
      const url = new URL(`${BASE_URL}/api/slots`)
      url.searchParams.set('doctorId', doctor.id)
      url.searchParams.set('chamberId', chamber.chamberId)
      url.searchParams.set('date', new Date(firstAvailableDate).toISOString())
      const json = await (await fetch(url)).json()
      const available = json.data.slots.filter((s: { isAvailable: boolean }) => s.isAvailable)
      expect(available.length).toBeGreaterThan(0)
    })
  })
})
