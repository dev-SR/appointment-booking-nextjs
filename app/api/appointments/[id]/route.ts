/**
 * GET /api/appointments/[id] — Get appointment detail
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { can } from '@/lib/services/authorization.service'
import { getAppointment } from '@/lib/services/appointment.service'

export async function GET(
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

  // Check permissions — own or all
  const isOwner = appointment.patient.userId === session.user.id
  const canReadAll = await can(session.user.id, 'appointments:read:all')

  if (!isOwner && !canReadAll) {
    return NextResponse.json({ success: false, error: 'PERMISSION_DENIED' }, { status: 403 })
  }

  return NextResponse.json({ success: true, data: appointment })
}
