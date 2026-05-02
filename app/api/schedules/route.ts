import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePermission } from '@/lib/services/authorization.service'
import { ScheduleService, createScheduleSchema } from '@/lib/services/schedule.service'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const doctorId = searchParams.get('doctorId')

    if (!doctorId) {
      return NextResponse.json({ success: false, error: 'MISSING_DOCTOR_ID' }, { status: 400 })
    }

    // Only allow if user is viewing their own schedule OR they have global read access
    // Assuming doctors view their own, admins view any. For now we use schedule:manage:own
    await requirePermission(session.user.id, 'schedule:manage:own')

    const schedules = await ScheduleService.getDoctorSchedules(doctorId)
    return NextResponse.json({ success: true, data: schedules })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'PERMISSION_DENIED' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    await requirePermission(session.user.id, 'schedule:manage:own')

    const body = await req.json()
    const parsed = createScheduleSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, validationErrors: parsed.error.issues }, { status: 400 })
    }

    const newSchedule = await ScheduleService.createSchedule(parsed.data)
    return NextResponse.json({ success: true, data: newSchedule }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'PERMISSION_DENIED' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
