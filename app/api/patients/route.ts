import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/services/authorization.service';
import { PatientService } from '@/lib/services/patient.service';
import { createPatientSchema, listPatientsQuerySchema } from '@/lib/zod-schemas/patient';

/**
 * GET /api/patients
 * List patients with pagination and filtering
 * Requires: patients:read:all permission
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    await requirePermission(session.user.id, 'patients:read:all');

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listPatientsQuerySchema.safeParse(searchParams);

    if (!query.success) {
      return NextResponse.json(
        { success: false, validationErrors: query.error.errors },
        { status: 400 }
      );
    }

    const result = await PatientService.list(query.data);

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error('[v0] Error listing patients:', error);

    if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to list patients' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/patients
 * Create a new patient (receptionist/admin)
 * Requires: patients:create permission
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    await requirePermission(session.user.id, 'patients:create');

    const body = await request.json();
    const parsed = createPatientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, validationErrors: parsed.error.errors },
        { status: 400 }
      );
    }

    const result = await PatientService.create(parsed.data);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    console.error('[v0] Error creating patient:', error);

    if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'DUPLICATE', message: 'Phone number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to create patient' },
      { status: 500 }
    );
  }
}
