/**
 * POST /api/appointments/[id]/check-in — Check in a patient
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePermission } from '@/lib/services/authorization.service'
import { checkInAppointment } from '@/lib/services/appointment.service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  await requirePermission(session.user.id, 'queue:manage')

  const { id } = await params
  const result = await checkInAppointment(id)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 422 })
  }

  return NextResponse.json({ success: true, data: result.data })
}
