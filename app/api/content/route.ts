import { NextResponse } from 'next/server';
import { getRows, addRow } from '@/lib/store';
import type { NewRowInput } from '@/lib/types';

// GET /api/content — read every row.
export async function GET() {
  try {
    return NextResponse.json(await getRows());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load content';
    console.error('[GET /api/content]', err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// POST /api/content — add a new idea (the "You" columns). Returns the new row.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as NewRowInput;
    const row = await addRow(body);
    return NextResponse.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create content';
    console.error('[POST /api/content]', err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
