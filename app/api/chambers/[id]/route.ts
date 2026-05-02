import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/services/authorization.service';
import { ChamberService } from '@/lib/services/chamber.service';
import { updateChamberSchema } from '@/lib/zod-schemas/chamber';
import { idParamSchema } from '@/lib/zod-schemas/common';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/chambers/[id]
 * Get chamber by ID
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

    const chamber = await ChamberService.getById(id);

    if (!chamber) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: chamber });
  } catch (error) {
    console.error('[v0] Error getting chamber:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get chamber' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chambers/[id]
 * Update chamber
 * Requires: settings:manage permission
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

    await requirePermission(session.user.id, 'settings:manage');

    const parsed = idParamSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, validationErrors: parsed.error.issues },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedBody = updateChamberSchema.safeParse(body);

    if (!validatedBody.success) {
      return NextResponse.json(
        { success: false, validationErrors: validatedBody.error.issues },
        { status: 400 }
      );
    }

    const updated = await ChamberService.update(id, validatedBody.data);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('[v0] Error updating chamber:', error);

    if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to update chamber' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chambers/[id]
 * Delete chamber
 * Requires: settings:manage permission
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

    await requirePermission(session.user.id, 'settings:manage');

    const parsed = idParamSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, validationErrors: parsed.error.issues },
        { status: 400 }
      );
    }

    await ChamberService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[v0] Error deleting chamber:', error);

    if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
      return NextResponse.json(
        { success: false, error: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message === 'Cannot delete chamber with appointments') {
      return NextResponse.json(
        { success: false, error: 'HAS_DEPENDENCIES', message: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to delete chamber' },
      { status: 500 }
    );
  }
}
