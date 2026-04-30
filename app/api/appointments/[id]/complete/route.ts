/**
 * POST /api/appointments/[id]/complete — Mark appointment as completed
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { can } from '@/lib/services/authorization.service'
import { completeAppointment, getAppointment } from '@/lib/services/appointment.service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params
  const appointment = await getAppointment(id)
  if (!appointment) {
    return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 })
  }

  // Only the doctor or admin can complete
  const isDoctor = appointment.doctor.userId === session.user.id
  const canUpdateAny = await can(session.user.id, 'appointments:update:any')

  if (!isDoctor && !canUpdateAny) {
    return NextResponse.json({ success: false, error: 'PERMISSION_DENIED' }, { status: 403 })
  }

  const result = await completeAppointment(id)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 422 })
  }

  return NextResponse.json({ success: true, data: result.data })
}
