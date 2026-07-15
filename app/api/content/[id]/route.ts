import { NextResponse } from 'next/server';
import { setStatus } from '@/lib/store';
import type { Status } from '@/lib/types';

// PATCH /api/content/:id — set the row's status (id = sheet row number).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = (await req.json()) as { status: Status };
    const row = await setStatus(params.id, status);
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update status';
    const isClient =
      /cannot change status|cannot be set from the portal|Invalid row id/i.test(
        message
      );
    console.error('[PATCH /api/content/:id]', err);
    return NextResponse.json(
      { error: message },
      { status: isClient ? 400 : 502 }
    );
  }
}
