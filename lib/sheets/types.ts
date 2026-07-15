/** Wire responses from the Apps Script Web App. Always check `ok`. */

export type SheetsOk<T> = { ok: true } & T;
export type SheetsErr = { ok: false; error: string };
export type SheetsResponse<T> = SheetsOk<T> | SheetsErr;

/** Raw row as returned by the Web App (header names + computed `id`). */
export type SheetRawRow = {
  id: number;
  [key: string]: unknown;
};
