import { NextResponse } from 'next/server';
import { getRows, addRow } from '@/lib/store';
import type { NewRowInput } from '@/lib/types';

// GET /api/content — read every row.
export async function GET() {
  return NextResponse.json(getRows());
}

// POST /api/content — add a new idea (the "You" columns). Returns the new row.
export async function POST(req: Request) {
  const body = (await req.json()) as NewRowInput;
  const row = addRow(body);
  return NextResponse.json(row);
}
