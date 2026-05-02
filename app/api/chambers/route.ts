import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/services/authorization.service';
import { ChamberService } from '@/lib/services/chamber.service';
import { createChamberSchema, listChambersQuerySchema } from '@/lib/zod-schemas/chamber';

/**
 * GET /api/chambers
 * List chambers with pagination and filtering
 * Public endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listChambersQuerySchema.safeParse(searchParams);

    if (!query.success) {
      return NextResponse.json(
        { success: false, validationErrors: query.error.issues },
        { status: 400 }
      );
    }

    const result = await ChamberService.list(query.data);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[v0] Error listing chambers:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to list chambers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chambers
 * Create a new chamber
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
    const parsed = createChamberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, validationErrors: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await ChamberService.create(parsed.data);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: unknown) {
    console.error('[v0] Error creating chamber:', error);

    if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to create chamber' },
      { status: 500 }
    );
  }
}
