/**
 * GET  /api/appointments — List appointments (filtered by permissions)
 * POST /api/appointments — Create a new appointment
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePermission, canAny } from '@/lib/services/authorization.service'
import { createAppointment, listAppointments } from '@/lib/services/appointment.service'
import { createAppointmentSchema, listAppointmentsQuerySchema } from '@/lib/zod-schemas/appointment'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const searchParams = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = listAppointmentsQuerySchema.safeParse(searchParams)
  if (!parsed.success) {
    return NextResponse.json({ success: false, validationErrors: parsed.error.issues }, { status: 400 })
  }

  const query = parsed.data

  // Scope-aware: if user can only read own, force patientId filter
  const canReadAll = await canAny(session.user.id, ['appointments:read:all'])
  if (!canReadAll) {
    await requirePermission(session.user.id, 'appointments:read:own')
    // Find patient ID for this user
    const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
    if (patient) {
      query.patientId = patient.id
    } else {
      // Check if they're a doctor
      const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } })
      if (doctor) {
        query.doctorId = doctor.id
      } else {
        return NextResponse.json({ success: true, data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } })
      }
    }
  }

  try {
    const result = await listAppointments(query)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error listing appointments:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  await requirePermission(session.user.id, 'appointments:create')

  const body = await req.json()
  const parsed = createAppointmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, validationErrors: parsed.error.issues }, { status: 400 })
  }

  // Determine patient ID
  let patientId: string
  const patient = await prisma.patient.findUnique({ where: { userId: session.user.id } })
  if (patient) {
    patientId = patient.id
  } else {
    // If booked by staff (receptionist), need patientId in body — for now use the session user
    return NextResponse.json({ success: false, error: 'Patient profile not found' }, { status: 400 })
  }

  try {
    const result = await createAppointment(parsed.data, patientId, session.user.id)
    if (!result.success) {
      return NextResponse.json({ success: false, errors: result.errors }, { status: 422 })
    }
    return NextResponse.json({ success: true, data: result.data }, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
