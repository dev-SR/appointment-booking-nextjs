/**
 * GET /api/slots/dates?doctorId=&from=&to=&chamberId=
 * Public endpoint — returns dates with available slots in a range
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAvailableDates } from '@/lib/services/slot-engine.service'
import { getAvailableDatesQuerySchema } from '@/lib/zod-schemas/slot'

export async function GET(req: NextRequest) {
  const searchParams = Object.fromEntries(req.nextUrl.searchParams)

  const parsed = getAvailableDatesQuerySchema.safeParse(searchParams)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, validationErrors: parsed.error.issues },
      { status: 400 }
    )
  }

  try {
    const { doctorId, from, to, chamberId } = parsed.data
    const dates = await getAvailableDates(doctorId, from, to, chamberId)
    return NextResponse.json({
      success: true,
      data: { doctorId, dates },
    })
  } catch (error) {
    console.error('Error getting available dates:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
