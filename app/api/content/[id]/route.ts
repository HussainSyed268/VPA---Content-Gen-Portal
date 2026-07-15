import { NextResponse } from 'next/server';
import { setStatus } from '@/lib/store';
import type { Status } from '@/lib/types';

// PATCH /api/content/:id — set the row's status.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { status } = (await req.json()) as { status: Status };
  const row = setStatus(params.id, status);
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(row);
}
