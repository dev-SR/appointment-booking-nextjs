/**
 * POST /api/appointments/[id]/cancel — Cancel an appointment
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { can } from '@/lib/services/authorization.service'
import { cancelAppointment, getAppointment } from '@/lib/services/appointment.service'
import { cancelAppointmentSchema } from '@/lib/zod-schemas/appointment'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = cancelAppointmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, validationErrors: parsed.error.issues }, { status: 400 })
  }

  // Check permissions
  const appointment = await getAppointment(id)
  if (!appointment) {
    return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 })
  }

  const isOwner = appointment.patient.userId === session.user.id
  const canCancelAny = await can(session.user.id, 'appointments:cancel:any')

  if (!isOwner && !canCancelAny) {
    return NextResponse.json({ success: false, error: 'PERMISSION_DENIED' }, { status: 403 })
  }

  const result = await cancelAppointment(id, parsed.data.reason, session.user.id)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 422 })
  }

  return NextResponse.json({ success: true, data: result.data })
}
