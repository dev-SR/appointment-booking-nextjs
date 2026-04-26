import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission, can } from '@/lib/services/authorization.service';
import { DoctorService } from '@/lib/services/doctor.service';
import { doctorServiceSchema } from '@/lib/zod-schemas/doctor';
import { idParamSchema } from '@/lib/zod-schemas/common';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/doctors/[id]/services
 * Get doctor services
 * Public endpoint
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsed = idParamSchema.safeParse({ id });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, validationErrors: parsed.error.errors },
        { status: 400 }
      );
    }

    const services = await DoctorService.getServices(id);

    return NextResponse.json({ success: true, data: services });
  } catch (error) {
    console.error('[v0] Error getting doctor services:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get services' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/doctors/[id]/services
 * Add service to doctor
 * Requires: doctors:update:own (for own) or doctors:update:any (for any)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const parsed = idParamSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, validationErrors: parsed.error.errors },
        { status: 400 }
      );
    }

    // Get the doctor to check ownership
    const doctor = await DoctorService.getById(id);
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const isOwn = doctor.userId === session.user.id;
    const canUpdateAny = await can(session.user.id, 'doctors:update:any');

    if (isOwn) {
      await requirePermission(session.user.id, 'doctors:update:own');
    } else if (!canUpdateAny) {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedBody = doctorServiceSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { success: false, validationErrors: validatedBody.error.errors },
        { status: 400 }
      );
    }

    const service = await DoctorService.addService(id, validatedBody.data);

    return NextResponse.json({ success: true, data: service }, { status: 201 });
  } catch (error: unknown) {
    console.error('[v0] Error adding doctor service:', error);

    if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to add service' },
      { status: 500 }
    );
  }
}
