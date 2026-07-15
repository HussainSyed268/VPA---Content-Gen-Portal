import type { ContentRow, NewRowInput, Status } from './types';

/* ============================================================
   CLIENT DATA HELPERS
   ------------------------------------------------------------
   Browser → Next API routes → Google Sheets Web App (server-side).
   ============================================================ */

export async function fetchRows(): Promise<ContentRow[]> {
  const res = await fetch('/api/content', { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to load content (${res.status})`);
  }
  return res.json();
}

export async function createRow(row: NewRowInput): Promise<ContentRow> {
  const res = await fetch('/api/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to create content (${res.status})`);
  }
  return res.json();
}

/** `id` is the sheet row number (number or numeric string from data-*). */
export async function updateStatus(
  id: string | number,
  status: Status
): Promise<ContentRow> {
  const res = await fetch(`/api/content/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to update status (${res.status})`);
  }
  return res.json();
}
