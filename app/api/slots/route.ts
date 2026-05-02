/**
 * GET /api/slots?doctorId=&date=&chamberId=
 * Public endpoint — returns available time slots for a doctor on a date
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateSlots } from '@/lib/services/slot-engine.service'
import { getAvailableSlotsQuerySchema } from '@/lib/zod-schemas/slot'

export async function GET(req: NextRequest) {
  const searchParams = Object.fromEntries(req.nextUrl.searchParams)

  const parsed = getAvailableSlotsQuerySchema.safeParse(searchParams)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, validationErrors: parsed.error.issues },
      { status: 400 }
    )
  }

  try {
    const { doctorId, date, chamberId } = parsed.data
    const result = await generateSlots(doctorId, date, chamberId)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error generating slots:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
