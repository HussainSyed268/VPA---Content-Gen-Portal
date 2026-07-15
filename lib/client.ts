import type { ContentRow, NewRowInput, Status } from './types';

/* ============================================================
   CLIENT DATA HELPERS
   ------------------------------------------------------------
   Mirror the original three functions (fetchRows / createRow /
   updateStatus) so the UI code changes as little as possible.
   These call the API routes, which today are backed by the
   in-memory store — later by Google Sheets.
   ============================================================ */

// Read every row (GET).
export async function fetchRows(): Promise<ContentRow[]> {
  const res = await fetch('/api/content', { cache: 'no-store' });
  return res.json();
}

// Add a new idea (POST). Returns the created row.
export async function createRow(row: NewRowInput): Promise<ContentRow> {
  const res = await fetch('/api/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });
  return res.json();
}

// Set a row's status: approved / retry / rejected / scheduled (PATCH).
export async function updateStatus(id: string, status: Status): Promise<ContentRow> {
  const res = await fetch(`/api/content/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}
