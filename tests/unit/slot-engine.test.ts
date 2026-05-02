/**
 * Unit tests for slot engine pure functions.
 *
 * These test the time-parsing and slot-generation logic WITHOUT any database calls.
 * We extract and test the private helpers by reproducing them here.
 */
import { describe, it, expect } from 'vitest'

// ----- Re-implement pure helpers (mirrored from slot-engine.service.ts) -----

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function generateRawSlots(
  startMinutes: number,
  endMinutes: number,
  intervalMins: number,
  maxPatients: number
): Array<{ startTime: string; endTime: string; maxPatients: number }> {
  const slots: Array<{ startTime: string; endTime: string; maxPatients: number }> = []
  for (let current = startMinutes; current + intervalMins <= endMinutes; current += intervalMins) {
    slots.push({ startTime: formatTime(current), endTime: formatTime(current + intervalMins), maxPatients })
  }
  return slots
}

function filterBreaks(
  slots: Array<{ startTime: string; endTime: string; maxPatients: number }>,
  breaks: Array<{ startMinutes: number; endMinutes: number }>
) {
  return slots.filter((slot) => {
    const s = parseTime(slot.startTime)
    const e = parseTime(slot.endTime)
    return !breaks.some((br) => s < br.endMinutes && e > br.startMinutes)
  })
}

// ---------------------------------------------------------------------------

describe('parseTime', () => {
  it('converts "09:00" to 540 minutes', () => {
    expect(parseTime('09:00')).toBe(540)
  })

  it('converts "00:00" to 0', () => {
    expect(parseTime('00:00')).toBe(0)
  })

  it('converts "23:59" to 1439', () => {
    expect(parseTime('23:59')).toBe(1439)
  })

  it('converts "13:30" to 810', () => {
    expect(parseTime('13:30')).toBe(810)
  })
})

describe('formatTime', () => {
  it('converts 540 to "09:00"', () => {
    expect(formatTime(540)).toBe('09:00')
  })

  it('converts 0 to "00:00"', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('converts 1439 to "23:59"', () => {
    expect(formatTime(1439)).toBe('23:59')
  })

  it('pads single-digit hours and minutes', () => {
    expect(formatTime(65)).toBe('01:05')
  })
})

describe('parseTime / formatTime are inverses', () => {
  const times = ['08:00', '09:30', '12:00', '17:45', '23:00']
  times.forEach((t) => {
    it(`round-trips "${t}"`, () => {
      expect(formatTime(parseTime(t))).toBe(t)
    })
  })
})

describe('generateRawSlots', () => {
  it('generates correct number of 20-min slots in a 1-hour window', () => {
    const slots = generateRawSlots(540, 600, 20, 1) // 09:00 – 10:00
    expect(slots).toHaveLength(3)
  })

  it('has correct start and end times', () => {
    const slots = generateRawSlots(540, 600, 20, 1)
    expect(slots[0]).toEqual({ startTime: '09:00', endTime: '09:20', maxPatients: 1 })
    expect(slots[1]).toEqual({ startTime: '09:20', endTime: '09:40', maxPatients: 1 })
    expect(slots[2]).toEqual({ startTime: '09:40', endTime: '10:00', maxPatients: 1 })
  })

  it('returns empty array when window < interval', () => {
    const slots = generateRawSlots(540, 550, 20, 1) // only 10 mins available
    expect(slots).toHaveLength(0)
  })

  it('returns empty array when start === end', () => {
    expect(generateRawSlots(540, 540, 20, 1)).toHaveLength(0)
  })

  it('respects maxPatients field', () => {
    const slots = generateRawSlots(540, 600, 30, 5)
    slots.forEach((s) => expect(s.maxPatients).toBe(5))
  })

  it('generates 8 slots for a 4-hour session with 30-min intervals', () => {
    const slots = generateRawSlots(540, 780, 30, 1) // 09:00 – 13:00
    expect(slots).toHaveLength(8)
  })

  it('last slot ends exactly at window end', () => {
    const slots = generateRawSlots(540, 600, 20, 1)
    expect(slots.at(-1)?.endTime).toBe('10:00')
  })
})

describe('filterBreaks', () => {
  const baseSlots = generateRawSlots(540, 720, 30, 1) // 09:00 – 12:00 → 6 slots

  it('removes slots that overlap with a break', () => {
    const breakRanges = [{ startMinutes: parseTime('10:00'), endMinutes: parseTime('10:30') }]
    const filtered = filterBreaks(baseSlots, breakRanges)
    expect(filtered.some((s) => s.startTime === '10:00')).toBe(false)
    expect(filtered).toHaveLength(5)
  })

  it('keeps all slots when no breaks', () => {
    expect(filterBreaks(baseSlots, [])).toHaveLength(6)
  })

  it('removes multiple slots for a long break', () => {
    const breakRanges = [{ startMinutes: parseTime('10:00'), endMinutes: parseTime('11:30') }]
    const filtered = filterBreaks(baseSlots, breakRanges)
    // 10:00-10:30 and 10:30-11:00 and 11:00-11:30 all overlap
    expect(filtered).toHaveLength(3)
  })

  it('does not remove adjacent slots', () => {
    // break 10:30 – 11:00 → only the 10:30 slot is removed
    const breakRanges = [{ startMinutes: parseTime('10:30'), endMinutes: parseTime('11:00') }]
    const filtered = filterBreaks(baseSlots, breakRanges)
    expect(filtered.some((s) => s.startTime === '09:00')).toBe(true)
    expect(filtered.some((s) => s.startTime === '10:00')).toBe(true)
    expect(filtered.some((s) => s.startTime === '11:00')).toBe(true)
    expect(filtered.some((s) => s.startTime === '10:30')).toBe(false)
  })
})
