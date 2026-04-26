import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission, can } from '@/lib/services/authorization.service';
import { PatientService } from '@/lib/services/patient.service';
import { updatePatientOwnSchema, updatePatientAdminSchema } from '@/lib/zod-schemas/patient';
import { idParamSchema } from '@/lib/zod-schemas/common';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/patients/[id]
 * Get patient by ID
 * Requires: patients:read:own (for own) or patients:read:all (for any)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const patient = await PatientService.getById(id);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check permissions
    const isOwn = patient.userId === session.user.id;
    const canReadAll = await can(session.user.id, 'patients:read:all');

    if (!isOwn && !canReadAll) {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: patient });
  } catch (error) {
    console.error('[v0] Error getting patient:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get patient' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/patients/[id]
 * Update patient
 * Requires: patients:update:own (for own) or patients:update:any (for any)
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
        { success: false, validationErrors: parsed.error.errors },
        { status: 400 }
      );
    }

    const patient = await PatientService.getById(id);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const isOwn = patient.userId === session.user.id;
    const canUpdateAny = await can(session.user.id, 'patients:update:any');

    if (isOwn) {
      await requirePermission(session.user.id, 'patients:update:own');
    } else if (!canUpdateAny) {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (canUpdateAny && !isOwn) {
      const validatedBody = updatePatientAdminSchema.safeParse(body);
      if (!validatedBody.success) {
        return NextResponse.json(
          { success: false, validationErrors: validatedBody.error.errors },
          { status: 400 }
        );
      }
      const updated = await PatientService.updateAdmin(id, validatedBody.data);
      return NextResponse.json({ success: true, data: updated });
    } else {
      const validatedBody = updatePatientOwnSchema.safeParse(body);
      if (!validatedBody.success) {
        return NextResponse.json(
          { success: false, validationErrors: validatedBody.error.errors },
          { status: 400 }
        );
      }
      const updated = await PatientService.updateOwn(id, validatedBody.data);
      return NextResponse.json({ success: true, data: updated });
    }
  } catch (error: unknown) {
    console.error('[v0] Error updating patient:', error);

    if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to update patient' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/patients/[id]
 * Delete patient
 * Requires: patients:delete permission
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

    await requirePermission(session.user.id, 'patients:delete');

    const parsed = idParamSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, validationErrors: parsed.error.errors },
        { status: 400 }
      );
    }

    await PatientService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[v0] Error deleting patient:', error);

    if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message === 'Patient not found') {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to delete patient' },
      { status: 500 }
    );
  }
}
