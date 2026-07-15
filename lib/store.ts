import type { ContentRow, NewRowInput, Status } from './types';
import { sheetsCreateRow, sheetsListRows, sheetsSetStatus } from './sheets/client';
import { fromSheetRow, parseRowId, toSheetCreatePayload } from './sheets/map';
import { assertUserTransition, toAppStatus, toSheetStatus } from './sheets/status';

/* ============================================================
   DATA LAYER — Google Sheets via Apps Script Web App
   ------------------------------------------------------------
   SHEETS_WEBAPP_URL (server env) points at the deployed /exec URL.
   Column mapping and status normalization live in lib/sheets/.
   ============================================================ */

export async function getRows(): Promise<ContentRow[]> {
  const raw = await sheetsListRows();
  // Newest first (higher sheet row numbers are later appends).
  return raw.map(fromSheetRow).sort((a, b) => b.id - a.id);
}

export async function addRow(partial: NewRowInput): Promise<ContentRow> {
  const created = await sheetsCreateRow(toSheetCreatePayload(partial));
  return fromSheetRow(created);
}

export async function setStatus(
  id: string | number,
  status: Status
): Promise<ContentRow | undefined> {
  const rowId = parseRowId(id);

  // Enforce portal transition rules against the live sheet row.
  const rows = await sheetsListRows();
  const currentRaw = rows.find((r) => Number(r.id) === rowId);
  if (!currentRaw) return undefined;

  const current = toAppStatus(currentRaw.status);
  assertUserTransition(current, status);

  const sheetStatus = toSheetStatus(status);
  const result = await sheetsSetStatus(rowId, sheetStatus);
  if (!result) return undefined;

  if (result.row) return fromSheetRow(result.row);

  const refreshed = await sheetsListRows();
  const found = refreshed.find((r) => Number(r.id) === rowId);
  if (!found) {
    return { ...fromSheetRow(currentRaw), status };
  }
  return { ...fromSheetRow(found), status };
}
