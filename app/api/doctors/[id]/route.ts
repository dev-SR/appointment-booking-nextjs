import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission, can } from '@/lib/services/authorization.service';
import { DoctorService } from '@/lib/services/doctor.service';
import { updateDoctorAdminSchema, updateDoctorOwnSchema } from '@/lib/zod-schemas/doctor';
import { idParamSchema } from '@/lib/zod-schemas/common';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/doctors/[id]
 * Get doctor by ID
 * Public endpoint
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const parsed = idParamSchema.safeParse({ id });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, validationErrors: parsed.error.issues },
        { status: 400 }
      );
    }

    const doctor = await DoctorService.getById(id);

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: doctor });
  } catch (error) {
    console.error('[v0] Error getting doctor:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get doctor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/doctors/[id]
 * Update doctor
 * Requires: doctors:update:own (for own profile) or doctors:update:any (for any)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
        { success: false, validationErrors: parsed.error.issues },
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

    // Check permissions
    if (isOwn) {
      await requirePermission(session.user.id, 'doctors:update:own');
    } else if (!canUpdateAny) {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Use appropriate schema based on permission level
    if (canUpdateAny && !isOwn) {
      const validatedBody = updateDoctorAdminSchema.safeParse(body);
      if (!validatedBody.success) {
        return NextResponse.json(
          { success: false, validationErrors: validatedBody.error.issues },
          { status: 400 }
        );
      }
      const updated = await DoctorService.updateAdmin(id, validatedBody.data);
      return NextResponse.json({ success: true, data: updated });
    } else {
      const validatedBody = updateDoctorOwnSchema.safeParse(body);
      if (!validatedBody.success) {
        return NextResponse.json(
          { success: false, validationErrors: validatedBody.error.issues },
          { status: 400 }
        );
      }
      const updated = await DoctorService.updateOwn(id, validatedBody.data);
      return NextResponse.json({ success: true, data: updated });
    }
  } catch (error: unknown) {
    console.error('[v0] Error updating doctor:', error);

    if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to update doctor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/doctors/[id]
 * Delete doctor
 * Requires: doctors:delete permission
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    await requirePermission(session.user.id, 'doctors:delete');

    const parsed = idParamSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, validationErrors: parsed.error.issues },
        { status: 400 }
      );
    }

    await DoctorService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[v0] Error deleting doctor:', error);

    if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message === 'Doctor not found') {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to delete doctor' },
      { status: 500 }
    );
  }
}
