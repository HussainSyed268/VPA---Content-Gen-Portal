import type { ContentRow, NewRowInput, Status } from './types';
import { SEED_ROWS } from './mock-data';

/* ============================================================
   DATA LAYER — in-memory store
   ------------------------------------------------------------
   TODO: Replace this in-memory store with Google Sheets (Apps
   Script Web App or Sheets API). Column names map 1:1 to the
   sheet per manual §3.1.

   NOTE: This module-level array lives in the server process, so
   it resets whenever the dev/prod server restarts. Wire up real
   persistence (Google Sheets) to keep data between restarts.
   ============================================================ */

// Seed from the mock data. Cloned so mutations don't touch the seed constant.
const rows: ContentRow[] = SEED_ROWS.map((r) => ({ ...r }));

// Read every row (newest first, matching the original unshift behavior).
export function getRows(): ContentRow[] {
  return rows;
}

// Add a new idea: assigns an id, sets status 'intake', stamps today's date.
export function addRow(partial: NewRowInput): ContentRow {
  const row: ContentRow = {
    ...partial,
    id: 'r' + (rows.length + 1) + '_' + Date.now(),
    status: 'intake',
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    platforms: partial.platforms || [],
    title: partial.title || '',
  };
  rows.unshift(row);
  return row;
}

// Set a row's status (approved / retry / rejected / scheduled, etc.).
export function setStatus(id: string, status: Status): ContentRow | undefined {
  const r = rows.find((x) => x.id === id);
  if (r) r.status = status;
  return r;
}
