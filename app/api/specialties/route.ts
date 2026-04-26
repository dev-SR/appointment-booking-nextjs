import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/services/authorization.service';
import { SpecialtyService } from '@/lib/services/doctor.service';
import { createSpecialtySchema, listSpecialtiesQuerySchema } from '@/lib/zod-schemas/specialty';

/**
 * GET /api/specialties
 * List specialties
 * Public endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listSpecialtiesQuerySchema.safeParse(searchParams);

    if (!query.success) {
      return NextResponse.json(
        { success: false, validationErrors: query.error.errors },
        { status: 400 }
      );
    }

    const result = await SpecialtyService.list(query.data);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[v0] Error listing specialties:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to list specialties' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/specialties
 * Create a new specialty
 * Requires: settings:manage permission
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

    await requirePermission(session.user.id, 'settings:manage');

    const body = await request.json();
    const parsed = createSpecialtySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, validationErrors: parsed.error.errors },
        { status: 400 }
      );
    }

    const specialty = await SpecialtyService.create(parsed.data);

    return NextResponse.json({ success: true, data: specialty }, { status: 201 });
  } catch (error: unknown) {
    console.error('[v0] Error creating specialty:', error);

    if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'DUPLICATE', message: 'Specialty name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to create specialty' },
      { status: 500 }
    );
  }
}
