import type { SheetRawRow, SheetsResponse } from './types';

const DEFAULT_TIMEOUT_MS = 30_000;

function webAppUrl(): string {
  const url = process.env.SHEETS_WEBAPP_URL?.trim();
  if (!url) {
    throw new Error(
      'SHEETS_WEBAPP_URL is not set. Add it to .env.local (Apps Script Web App /exec URL).'
    );
  }
  return url;
}

/**
 * Apps Script Web Apps 302 to script.googleusercontent.com after handling
 * the request. The Location must be fetched with GET to read the result —
 * re-POSTing the body to that URL returns HTTP 405.
 *
 * Body Content-Type is text/plain (Apps Script still parses JSON via
 * postData.contents) to avoid preflight quirks with the macros host.
 */
async function sheetsFetch(init: RequestInit = {}): Promise<Response> {
  const url = webAppUrl();
  const signal = init.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const method = (init.method || 'GET').toUpperCase();
  const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH';

  let res = await fetch(url, { ...init, redirect: 'manual', signal });

  for (let i = 0; i < 5 && res.status >= 300 && res.status < 400; i++) {
    const loc = res.headers.get('Location');
    if (!loc) break;
    res = await fetch(loc, {
      method: isMutating ? 'GET' : method,
      redirect: 'manual',
      signal,
      headers: isMutating ? undefined : init.headers,
    });
  }

  if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
    throw new Error('Sheets Web App redirect could not be followed');
  }
  if (!res.ok) {
    throw new Error(`Sheets Web App HTTP ${res.status}`);
  }
  return res;
}

async function parseJson<T>(res: Response): Promise<SheetsResponse<T>> {
  const data = (await res.json()) as SheetsResponse<T>;
  return data;
}

function assertOk<T>(data: SheetsResponse<T>, action: string): T & { ok: true } {
  if (!data || typeof data !== 'object' || !('ok' in data)) {
    throw new Error(`Sheets ${action}: invalid response`);
  }
  if (!data.ok) {
    throw new Error(`Sheets ${action}: ${(data as { error: string }).error || 'unknown error'}`);
  }
  return data;
}

export async function sheetsListRows(): Promise<SheetRawRow[]> {
  const res = await sheetsFetch({ method: 'GET', cache: 'no-store' });
  const data = assertOk(await parseJson<{ rows: SheetRawRow[] }>(res), 'list');
  return data.rows ?? [];
}

export async function sheetsCreateRow(
  payload: Record<string, unknown>
): Promise<SheetRawRow> {
  const res = await sheetsFetch({
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'create', data: payload }),
  });
  const data = assertOk(await parseJson<{ row: SheetRawRow }>(res), 'create');
  if (!data.row) throw new Error('Sheets create: response missing row');
  return data.row;
}

export async function sheetsSetStatus(
  id: number,
  status: string
): Promise<{ id: number; status: string; row?: SheetRawRow } | undefined> {
  const res = await sheetsFetch({
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'setStatus', id, status }),
  });
  const data = await parseJson<{ row?: SheetRawRow; id?: number; status?: string }>(res);
  if (!data.ok) {
    if (/no row|not found|out of range/i.test(data.error || '')) {
      return undefined;
    }
    throw new Error(`Sheets setStatus: ${data.error}`);
  }
  return {
    id: data.id ?? id,
    status: data.status ?? status,
    row: data.row,
  };
}
