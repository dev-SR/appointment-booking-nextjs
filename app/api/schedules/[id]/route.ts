import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requirePermission } from '@/lib/services/authorization.service'
import { ScheduleService, updateScheduleSchema } from '@/lib/services/schedule.service'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    await requirePermission(session.user.id, 'schedule:manage:own')

    const schedule = await ScheduleService.getSchedule(id)
    if (!schedule) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: schedule })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'PERMISSION_DENIED' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    await requirePermission(session.user.id, 'schedule:manage:own')

    const body = await req.json()
    const parsed = updateScheduleSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, validationErrors: parsed.error.issues }, { status: 400 })
    }

    const updated = await ScheduleService.updateSchedule(id, parsed.data)
    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'PERMISSION_DENIED' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 })
    }

    await requirePermission(session.user.id, 'schedule:manage:own')

    await ScheduleService.deleteSchedule(id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'PERMISSION_DENIED' }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
